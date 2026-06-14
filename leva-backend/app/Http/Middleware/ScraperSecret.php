<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ScraperSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.scraper.secret_key');

        if (!$secret || $request->header('X-Scraper-Secret') !== $secret) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}

