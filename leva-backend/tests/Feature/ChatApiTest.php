<?php

namespace Tests\Feature;

use App\Models\ScrapedTool;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\OpenAIService;
use App\Services\QdrantService;
use Database\Seeders\ScrapedToolsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ScrapedToolsSeeder::class);
    }

    public function test_chat_returns_reply_and_recommended_tools_from_qdrant_context(): void
    {
        $user = User::factory()->create();

        UserProfile::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'major' => 'Research',
            'semester' => 6,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        Sanctum::actingAs($user);

        $this->app->instance(QdrantService::class, new class(app(OpenAIService::class)) extends QdrantService
        {
            public function __construct(OpenAIService $openAIService)
            {
                parent::__construct($openAIService);
            }

            public function searchTools(string $query, ?string $categoryFilter = null, int $limit = 5, float $minScore = 0.85): array
            {
                return [
                    ['tool_mysql_id' => 1, 'score' => 0.92],
                    ['tool_mysql_id' => 2, 'score' => 0.89],
                ];
            }
        });

        $this->app->instance(OpenAIService::class, new class extends OpenAIService
        {
            public function generateChatReply(string $message, array $contextTools, string $language = 'id'): array
            {
                return ['reply' => 'Gunakan Perplexity AI untuk riset awal dan Consensus untuk validasi sumber.'];
            }
        });

        $response = $this->postJson('/api/chat', [
            'message' => 'tools terbaik untuk literature review jurnal IEEE',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Chat response generated')
            ->assertJsonPath('data.reply', 'Gunakan Perplexity AI untuk riset awal dan Consensus untuk validasi sumber.')
            ->assertJsonCount(2, 'data.recommended_tools')
            ->assertJsonPath('data.recommended_tools.0.id', 1);
    }

    public function test_chat_returns_reformulation_message_when_qdrant_has_no_results(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->app->instance(QdrantService::class, new class(app(OpenAIService::class)) extends QdrantService
        {
            public function __construct(OpenAIService $openAIService)
            {
                parent::__construct($openAIService);
            }

            public function searchTools(string $query, ?string $categoryFilter = null, int $limit = 5, float $minScore = 0.85): array
            {
                return [];
            }
        });

        $response = $this->postJson('/api/chat', [
            'message' => 'apa tool untuk domain sangat spesifik ini?',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Chat response generated')
            ->assertJsonPath('data.recommended_tools', [])
            ->assertJsonPath('data.reply', 'Maaf, saya tidak menemukan alat yang cukup relevan dengan spesifikasi pertanyaan Anda. Mohon reformulasi pertanyaan Anda atau gunakan kata kunci yang berbeda.');
    }
}
