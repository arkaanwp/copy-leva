<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ScrapedTool;
use App\Services\QdrantService;

class ScraperWebhookController extends Controller
{
    private QdrantService $qdrantService;

    public function __construct(QdrantService $qdrantService)
    {
        $this->qdrantService = $qdrantService;
    }

    public function store(Request $request)
    {
        $request->validate([
            'tools' => 'required|array',
            'tools.*.name' => 'required|string',
            'tools.*.url' => 'required|string',
            'tools.*.description' => 'required|string',
            'tools.*.category' => 'required|string',
            'tools.*.pricing_type' => 'required|string',
            'scraped_at' => 'required|date',
            'source' => 'required|string',
        ]);

        $upsertedCount = 0;
        $skippedCount = 0;

        foreach ($request->tools as $toolData) {
            $tool = ScrapedTool::firstOrNew(['url' => $toolData['url']]);
            
            if (!$tool->exists) {
                $tool->name = $toolData['name'];
                $tool->description = $toolData['description'];
                $tool->category = $toolData['category'];
                $tool->pricing_type = $toolData['pricing_type'];
                $tool->save();

                try {
                    $this->qdrantService->upsertTool($tool);
                } catch (\Exception $e) {}
                
                $upsertedCount++;
            } else {
                $skippedCount++;
            }
        }

        return response()->json([
            'message' => 'Scraper data received',
            'data' => [
                'upserted_count' => $upsertedCount,
                'skipped_count' => $skippedCount
            ]
        ]);
    }
}
