<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    public function register(Request $request): JsonResponse
    {
        $user = $this->authService->register($request->all());

        return response()->json([
            'message' => 'User registered successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $result = $this->authService->login($request->all());

        return response()->json($result);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Current user retrieved successfully',
            'data' => [
                'user' => $this->formatUserDetail(
                    $request->user()->load('profile')
                ),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    private function formatUserDetail(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'profile' => $user->profile ? [
                'major' => $user->profile->major,
                'semester' => $user->profile->semester,
                'language_preference' => $user->profile->language_preference,
                'learning_style' => $user->profile->learning_style,
            ] : null,
        ];
    }
}
