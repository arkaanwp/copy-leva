<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserProfile;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        protected ProfileService $profileService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $user = $this->profileService->store(
            $request->user(),
            $request->all()
        );

        return response()->json([
            'message' => 'Onboarding completed successfully',
            'data' => [
                'user' => $this->formatUserDetail($user),
            ],
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $profile = $this->profileService->show($request->user());

        return response()->json([
            'message' => 'Profile retrieved successfully',
            'data' => [
                'profile' => $this->formatProfile($profile),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $profile = $this->profileService->update(
            $request->user(),
            $request->all()
        );

        return response()->json([
            'message' => 'Profile updated successfully',
            'data' => [
                'profile' => $this->formatProfile($profile),
            ],
        ]);
    }

    private function formatUserDetail(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'profile' => $user->profile ? $this->formatProfile($user->profile, false, false) : null,
        ];
    }

    private function formatProfile(
        UserProfile $profile,
        bool $includeId = true,
        bool $includeTimestamp = true
    ): array
    {
        $data = [
            'major' => $profile->major,
            'semester' => $profile->semester,
            'language_preference' => $profile->language_preference,
            'learning_style' => $profile->learning_style,
        ];

        if ($includeId) {
            $data = ['id' => $profile->id, ...$data];
        }

        if ($includeTimestamp) {
            $data['updated_at'] = $profile->updated_at?->toISOString();
        }

        return $data;
    }
}
