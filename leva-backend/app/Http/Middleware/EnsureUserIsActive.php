<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->status !== 'ACTIVE') {
            return response()->json([
                'message' => 'Please complete onboarding first.',
                'data' => ['status' => $user->status],
            ], 403);
        }

        return $next($request);
    }
}
