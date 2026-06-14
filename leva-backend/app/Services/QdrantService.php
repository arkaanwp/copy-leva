<?php

namespace App\Services;

use App\Models\ScrapedTool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class QdrantService
{
    private string $host;
    private string $apiKey;
    private string $collection;
    private OpenAIService $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->host = config('services.qdrant.host', env('QDRANT_HOST', 'http://localhost:6333'));
        $this->apiKey = config('services.qdrant.api_key', env('QDRANT_API_KEY', ''));
        $this->collection = config('services.qdrant.collection', env('QDRANT_COLLECTION', 'tools_semantic_vectors'));
        $this->openAIService = $openAIService;
    }

    private function getClient()
    {
        $client = Http::baseUrl($this->host)->timeout(2);
        if ($this->apiKey) {
            $client = $client->withHeaders(['api-key' => $this->apiKey]);
        }
        return $client;
    }

    public function ensureCollection(): void
    {
        $response = $this->getClient()->get("/collections/{$this->collection}");

        if ($response->status() === 404) {
            $this->getClient()->put("/collections/{$this->collection}", [
                'vectors' => [
                    'size' => 1536,
                    'distance' => 'Cosine',
                ],
            ])->throw();

            $this->getClient()->put("/collections/{$this->collection}/index", [
                'field_name' => 'category_filter',
                'field_schema' => 'keyword',
            ])->throw();

            $this->getClient()->put("/collections/{$this->collection}/index", [
                'field_name' => 'tool_mysql_id',
                'field_schema' => 'integer',
            ])->throw();

            $this->getClient()->put("/collections/{$this->collection}/index", [
                'field_name' => 'extracted_description',
                'field_schema' => 'text',
            ])->throw();
        }
    }

    public function upsertTool(ScrapedTool $tool): void
    {
        $openaiKey = config('openai.api_key');
        if (empty($openaiKey)) {
            // Cannot embed without OpenAI key, skip upsert
            return;
        }

        try {
            $this->ensureCollection();
        } catch (\Throwable $e) {
            // Qdrant is offline, skip upsert
            return;
        }

        $textToEmbed = "Name: {$tool->name}. Description: {$tool->description}. Category: {$tool->category}";
        $vector = $this->openAIService->embedText($textToEmbed);

        if (empty($vector)) {
            throw new RuntimeException('Failed to generate embedding for tool.');
        }

        $uuid = $tool->qdrant_uuid;
        if (!$uuid) {
            $uuid = Str::uuid()->toString();
            $tool->update(['qdrant_uuid' => $uuid]);
        }

        try {
            $this->getClient()->put("/collections/{$this->collection}/points", [
                'points' => [
                    [
                        'id' => $uuid,
                        'vector' => $vector,
                        'payload' => [
                            'tool_mysql_id' => $tool->id,
                            'category_filter' => $tool->category,
                            'extracted_description' => $tool->description,
                        ],
                    ],
                ],
            ])->throw();
        } catch (\Throwable $e) {
            // Ignore Qdrant write failures
        }
    }

    public function searchTools(string $query, ?string $categoryFilter = null, int $limit = 5, float $minScore = 0.85): array
    {
        try {
            $this->ensureCollection();
            $vector = $this->openAIService->embedText($query);
        } catch (Throwable $e) {
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

            return collect($results)
                ->map(fn (array $item) => [
                    'tool_mysql_id' => Arr::get($item, 'payload.tool_mysql_id'),
                    'score' => (float) ($item['score'] ?? 0),
                ])
                ->filter(fn (array $item) => !is_null($item['tool_mysql_id']))
                ->values()
                ->all();
        } catch (Throwable $e) {
            return [];
        }
    }
}
