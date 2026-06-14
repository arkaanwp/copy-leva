<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $gemini = app(App\Services\GeminiService::class);
    print_r($gemini->embedText('test'));
} catch(\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
