<?php

namespace App\Services;

use App\Models\ScrapedTool;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAIService
{
    private function requestOpenRouter(array $payload): array
    {
        $baseUrl = config('services.openai.base_url', 'https://openrouter.ai/api/v1');
        
        // Hanya tambahkan reasoning jika menggunakan OpenRouter
        if (str_contains($baseUrl, 'openrouter') && !isset($payload['reasoning'])) {
            $payload['reasoning'] = ['enabled' => true];
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.openai.api_key'),
            'Content-Type' => 'application/json',
            'HTTP-Referer' => config('app.url'),
            'X-Title' => 'Leva',
        ])
        ->timeout(45)
        ->post($baseUrl . '/chat/completions', $payload);

        if (!$response->successful()) {
            throw new RuntimeException('OpenRouter error: ' . $response->body());
        }

        return $response->json();
    }

    public function embedText(string $text): array
    {
        $baseUrl = config('services.openai.base_url', 'https://api.openai.com/v1');
        
        // OpenRouter free tier usually lacks reliable embeddings. 
        // This is meant to be used with native OpenAI keys.
        $payload = [
            'model' => config('services.openai.embedding_model', 'text-embedding-3-small'),
            'input' => $text,
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . config('services.openai.api_key'),
                'Content-Type' => 'application/json',
            ])
            ->timeout(30)
            ->post($baseUrl . '/embeddings', $payload);

            if ($response->successful()) {
                return $response->json('data.0.embedding') ?? [];
            }
        } catch (\Throwable $e) {
            // Ignore error and return empty array to trigger MySQL fallback
        }

        return [];
    }

    public function decomposeTask(string $text, array $userProfile): array
    {
        $systemPrompt = $this->buildSystemPrompt($userProfile);
        // Instruct it to return JSON format string
        $systemPrompt .= "\n\nYou MUST return only raw JSON format without markdown. Use the exact schema required.";

        $response = $this->requestOpenRouter([
            'model' => config('services.openai.chat_model', 'nex-agi/nex-n2-pro:free'),
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $text]
            ],
            'response_format' => ['type' => 'json_object'],
            'temperature' => 0.4,
        ]);

        $rawText = data_get($response, 'choices.0.message.content');
        
        // Extract only the JSON object, ignoring any <think> tags or conversational padding
        $start = strpos($rawText, '{');
        $end = strrpos($rawText, '}');
        if ($start !== false && $end !== false) {
            $rawText = substr($rawText, $start, $end - $start + 1);
        }
        
        $decoded = json_decode($rawText, true);

        if (!is_array($decoded) || !isset($decoded['title'], $decoded['sub_tasks']) || !is_array($decoded['sub_tasks'])) {
            throw new RuntimeException('OpenRouter returned invalid decomposition JSON. Raw: ' . substr($rawText, 0, 100));
        }

        return $decoded;
    }

    public function classifyBookmark(ScrapedTool $tool, array $userProfile): array
    {
        $systemPrompt = $this->buildBookmarkSystemPrompt($userProfile);
        $systemPrompt .= "\n\nYou MUST return only raw JSON format without markdown.";
        
        $userMessage = json_encode([
            'name' => $tool->name,
            'description' => $tool->description,
            'category' => $tool->category,
            'pricing_type' => $tool->pricing_type,
        ]);

        $response = $this->requestOpenRouter([
            'model' => config('services.openai.chat_model', 'nex-agi/nex-n2-pro:free'),
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userMessage]
            ],
            'response_format' => ['type' => 'json_object'],
            'temperature' => 0.2,
        ]);

        $rawText = data_get($response, 'choices.0.message.content');
        
        // Extract only the JSON object
        $start = strpos($rawText, '{');
        $end = strrpos($rawText, '}');
        if ($start !== false && $end !== false) {
            $rawText = substr($rawText, $start, $end - $start + 1);
        }
        
        $decoded = json_decode($rawText, true);

        if (!is_array($decoded) || !isset($decoded['utility_priority'], $decoded['semantic_keywords']) || count($decoded['semantic_keywords']) !== 5) {
            throw new RuntimeException('OpenRouter returned invalid bookmark classification JSON.');
        }

        return [
            'utility_priority' => $decoded['utility_priority'],
            'semantic_keywords' => array_values($decoded['semantic_keywords']),
        ];
    }

    public function generateChatReply(string $message, array $contextTools, string $language = 'id'): array
    {
        $systemPrompt = $this->buildChatSystemPrompt($contextTools, $language);

        $response = $this->requestOpenRouter([
            'model' => config('services.openai.chat_model', 'nex-agi/nex-n2-pro:free'),
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $message]
            ],
            'temperature' => 0.4,
        ]);

        $rawText = data_get($response, 'choices.0.message.content');
        $reasoningText = data_get($response, 'choices.0.message.reasoning_details');

        if (!is_string($rawText) || trim($rawText) === '') {
            throw new RuntimeException('OpenRouter returned an empty chat response.');
        }

        return [
            'reply' => $rawText,
            'reasoning' => $reasoningText
        ];
    }

    public function generateSearchRecommendationReason(ScrapedTool $tool, array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';

        $prompt = <<<PROMPT
Berikan satu kalimat singkat dalam bahasa Indonesia yang menjelaskan kenapa tool ini relevan untuk user. Jangan lebih dari 20 kata.

Konteks user:
- major: {$major}
- semester: {$semester}

Tool:
- name: {$tool->name}
- category: {$tool->category}
- description: {$tool->description}
PROMPT;

        $response = $this->requestOpenRouter([
            'model' => config('services.openai.chat_model', 'nex-agi/nex-n2-pro:free'),
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ],
            'temperature' => 0.2,
        ]);

        return trim(data_get($response, 'choices.0.message.content', 'Direkomendasikan berdasarkan relevansi.'));
    }

    private function buildSystemPrompt(array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';
        $language = $userProfile['language_preference'] ?? 'id';

        return <<<PROMPT
Anda adalah insinyur alur kerja perilaku yang mensintesis metodologi Atomic Habits.
Buat dekomposisi tugas yang sangat praktis untuk mahasiswa.

Konteks user:
- major: {$major}
- semester: {$semester}
- language_preference: {$language}

Aturan wajib:
- Pecah menjadi minimal 3 dan maksimal 6 sub-task.
- Setiap sub-task harus konkret, dapat dimulai segera, dan cukup kecil untuk diselesaikan dalam kurang dari 30 menit.
- Tulis deskripsi 2-3 kalimat yang berisi arahan yang jelas.
- Tulis tips 1-2 kalimat yang sangat konkret (misal: "Gunakan teknik Pomodoro 25 menit", "Gunakan Zotero untuk manajemen sitasi").
- Kategori alat AI yang direkomendasikan HARUS salah satu dari: Research, Writing, Coding, Data, Academic, Productivity.

Gunakan schema JSON berikut:
{
  "title": "string",
  "sub_tasks": [
    {
      "judul_tugas": "string",
      "deskripsi": "string",
      "tips": "string",
      "estimasi_waktu": "string",
      "kategori_alat_ai_yang_rekomendasi": "Research|Writing|Coding|Data|Academic|Productivity"
    }
  ]
}
PROMPT;
    }

    private function buildBookmarkSystemPrompt(array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';

        return <<<PROMPT
Anda adalah agen auditor utilitas alat AI untuk mahasiswa.
Evaluasi alat AI ini berdasarkan konteks jurusan dan level akademik user.

Konteks user:
- major: {$major}
- semester: {$semester}

Aturan:
- utility_priority HARUS salah satu dari: must_try, very_good, niche, optional.
- semantic_keywords HARUS berisi tepat 5 keyword.

Gunakan schema JSON berikut:
{
  "utility_priority": "must_try|very_good|niche|optional",
  "semantic_keywords": ["string", "string", "string", "string", "string"]
}
PROMPT;
    }

    private function buildChatSystemPrompt(array $contextTools, string $language): string
    {
        $contextStr = "";
        foreach ($contextTools as $index => $tool) {
            $contextStr .= ($index + 1) . ". Name: {$tool->name}, Desc: {$tool->description}, Cat: {$tool->category}, URL: {$tool->url}\n";
        }

        $langInstruction = $language === 'en' ? 'Answer in English.' : 'Jawab dalam bahasa Indonesia.';

        return "Anda adalah asisten AI yang merekomendasikan alat untuk mahasiswa. Hanya gunakan tools yang ada di context berikut. Dilarang merekomendasikan tools lain. {$langInstruction} \n\nContext Tools:\n" . ($contextStr ?: "Tidak ada alat spesifik yang ditemukan.");
    }
}
