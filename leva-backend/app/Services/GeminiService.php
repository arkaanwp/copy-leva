<?php

namespace App\Services;

use App\Models\ScrapedTool;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiService
{
    public function embedText(string $text): array
    {
        $payload = [
            'model' => 'models/'.config('services.gemini.embedding_model'),
            'content' => [
                'parts' => [
                    ['text' => $text],
                ],
            ],
        ];

        $response = $this->request(
            '/models/'.config('services.gemini.embedding_model').':embedContent',
            $payload
        );

        return data_get($response, 'embedding.values', []);
    }

    public function decomposeTask(string $text, array $userProfile): array
    {
        $prompt = $this->buildDecompositionPrompt($text, $userProfile);

        $response = $this->request(
            '/models/'.config('services.gemini.chat_model').':generateContent',
            [
                'contents' => [[
                    'role' => 'user',
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ]],
                'generationConfig' => [
                    'temperature' => 0.4,
                    'responseMimeType' => 'application/json',
                ],
            ]
        );

        $rawText = data_get($response, 'candidates.0.content.parts.0.text');

        if (!is_string($rawText) || trim($rawText) === '') {
            throw new RuntimeException('Gemini returned an empty decomposition response.');
        }

        $decoded = json_decode($rawText, true);

        if (!is_array($decoded) || !isset($decoded['title'], $decoded['sub_tasks']) || !is_array($decoded['sub_tasks'])) {
            throw new RuntimeException('Gemini returned invalid decomposition JSON.');
        }

        return $decoded;
    }

    public function classifyBookmark(ScrapedTool $tool, array $userProfile): array
    {
        $prompt = $this->buildBookmarkClassificationPrompt($tool, $userProfile);

        $response = $this->request(
            '/models/'.config('services.gemini.chat_model').':generateContent',
            [
                'contents' => [[
                    'role' => 'user',
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ]],
                'generationConfig' => [
                    'temperature' => 0.2,
                    'responseMimeType' => 'application/json',
                ],
            ]
        );

        $rawText = data_get($response, 'candidates.0.content.parts.0.text');

        if (!is_string($rawText) || trim($rawText) === '') {
            throw new RuntimeException('Gemini returned an empty bookmark classification response.');
        }

        $decoded = json_decode($rawText, true);

        if (
            !is_array($decoded) ||
            !isset($decoded['utility_priority'], $decoded['semantic_keywords']) ||
            !is_array($decoded['semantic_keywords']) ||
            count($decoded['semantic_keywords']) !== 5
        ) {
            throw new RuntimeException('Gemini returned invalid bookmark classification JSON.');
        }

        return [
            'utility_priority' => $decoded['utility_priority'],
            'semantic_keywords' => array_values($decoded['semantic_keywords']),
        ];
    }

    public function generateSearchRecommendationReason(ScrapedTool $tool, array $userProfile): string
    {
        $prompt = $this->buildSearchRecommendationReasonPrompt($tool, $userProfile);

        $response = $this->request(
            '/models/'.config('services.gemini.chat_model').':generateContent',
            [
                'contents' => [[
                    'role' => 'user',
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ]],
                'generationConfig' => [
                    'temperature' => 0.2,
                ],
            ]
        );

        return trim(data_get($response, 'candidates.0.content.parts.0.text', 'Direkomendasikan berdasarkan relevansi semantik'));
    }

    private function request(string $path, array $payload): array
    {
        $apiKey = config('services.gemini.api_key');

        if (!$apiKey) {
            throw new RuntimeException('GEMINI_API_KEY is not configured.');
        }

        try {
            $response = Http::baseUrl(config('services.gemini.base_url'))
                ->timeout(30)
                ->acceptJson()
                ->post($path.'?key='.$apiKey, $payload)
                ->throw()
                ->json();
        } catch (ConnectionException $exception) {
            throw new RuntimeException('Gemini service temporarily unavailable.', previous: $exception);
        }

        return is_array($response) ? $response : [];
    }

    private function buildDecompositionPrompt(string $text, array $userProfile): string
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
- Tulis deskripsi 2-3 kalimat.
- Tulis tips 1-2 kalimat yang konkret.
- kategori_alat_ai_yang_rekomendasi harus salah satu: Research, Writing, Coding, Data, Academic, Productivity.
- Balas HANYA JSON valid tanpa markdown.

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

Tugas user:
{$text}
PROMPT;
    }

    private function buildBookmarkClassificationPrompt(ScrapedTool $tool, array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';

        return <<<PROMPT
Anda adalah agen auditor utilitas alat AI untuk mahasiswa.

Konteks user:
- major: {$major}
- semester: {$semester}

Tool:
- name: {$tool->name}
- category: {$tool->category}
- pricing_type: {$tool->pricing_type}
- description: {$tool->description}

Aturan wajib:
- utility_priority harus salah satu: must_try, very_good, niche, optional.
- semantic_keywords harus berisi tepat 5 string unik.
- Balas HANYA JSON valid tanpa markdown.

Gunakan schema:
{
  "utility_priority": "must_try|very_good|niche|optional",
  "semantic_keywords": ["string", "string", "string", "string", "string"]
}
PROMPT;
    }
    private function buildSearchRecommendationReasonPrompt(ScrapedTool $tool, array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';

        return <<<PROMPT
Berikan satu kalimat singkat dalam bahasa Indonesia yang menjelaskan kenapa tool ini relevan untuk user. Jangan lebih dari 20 kata.

Konteks user:
- major: {$major}
- semester: {$semester}

Tool:
- name: {$tool->name}
- category: {$tool->category}
- description: {$tool->description}
PROMPT;
    }

    public function generateChatReply(string $message, array $contextTools): array
    {
        $contextStr = "";
        foreach ($contextTools as $index => $tool) {
            $contextStr .= ($index + 1) . ". Name: {$tool->name}, Description: {$tool->description}, Category: {$tool->category}, URL: {$tool->url}\n";
        }

        $systemPrompt = "Anda adalah asisten AI yang merekomendasikan alat untuk mahasiswa. Hanya gunakan tools yang ada di context berikut. Dilarang merekomendasikan tools lain. Jawab dalam bahasa Indonesia. \n\nContext Tools:\n" . ($contextStr ?: "Tidak ada alat spesifik yang ditemukan.");

        $response = $this->request(
            '/models/'.config('services.gemini.chat_model').':generateContent',
            [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $systemPrompt . "\n\nPertanyaan User:\n" . $message],
                        ],
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.4,
                ],
            ]
        );

        $rawText = data_get($response, 'candidates.0.content.parts.0.text');

        if (!is_string($rawText) || trim($rawText) === '') {
            throw new \RuntimeException('Gemini returned an empty chat response.');
        }

        return ['reply' => $rawText];
    }
}