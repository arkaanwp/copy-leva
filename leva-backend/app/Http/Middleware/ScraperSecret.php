<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ScraperSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = env('SCRAPER_SECRET_KEY');

        if (!$secret || $request->header('X-Scraper-Secret') !== $secret) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
