<?php

namespace Tests\Feature;

use App\Jobs\TaggingJob;
use App\Models\SavedLibrary;
use App\Models\User;
use Database\Seeders\DemoUserSeeder;
use Database\Seeders\ScrapedToolsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookmarksApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ScrapedToolsSeeder::class);
    }

    public function test_authenticated_user_can_store_bookmark_and_dispatch_tagging(): void
    {
        Queue::fake();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookmarks', [
            'tool_id' => 1,
            'note' => 'untuk bab 2',
        ]);

        $response
            ->assertStatus(202)
            ->assertJson([
                'message' => 'Tool saved. AI tagging in progress.',
                'data' => [
                    'tool_id' => 1,
                    'tool_name' => 'Perplexity AI',
                    'tagging_status' => 'pending',
                    'note' => 'untuk bab 2',
                ],
            ]);

        $bookmarkId = $response->json('data.bookmark_id');

        $this->assertDatabaseHas('saved_libraries', [
            'id' => $bookmarkId,
            'tool_id' => 1,
            'tagging_status' => 'pending',
        ]);

        Queue::assertPushed(TaggingJob::class, fn (TaggingJob $job) => $job->bookmarkId === $bookmarkId);
    }

    public function test_authenticated_user_can_list_bookmarks_with_filters(): void
    {
        $this->seed(DemoUserSeeder::class);

        $user = User::query()->where('email', 'renisa@demo.leva.id')->firstOrFail();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/bookmarks?priority=must_try&category=Research&q=literature&sort=latest');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Bookmarks retrieved successfully',
            ])
            ->assertJsonCount(1, 'data.bookmarks')
            ->assertJsonPath('data.bookmarks.0.tool.name', 'Perplexity AI')
            ->assertJsonPath('data.bookmarks.0.utility_priority', 'must_try')
            ->assertJsonPath('data.bookmarks.0.priority_label', 'Wajib Dicoba');
    }

    public function test_authenticated_user_can_delete_bookmark_by_tool_id(): void
    {
        $user = User::factory()->create();

        SavedLibrary::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'tool_id' => 1,
            'utility_priority' => 'very_good',
            'semantic_keywords' => ['a', 'b', 'c', 'd', 'e'],
            'tagging_status' => 'completed',
        ]);

        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/bookmarks/1');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Bookmark removed successfully',
            ]);

        $this->assertDatabaseMissing('saved_libraries', [
            'user_id' => $user->id,
            'tool_id' => 1,
        ]);
    }

    public function test_authenticated_user_can_get_unique_tags(): void
    {
        $this->seed(DemoUserSeeder::class);

        $user = User::query()->where('email', 'renisa@demo.leva.id')->firstOrFail();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/bookmarks/tags');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Tags retrieved successfully',
            ])
            ->assertJsonPath('data.tags.0', 'literature review');
    }
}
