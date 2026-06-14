<?php

namespace App\Console\Commands;

use App\Models\ScrapedTool;
use App\Services\QdrantService;
use Illuminate\Console\Command;
use Throwable;

class EmbedSeededTools extends Command
{
    protected $signature = 'leva:embed-tools';

    protected $description = 'Embed seeded tools into Qdrant';

    public function handle(QdrantService $qdrantService): int
    {
        $tools = ScrapedTool::query()
            ->whereNull('qdrant_uuid')
            ->orWhere('qdrant_uuid', '')
            ->orderBy('id')
            ->get();

        if ($tools->isEmpty()) {
            $this->info('No tools pending embedding.');

            return self::SUCCESS;
        }

        $embedded = 0;

        foreach ($tools as $tool) {
            try {
                $qdrantService->upsertTool($tool);
                $embedded++;
                $this->line("Embedded tool {$tool->id}: {$tool->name}");
            } catch (Throwable $exception) {
                $this->error("Failed embedding tool {$tool->id}: {$exception->getMessage()}");
            }
        }

        $this->info("Embedded {$embedded} tools");

        return self::SUCCESS;
    }
}
