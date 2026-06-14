<?php

namespace App\Http\Controllers;

use App\Models\ScrapedTool;
use App\Services\OpenAIService;
use App\Services\QdrantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ToolController extends Controller
{
    public function __construct(
        private readonly QdrantService $qdrantService,
        private readonly OpenAIService $openAIService
    ) {
    }

    private const CATEGORIES = [
        'Research',
        'Writing',
        'Coding',
        'Data',
        'Academic',
        'Productivity',
    ];

    private const PRICING_TYPES = [
        'free',
        'freemium',
        'paid',
        'opensource',
    ];

    public function index(Request $request): JsonResponse
    {
        $validated = Validator::make($request->query(), [
            'category' => ['nullable', 'string', 'in:'.implode(',', self::CATEGORIES)],
            'pricing' => ['nullable', 'string', 'in:'.implode(',', self::PRICING_TYPES)],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ])->validate();

        $perPage = $validated['per_page'] ?? 12;

        $paginator = ScrapedTool::query()
            ->when(
                isset($validated['category']),
                fn ($query) => $query->where('category', $validated['category'])
            )
            ->when(
                isset($validated['pricing']),
                fn ($query) => $query->where('pricing_type', $validated['pricing'])
            )
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json([
            'message' => 'Tools retrieved successfully',
            'data' => [
                'tools' => $paginator->getCollection()
                    ->map(fn (ScrapedTool $tool) => $this->formatSummary($tool))
                    ->values(),
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $tool = ScrapedTool::query()->findOrFail($id);

        return response()->json([
            'message' => 'Tool retrieved successfully',
            'data' => [
                'tool' => $this->formatDetail($tool),
            ],
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $validated = Validator::make($request->query(), [
            'q' => ['required', 'string'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ])->validate();

        $query = trim($validated['q']);
        $limit = $validated['limit'] ?? 5;
        $major = $request->user()?->profile?->major;

        $semanticMatches = collect($this->qdrantService->searchTools($query, null, $limit, 0.85));

        if ($semanticMatches->isEmpty()) {
            $semanticMatches = collect($this->qdrantService->searchTools($query, null, $limit, 0.7));
        }

        if ($semanticMatches->isNotEmpty()) {
            $toolIds = $semanticMatches->pluck('tool_mysql_id')->all();
            $tools = ScrapedTool::query()->whereIn('id', $toolIds)->get()->keyBy('id');

            $results = $semanticMatches
                ->map(function (array $match) use ($tools, $major) {
                    $tool = $tools->get($match['tool_mysql_id']);

                    if (!$tool) {
                        return null;
                    }

                    return [
                        ...$this->formatSummary($tool),
                        'score' => $match['score'],
                        'why_recommended' => $this->openAIService->generateSearchRecommendationReason($tool, [
                            'major' => $major,
                        ]),
                    ];
                })
                ->filter()
                ->values();
        } else {
            $results = ScrapedTool::query()
                ->where(function ($builder) use ($query) {
                    $builder
                        ->where('name', 'like', "%{$query}%")
                        ->orWhere('description', 'like', "%{$query}%");
                })
                ->orderByRaw(
                    "CASE
                        WHEN name LIKE ? THEN 0
                        WHEN description LIKE ? THEN 1
                        ELSE 2
                    END",
                    ["%{$query}%", "%{$query}%"]
                )
                ->orderByDesc('rating')
                ->limit($limit)
                ->get()
                ->map(function (ScrapedTool $tool) {
                    return [
                        ...$this->formatSummary($tool),
                        'score' => 1.0,
                        'why_recommended' => 'Direkomendasikan berdasarkan pencarian kata kunci',
                    ];
                })
                ->values();
        }

        return response()->json([
            'message' => 'Search completed successfully',
            'data' => [
                'query' => $query,
                'results' => $results,
            ],
        ]);
    }

    private function formatSummary(ScrapedTool $tool): array
    {
        return [
            'id' => $tool->id,
            'name' => $tool->name,
            'url' => $tool->url,
            'description' => $tool->description,
            'category' => $tool->category,
            'pricing_type' => $tool->pricing_type,
            'rating' => $tool->rating,
            'qdrant_uuid' => $tool->qdrant_uuid,
        ];
    }

    private function formatDetail(ScrapedTool $tool): array
    {
        return [
            ...$this->formatSummary($tool),
            'scraped_at' => $tool->scraped_at?->toISOString(),
        ];
    }
}
