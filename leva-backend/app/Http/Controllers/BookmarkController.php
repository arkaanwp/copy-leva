<?php

namespace App\Http\Controllers;

use App\Jobs\TaggingJob;
use App\Models\SavedLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BookmarkController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'tool_id' => ['required', 'integer', 'exists:scraped_tools,id'],
            'note' => ['nullable', 'string'],
        ])->validate();

        $bookmark = SavedLibrary::query()
            ->where('user_id', $request->user()->id)
            ->where('tool_id', $validated['tool_id'])
            ->first();

        if ($bookmark) {
            $bookmark->load('tool');
            return response()->json([
                'message' => 'Tool already saved.',
                'data' => [
                    'bookmark_id' => $bookmark->id,
                    'tool_id' => $bookmark->tool_id,
                    'tool_name' => $bookmark->tool?->name,
                    'tagging_status' => $bookmark->tagging_status,
                    'note' => $bookmark->note,
                ],
            ], 200);
        }

        $bookmark = SavedLibrary::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $request->user()->id,
            'tool_id' => $validated['tool_id'],
            'tagging_status' => 'pending',
            'note' => $validated['note'] ?? null,
        ]);

        $bookmark->load('tool');

        TaggingJob::dispatch($bookmark->id);

        return response()->json([
            'message' => 'Tool saved. AI tagging in progress.',
            'data' => [
                'bookmark_id' => $bookmark->id,
                'tool_id' => $bookmark->tool_id,
                'tool_name' => $bookmark->tool?->name,
                'tagging_status' => $bookmark->tagging_status,
                'note' => $bookmark->note,
            ],
        ], 202);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = Validator::make($request->query(), [
            'priority' => ['nullable', 'in:must_try,very_good,niche,optional'],
            'pricing_type' => ['nullable', 'in:freemium,free,paid,opensource'],
            'category' => ['nullable', 'in:Research,Writing,Coding,Data,Academic,Productivity'],
            'q' => ['nullable', 'string'],
            'sort' => ['nullable', 'in:latest,oldest,rating,az,za'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ])->validate();

        $query = SavedLibrary::query()
            ->where('user_id', $request->user()->id)
            ->with('tool')
            ->when(
                isset($validated['priority']),
                fn ($builder) => $builder->where('utility_priority', $validated['priority'])
            )
            ->when(
                isset($validated['pricing_type']),
                fn ($builder) => $builder->whereHas('tool', fn ($toolQuery) => $toolQuery->where('pricing_type', $validated['pricing_type']))
            )
            ->when(
                isset($validated['category']),
                fn ($builder) => $builder->whereHas('tool', fn ($toolQuery) => $toolQuery->where('category', $validated['category']))
            )
            ->when(isset($validated['q']), function ($builder) use ($validated) {
                $term = $validated['q'];

                $builder->where(function ($nested) use ($term) {
                    $nested
                        ->where('note', 'like', "%{$term}%")
                        ->orWhere('semantic_keywords', 'like', "%{$term}%")
                        ->orWhereHas('tool', fn ($toolQuery) => $toolQuery->where('name', 'like', "%{$term}%"));
                });
            });

        match ($validated['sort'] ?? 'latest') {
            'oldest' => $query->oldest(),
            'rating' => $query->join('scraped_tools', 'saved_libraries.tool_id', '=', 'scraped_tools.id')
                ->orderByDesc('scraped_tools.rating')
                ->select('saved_libraries.*'),
            'az' => $query->join('scraped_tools', 'saved_libraries.tool_id', '=', 'scraped_tools.id')
                ->orderBy('scraped_tools.name')
                ->select('saved_libraries.*'),
            'za' => $query->join('scraped_tools', 'saved_libraries.tool_id', '=', 'scraped_tools.id')
                ->orderByDesc('scraped_tools.name')
                ->select('saved_libraries.*'),
            default => $query->latest(),
        };

        $perPage = (int) $request->query('per_page', 100);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'message' => 'Bookmarks retrieved successfully',
            'data' => [
                'bookmarks' => $paginator->getCollection()
                    ->map(fn (SavedLibrary $bookmark) => $this->formatBookmark($bookmark))
                    ->values(),
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function destroy(Request $request, int $toolId): JsonResponse
    {
        $bookmark = SavedLibrary::query()
            ->where('user_id', $request->user()->id)
            ->where('tool_id', $toolId)
            ->firstOrFail();

        $bookmark->delete();

        return response()->json([
            'message' => 'Bookmark removed successfully',
        ]);
    }

    public function tags(Request $request): JsonResponse
    {
        $tags = SavedLibrary::query()
            ->where('user_id', $request->user()->id)
            ->whereNotNull('semantic_keywords')
            ->get()
            ->flatMap(fn (SavedLibrary $bookmark) => $bookmark->semantic_keywords ?? [])
            ->filter()
            ->unique()
            ->values();

        return response()->json([
            'message' => 'Tags retrieved successfully',
            'data' => [
                'tags' => $tags,
            ],
        ]);
    }

    private function formatBookmark(SavedLibrary $bookmark): array
    {
        $tool = $bookmark->tool;

        return [
            'id' => $bookmark->id,
            'tool' => [
                'id' => $tool?->id,
                'name' => $tool?->name,
                'url' => $tool?->url,
                'category' => $tool?->category,
                'pricing_type' => $tool?->pricing_type,
                'rating' => $tool?->rating,
            ],
            'utility_priority' => $bookmark->utility_priority,
            'priority_label' => $this->priorityLabel($bookmark->utility_priority),
            'semantic_keywords' => $bookmark->semantic_keywords ?? [],
            'tagging_status' => $bookmark->tagging_status,
            'note' => $bookmark->note,
            'saved_at' => $bookmark->created_at?->toISOString(),
        ];
    }

    private function priorityLabel(?string $priority): ?string
    {
        return match ($priority) {
            'must_try' => 'Wajib Dicoba',
            'very_good' => 'Sangat Bagus',
            'niche' => 'Bagus/Niche',
            'optional' => 'Opsional/Alternatif',
            default => null,
        };
    }
}
