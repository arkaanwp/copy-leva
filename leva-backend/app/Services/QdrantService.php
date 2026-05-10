<?php

namespace App\Services;

use App\Models\ScrapedTool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class QdrantService
{
    private string $host;
    private string $apiKey;
    private string $collection;
    private GeminiService $geminiService;

    public function __construct(GeminiService $geminiService)
    {
        $this->host = env('QDRANT_HOST', 'http://localhost:6333');
        $this->apiKey = env('QDRANT_API_KEY', '');
        $this->collection = env('QDRANT_COLLECTION', 'tools_semantic_vectors');
        $this->geminiService = $geminiService;
    }

    private function getClient()
    {
        $client = Http::baseUrl($this->host)->timeout(30);
        if ($this->apiKey) {
            $client->withHeaders(['api-key' => $this->apiKey]);
        }
        return $client;
    }

    public function ensureCollection(): void
    {
        $response = $this->getClient()->get("/collections/{$this->collection}");
        
        if ($response->status() === 404) {
            $this->getClient()->put("/collections/{$this->collection}", [
                'vectors' => [
                    'size' => 768, // Gemini text-embedding-004
                    'distance' => 'Cosine'
                ]
            ])->throw();

            $this->getClient()->put("/collections/{$this->collection}/index", [
                'field_name' => 'category_filter',
                'field_schema' => 'keyword'
            ])->throw();
        }
    }

    public function upsertTool(ScrapedTool $tool): void
    {
        $textToEmbed = "Name: {$tool->name}. Description: {$tool->description}. Category: {$tool->category}";
        $vector = $this->geminiService->embedText($textToEmbed);

        if (empty($vector)) {
            return;
        }

        $uuid = $tool->qdrant_uuid;
        if (!$uuid) {
            $uuid = Str::uuid()->toString();
            $tool->update(['qdrant_uuid' => $uuid]);
        }

        $this->getClient()->put("/collections/{$this->collection}/points", [
            'points' => [
                [
                    'id' => $uuid,
                    'vector' => $vector,
                    'payload' => [
                        'tool_mysql_id' => $tool->id,
                        'category_filter' => $tool->category,
                        'extracted_description' => $tool->description
                    ]
                ]
            ]
        ])->throw();
    }

    public function searchTools(string $query, ?string $categoryFilter = null, int $limit = 5, float $minScore = 0.85): array
    {
        try {
            $vector = $this->geminiService->embedText($query);
        } catch (\Exception $e) {
            return [];
        }
        
        if (empty($vector)) {
            return [];
        }

        $filter = null;
        if ($categoryFilter) {
            $filter = [
                'must' => [
                    [
                        'key' => 'category_filter',
                        'match' => ['value' => $categoryFilter]
                    ]
                ]
            ];
        }

        $payload = [
            'vector' => $vector,
            'limit' => $limit,
            'with_payload' => true,
            'score_threshold' => $minScore
        ];

        if ($filter) {
            $payload['filter'] = $filter;
        }

        try {
            $response = $this->getClient()->post("/collections/{$this->collection}/points/search", $payload);
            
            if (!$response->successful()) {
                return [];
            }

            $results = $response->json('result', []);
            
            $mapped = [];
            foreach ($results as $item) {
                $mapped[] = [
                    'tool_mysql_id' => $item['payload']['tool_mysql_id'] ?? null,
                    'score' => $item['score'] ?? 0,
                ];
            }

            return $mapped;
        } catch (\Exception $e) {
            return [];
        }
    }
}
