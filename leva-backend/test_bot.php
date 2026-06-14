<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\ToolController;
use App\Services\OpenAIService;
use App\Services\QdrantService;

echo "=== MENGUJI SISTEM PENCARIAN & REKOMENDASI (QDRANT + OPENROUTER) ===\n";
try {
    $qdrant = app(QdrantService::class);
    $ai = app(OpenAIService::class);
    
    // Test 1: Qdrant Search
    echo "\nMencari tools untuk: 'bikin presentasi AI otomatis'\n";
    $results = $qdrant->searchTools("bikin presentasi AI otomatis", null, 3, 0.7);
    
    if (empty($results)) {
        echo "❌ Qdrant tidak menemukan hasil yang cocok. Fallback ke MySQL...\n";
        $tools = \App\Models\ScrapedTool::where('description', 'like', '%presentation%')->limit(3)->get();
    } else {
        echo "✅ Qdrant menemukan " . count($results) . " tools!\n";
        $toolIds = collect($results)->pluck('tool_mysql_id')->toArray();
        $tools = \App\Models\ScrapedTool::whereIn('id', $toolIds)->get();
    }
    
    if ($tools->isNotEmpty()) {
        
        foreach ($tools as $idx => $tool) {
            echo "\n[" . ($idx + 1) . "] " . $tool->name . " (" . $tool->category . ")\n";
            echo "Deskripsi asli: " . substr($tool->description, 0, 80) . "...\n";
            
            // Test 2: Gemini Recommendation Reason
            echo "Meminta alasan rekomendasi dari Gemini...\n";
            $reason = $ai->generateSearchRecommendationReason($tool, ['major' => 'Desain Komunikasi Visual', 'semester' => 4]);
            echo "💡 Nex AGI bilang: " . $reason . "\n";
        }
        
        // Test 3: Chat Reply
        echo "\n\n=== MENGUJI CHAT AI (GEMINI) ===\n";
        echo "User: 'Tolong jelaskan secara singkat kenapa tool pertama cocok buat anak DKV?'\n";
        
        $chatResponse = $ai->generateChatReply(
            "Tolong jelaskan secara singkat kenapa tool pertama cocok buat anak DKV?", 
            $tools->all(),
            'id'
        );
        echo "🤖 Bot (Nex AGI): \n" . $chatResponse['reply'] . "\n";
    }
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
