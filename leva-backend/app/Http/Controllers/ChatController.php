<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Services\QdrantService;
use App\Services\GeminiService;
use App\Models\ScrapedTool;

class ChatController extends Controller
{
    private QdrantService $qdrantService;
    private GeminiService $geminiService;

    public function __construct(QdrantService $qdrantService, GeminiService $geminiService)
    {
        $this->qdrantService = $qdrantService;
        $this->geminiService = $geminiService;
    }

    public function send(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'context_task_id' => 'nullable|uuid'
        ]);

        $user = $request->user();
        $major = $user->profile->major ?? null;

        $qdrantResults = $this->qdrantService->searchTools($request->message, $major, 5, 0.85);

        if (empty($qdrantResults)) {
            $qdrantResults = $this->qdrantService->searchTools($request->message, $major, 5, 0.7);
        }

        $toolIds = collect($qdrantResults)->pluck('tool_mysql_id')->filter()->toArray();
        $tools = ScrapedTool::whereIn('id', $toolIds)->get();

        if ($tools->isEmpty()) {
            $reply = "Maaf, saya tidak menemukan alat yang cukup relevan dengan spesifikasi pertanyaan Anda. Mohon reformulasi pertanyaan Anda atau gunakan kata kunci yang berbeda.";
        } else {
            $aiResponse = $this->geminiService->generateChatReply($request->message, $tools->all());
            $reply = $aiResponse['reply'];
        }

        $conversationId = $request->input('context_task_id') ?? \Illuminate\Support\Str::uuid()->toString();

        $conversation = ChatConversation::firstOrCreate(
            ['id' => $conversationId, 'user_id' => $user->id],
            ['title' => \Illuminate\Support\Str::limit($request->message, 50)]
        );

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $request->message,
        ]);

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $reply,
            'recommended_tool_ids' => $toolIds
        ]);

        $recommendedToolsResponse = [];
        foreach ($tools as $tool) {
            $matchedScore = collect($qdrantResults)->firstWhere('tool_mysql_id', $tool->id)['score'] ?? 0;
            $recommendedToolsResponse[] = array_merge($tool->toArray(), ['score' => $matchedScore]);
        }

        return response()->json([
            'message' => 'Chat response generated',
            'data' => [
                'reply' => $reply,
                'recommended_tools' => $recommendedToolsResponse,
                'conversation_id' => $conversation->id
            ]
        ]);
    }

    public function history(Request $request)
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
                'created_at' => $conv->created_at->toIso8601String()
            ];
        });

        return response()->json([
            'message' => 'Chat history retrieved successfully',
            'data' => [
                'conversations' => $mapped,
                'pagination' => [
                    'current_page' => $conversations->currentPage(),
                    'total' => $conversations->total(),
                    'last_page' => $conversations->lastPage()
                ]
            ]
        ]);
    }

    public function clearHistory(Request $request)
    {
        ChatConversation::where('user_id', $request->user()->id)->delete();

        return response()->json([
            'message' => 'Chat history cleared successfully'
        ]);
    }
}
