<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_complete_onboarding_via_profile_endpoint(): void
    {
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'status' => User::STATUS_PENDING,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/profile', [
            'major' => 'Informatika',
            'semester' => 3,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Onboarding completed successfully',
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => 'John Doe',
                        'email' => 'john@example.com',
                        'status' => User::STATUS_ACTIVE,
                        'profile' => [
                            'major' => 'Informatika',
                            'semester' => 3,
                            'language_preference' => 'id',
                            'learning_style' => 'visual',
                        ],
                    ],
                ],
            ])
            ->assertJsonMissingPath('data.user.profile.id')
            ->assertJsonMissingPath('data.user.profile.updated_at');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => User::STATUS_ACTIVE,
        ]);

        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $user->id,
            'major' => 'Informatika',
            'semester' => 3,
        ]);
    }

    public function test_profile_creation_requires_authentication(): void
    {
        $response = $this->postJson('/api/profile', [
            'major' => 'Informatika',
            'semester' => 3,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $response
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_profile_creation_requires_valid_payload(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/profile', [
            'major' => '',
            'semester' => 15,
            'language_preference' => '',
            'learning_style' => '',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'major',
                'semester',
                'language_preference',
                'learning_style',
            ]);
    }

    public function test_profile_creation_rejects_user_with_existing_profile(): void
    {
        $user = User::factory()->create([
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

        $response = $this->postJson('/api/profile', [
            'major' => 'Informatika',
            'semester' => 4,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        $response
            ->assertConflict()
            ->assertJson([
                'message' => 'User already completed onboarding.',
            ]);
    }

    public function test_authenticated_user_can_get_profile(): void
    {
        $user = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
        ]);

        $profile = UserProfile::create([
            'user_id' => $user->id,
            'major' => 'Informatika',
            'semester' => 3,
            'language_preference' => 'id',
            'learning_style' => 'visual',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/profile');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Profile retrieved successfully',
                'data' => [
                    'profile' => [
                        'id' => $profile->id,
                        'major' => 'Informatika',
                        'semester' => 3,
                        'language_preference' => 'id',
                        'learning_style' => 'visual',
                    ],
                ],
            ])
            ->assertJsonPath('data.profile.updated_at', $profile->fresh()->updated_at->toISOString());
    }

    public function test_get_profile_returns_not_found_when_profile_missing(): void
    {
        Sanctum::actingAs(User::factory()->create([
            'status' => User::STATUS_PENDING,
        ]));

        $response = $this->getJson('/api/profile');

        $response
            ->assertNotFound()
            ->assertJson([
                'message' => 'Profile not found.',
            ]);
    }

    public function test_authenticated_user_can_update_profile_partially(): void
    {
        $user = User::factory()->create([
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

        $response = $this->putJson('/api/profile', [
            'semester' => 4,
            'language_preference' => 'en',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Profile updated successfully',
                'data' => [
                    'profile' => [
                        'major' => 'Informatika',
                        'semester' => 4,
                        'language_preference' => 'en',
                        'learning_style' => 'visual',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $user->id,
            'major' => 'Informatika',
            'semester' => 4,
            'language_preference' => 'en',
            'learning_style' => 'visual',
        ]);
    }

    public function test_profile_update_requires_existing_profile(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->putJson('/api/profile', [
            'major' => 'Sistem Informasi',
        ]);

        $response
            ->assertNotFound()
            ->assertJson([
                'message' => 'Profile not found.',
            ]);
    }

    public function test_profile_update_requires_valid_optional_fields(): void
    {
        $user = User::factory()->create([
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

        $response = $this->putJson('/api/profile', [
            'semester' => 20,
            'language_preference' => 'jp',
            'learning_style' => 'reading',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'semester',
                'language_preference',
                'learning_style',
            ]);
    }
}
