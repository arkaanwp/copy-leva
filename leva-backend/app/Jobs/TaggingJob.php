<?php

namespace App\Jobs;

use App\Models\SavedLibrary;
use App\Services\OpenAIService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class TaggingJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public string $bookmarkId
    ) {}

    public function handle(OpenAIService $openAIService): void
    {
        $bookmark = SavedLibrary::query()->with(['tool', 'user.profile'])->find($this->bookmarkId);

        if (!$bookmark || !$bookmark->tool) {
            return;
        }

        try {
            $result = $openAIService->classifyBookmark($bookmark->tool, [
                'major' => $bookmark->user?->profile?->major,
                'semester' => $bookmark->user?->profile?->semester,
                'language_preference' => $bookmark->user?->profile?->language_preference,
            ]);

            $bookmark->update([
                'utility_priority' => $result['utility_priority'],
                'semantic_keywords' => $result['semantic_keywords'],
                'tagging_status' => 'completed',
            ]);
        } catch (Throwable $exception) {
            Log::error('TaggingJob failed', [
                'bookmark_id' => $this->bookmarkId,
                'error' => $exception->getMessage(),
            ]);

            $bookmark->update([
                'tagging_status' => 'failed',
            ]);
        }
    }
}

