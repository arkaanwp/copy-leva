<?php

namespace App\Jobs;

use App\Models\SavedLibrary;
use App\Services\GeminiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class TaggingJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $bookmarkId
    ) {}

    public function handle(GeminiService $geminiService): void
    {
        $bookmark = SavedLibrary::query()->with(['tool', 'user.profile'])->find($this->bookmarkId);

        if (!$bookmark || !$bookmark->tool) {
            return;
        }

        try {
            $result = $geminiService->classifyBookmark($bookmark->tool, [
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
            $bookmark->update([
                'tagging_status' => 'failed',
            ]);
        }
    }
}
