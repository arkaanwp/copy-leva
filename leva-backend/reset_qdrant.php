<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$deleteResp = Illuminate\Support\Facades\Http::delete('http://localhost:6333/collections/tools_semantic_vectors');
echo "Delete Status: " . $deleteResp->status() . "\n";
echo "Delete Body: " . $deleteResp->body() . "\n";

App\Models\ScrapedTool::query()->update(['qdrant_uuid' => null]);
echo "MySQL qdrant_uuid reset.\n";
