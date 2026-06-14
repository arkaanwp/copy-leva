<?php

namespace Tests\Feature;

use App\Jobs\TaggingJob;
use App\Models\SavedLibrary;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\OpenAIService;
use Database\Seeders\ScrapedToolsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TaggingJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ScrapedToolsSeeder::class);
    }

    public function test_tagging_job_marks_bookmark_completed_when_openai_succeeds(): void
    {
        $user = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
        ]);

        UserProfile::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'major' => 'Teknik Informatika',
            'semester' => 6,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $bookmark = SavedLibrary::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'tool_id' => 1,
            'tagging_status' => 'pending',
        ]);

        $openAIService = new class extends OpenAIService
        {
            public function classifyBookmark(\App\Models\ScrapedTool $tool, array $userProfile): array
            {
                return [
                    'utility_priority' => 'must_try',
                    'semantic_keywords' => [
                        'literature review',
                        'sumber terverifikasi',
                        'riset cepat',
                        'academic search',
                        'ai search',
                    ],
                ];
            }
        };

        (new TaggingJob($bookmark->id))->handle($openAIService);

        $bookmark->refresh();

        $this->assertSame('completed', $bookmark->tagging_status);
        $this->assertSame('must_try', $bookmark->utility_priority);
        $this->assertCount(5, $bookmark->semantic_keywords);
    }

    public function test_tagging_job_marks_bookmark_failed_when_openai_errors(): void
    {
        $user = User::factory()->create();

        $bookmark = SavedLibrary::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'tool_id' => 1,
            'tagging_status' => 'pending',
        ]);

        $openAIService = new class extends OpenAIService
        {
            public function classifyBookmark(\App\Models\ScrapedTool $tool, array $userProfile): array
            {
                throw new \RuntimeException('Quota exceeded');
            }
        };

        (new TaggingJob($bookmark->id))->handle($openAIService);

        $bookmark->refresh();

        $this->assertSame('failed', $bookmark->tagging_status);
    }
}
