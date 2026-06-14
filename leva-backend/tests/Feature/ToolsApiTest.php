<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ScrapedToolsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ToolsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ScrapedToolsSeeder::class);
    }

    public function test_authenticated_user_can_get_paginated_tools(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/tools?per_page=5');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Tools retrieved successfully',
                'data' => [
                    'pagination' => [
                        'current_page' => 1,
                        'per_page' => 5,
                        'total' => 12,
                        'last_page' => 3,
                    ],
                ],
            ])
            ->assertJsonCount(5, 'data.tools')
            ->assertJsonStructure([
                'message',
                'data' => [
                    'tools' => [[
                        'id',
                        'name',
                        'url',
                        'description',
                        'category',
                        'pricing_type',
                        'rating',
                        'qdrant_uuid',
                    ]],
                    'pagination' => [
                        'current_page',
                        'per_page',
                        'total',
                        'last_page',
                    ],
                ],
            ]);
    }

    public function test_tools_can_be_filtered_by_category_and_pricing(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/tools?category=Research&pricing=free');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Tools retrieved successfully',
                'data' => [
                    'pagination' => [
                        'total' => 1,
                    ],
                ],
            ])
            ->assertJsonCount(1, 'data.tools')
            ->assertJsonPath('data.tools.0.name', 'Consensus')
            ->assertJsonPath('data.tools.0.category', 'Research')
            ->assertJsonPath('data.tools.0.pricing_type', 'free');
    }

    public function test_tools_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/tools');

        $response
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_tools_index_validates_query_parameters(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/tools?category=Unknown&pricing=trial&per_page=100&page=0');

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'category',
                'pricing',
                'per_page',
                'page',
            ]);
    }

    public function test_authenticated_user_can_get_tool_detail(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/tools/1');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Tool retrieved successfully',
                'data' => [
                    'tool' => [
                        'id' => 1,
                        'name' => 'Perplexity AI',
                        'url' => 'perplexity.ai',
                        'category' => 'Research',
                        'pricing_type' => 'freemium',
                        'rating' => 4.8,
                    ],
                ],
            ])
            ->assertJsonStructure([
                'message',
                'data' => [
                    'tool' => [
                        'id',
                        'name',
                        'url',
                        'description',
                        'category',
                        'pricing_type',
                        'rating',
                        'qdrant_uuid',
                        'scraped_at',
                    ],
                ],
            ]);
    }

    public function test_authenticated_user_can_search_tools_with_mysql_fallback_response(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/tools/search?q=literature&limit=2');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Search completed successfully',
                'data' => [
                    'query' => 'literature',
                ],
            ])
            ->assertJsonCount(2, 'data.results')
            ->assertJsonPath('data.results.0.score', 1)
            ->assertJsonPath(
                'data.results.0.why_recommended',
                'Direkomendasikan berdasarkan pencarian kata kunci'
            )
            ->assertJsonStructure([
                'message',
                'data' => [
                    'query',
                    'results' => [[
                        'id',
                        'name',
                        'url',
                        'description',
                        'category',
                        'pricing_type',
                        'rating',
                        'qdrant_uuid',
                        'score',
                        'why_recommended',
                    ]],
                ],
            ]);
    }

    public function test_search_requires_query_and_valid_limit(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/tools/search?q=&limit=25');

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'q',
                'limit',
            ]);
    }

    public function test_search_returns_empty_results_when_no_tools_match(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/tools/search?q=blockchain-forensics');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Search completed successfully',
                'data' => [
                    'query' => 'blockchain-forensics',
                    'results' => [],
                ],
            ]);
    }
}
