<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$key = env('GEMINI_API_KEY');

$models = ['text-embedding-004', 'embedding-001', 'embedding-002'];

foreach ($models as $model) {
    echo "Testing $model...\n";
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:embedContent?key={$key}";
    $payload = [
        'model' => "models/{$model}",
        'content' => [
            'parts' => [['text' => 'hello world']]
        ]
    ];
    
    $response = Illuminate\Support\Facades\Http::post($url, $payload);
    if ($response->successful()) {
        echo "$model SUCCESS\n";
    } else {
        echo "$model FAILED: " . $response->json('error.message', 'Unknown') . "\n";
    }
}
