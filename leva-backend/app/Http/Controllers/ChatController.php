<?php

namespace App\Http\Controllers;

use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ScrapedTool;
use App\Services\OpenAIService;
use App\Services\QdrantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function __construct(
        private readonly QdrantService $qdrantService,
        private readonly OpenAIService $openAIService
    ) {
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string'],
            'context_task_id' => ['nullable', 'uuid'],
        ]);

        $user = $request->user();
        $profile = $user->profile;
        $categoryContext = $profile?->major ?? null;
        $language = $profile?->language_preference ?? 'id';

        $qdrantResults = $this->qdrantService->searchTools($validated['message'], $categoryContext, 5, 0.85);

        if (empty($qdrantResults)) {
            $qdrantResults = $this->qdrantService->searchTools($validated['message'], $categoryContext, 5, 0.7);
        }

        $toolIds = collect($qdrantResults)->pluck('tool_mysql_id')->filter()->toArray();
        $tools = ScrapedTool::query()->whereIn('id', $toolIds)->get();

        if ($tools->isEmpty()) {
            $keywords = explode(' ', $validated['message']);
            $query = ScrapedTool::query();
            foreach ($keywords as $word) {
                if (strlen($word) > 3) {
                    $query->orWhere('description', 'like', "%{$word}%")
                          ->orWhere('name', 'like', "%{$word}%")
                          ->orWhere('category', 'like', "%{$word}%");
                }
            }
            $tools = $query->limit(5)->get();
        }

        if ($tools->isEmpty()) {
            $reply = "Maaf, saya tidak menemukan alat yang cukup relevan dengan spesifikasi pertanyaan Anda. Mohon reformulasi pertanyaan Anda atau gunakan kata kunci yang berbeda.";
        } else {
            $aiResponse = $this->openAIService->generateChatReply($validated['message'], $tools->all(), $language);
            $reply = $aiResponse['reply'];
        }

        $conversationId = null;
        $contextTaskId = $request->input('context_task_id');
        if ($contextTaskId) {
            $taskBelongsToUser = \App\Models\TaskMaster::query()
                ->where('task_id', $contextTaskId)
                ->where('user_id', $user->id)
                ->exists();
            $conversationId = $taskBelongsToUser ? $contextTaskId : Str::uuid()->toString();
        } else {
            $conversationId = Str::uuid()->toString();
        }

        $conversation = ChatConversation::where('id', $conversationId)->where('user_id', $user->id)->first();
        if (!$conversation) {
            $conversation = ChatConversation::create([
                'id' => $conversationId,
                'user_id' => $user->id,
                'title' => Str::limit($validated['message'], 50)
            ]);
        }

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $validated['message'],
        ]);

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $reply,
            'recommended_tool_ids' => $toolIds,
        ]);

        $recommendedToolsResponse = $tools->map(function (ScrapedTool $tool) use ($qdrantResults) {
            $matchedScore = collect($qdrantResults)->firstWhere('tool_mysql_id', $tool->id)['score'] ?? 0;

            return [
                'id' => $tool->id,
                'name' => $tool->name,
                'url' => $tool->url,
                'description' => $tool->description,
                'category' => $tool->category,
                'pricing_type' => $tool->pricing_type,
                'rating' => $tool->rating,
                'qdrant_uuid' => $tool->qdrant_uuid,
                'score' => $matchedScore,
            ];
        })->values();

        return response()->json([
            'message' => 'Chat response generated',
            'data' => [
                'reply' => $reply,
                'recommended_tools' => $recommendedToolsResponse,
                'conversation_id' => $conversation->id,
            ],
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $conversations = ChatConversation::where('user_id', $request->user()->id)
            ->with(['messages' => function ($q) {
                $q->orderBy('created_at', 'desc');
            }])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $mapped = $conversations->getCollection()->map(function ($conv) {
            return [
                'id' => $conv->id,
                'title' => $conv->title,
                'last_message' => $conv->messages->first()->content ?? '',
                'created_at' => $conv->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'message' => 'Chat history retrieved successfully',
            'data' => [
                'conversations' => $mapped,
                'pagination' => [
                    'current_page' => $conversations->currentPage(),
                    'total' => $conversations->total(),
                    'last_page' => $conversations->lastPage(),
                ],
            ],
        ]);
    }

    public function clearHistory(Request $request): JsonResponse
    {
        ChatConversation::where('user_id', $request->user()->id)->delete();

        return response()->json([
            'message' => 'Chat history cleared successfully',
        ]);
    }
}
