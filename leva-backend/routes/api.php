<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookmarkController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\ToolController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ScraperWebhookController;
use App\Http\Middleware\ScraperSecret;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/profile', [ProfileController::class, 'store']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::get('/tools/search', [ToolController::class, 'search']);
    Route::get('/tools', [ToolController::class, 'index']);
    Route::get('/tools/{id}', [ToolController::class, 'show']);
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store'])->middleware('throttle:30,1');
    Route::get('/tasks/{taskId}', [TaskController::class, 'show']);
    Route::get('/tasks/{taskId}/status', [TaskController::class, 'status']);
    Route::delete('/tasks/{taskId}', [TaskController::class, 'destroy']);
    Route::patch('/tasks/{taskId}/sub-tasks/{subTaskId}', [TaskController::class, 'updateSubTask']);
    Route::get('/bookmarks/tags', [BookmarkController::class, 'tags']);
    Route::get('/bookmarks', [BookmarkController::class, 'index']);
    Route::post('/bookmarks', [BookmarkController::class, 'store']);
    Route::delete('/bookmarks/{toolId}', [BookmarkController::class, 'destroy']);

    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/chat', [ChatController::class, 'send']);
        Route::get('/chat/history', [ChatController::class, 'history']);
        Route::delete('/chat/history', [ChatController::class, 'clearHistory']);
    });
});

Route::post('/internal/scraper-webhook', [ScraperWebhookController::class, 'store'])
    ->middleware(ScraperSecret::class);
