<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_get_current_user_with_nullable_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'status' => User::STATUS_PENDING,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Current user retrieved successfully',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => 'John Doe',
                        'email' => 'john@example.com',
                        'status' => User::STATUS_PENDING,
                        'profile' => null,
                    ],
                ],
            ]);
    }

    public function test_authenticated_user_can_get_current_user_with_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'status' => User::STATUS_ACTIVE,
        ]);

        UserProfile::create([
            'user_id' => $user->id,
            'major' => 'Informatika',
            'semester' => 3,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $response
            ->assertOk()
            ->assertJson([
                'data' => [
                    'user' => [
                        'status' => User::STATUS_ACTIVE,
                        'profile' => [
                            'major' => 'Informatika',
                            'semester' => 3,
                            'language_preference' => 'id',
                            'learning_style' => 'visual',
                        ],
                    ],
                ],
            ]);
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }
}
