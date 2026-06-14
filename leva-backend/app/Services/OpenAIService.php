<?php

namespace App\Services;

use App\Models\ScrapedTool;
use OpenAI\Laravel\Facades\OpenAI;
use Illuminate\Support\Str;
use RuntimeException;

class OpenAIService
{
    public function embedText(string $text): array
    {
        $apiKey = config('openai.api_key');
        if (empty($apiKey)) {
            return array_fill(0, 1536, 0.0);
        }

        try {
            $response = OpenAI::embeddings()->create([
                'model' => config('services.openai.embedding_model'),
                'input' => $text,
            ]);

            return $response->embeddings[0]->embedding ?? [];
        } catch (\Throwable $e) {
            return array_fill(0, 1536, 0.0);
        }
    }

    public function decomposeTask(string $text, array $userProfile): array
    {
        $apiKey = config('openai.api_key');
        if (!empty($apiKey)) {
            try {
                $response = OpenAI::responses()->create([
                    'model' => config('services.openai.chat_model'),
                    'input' => [[
                        'role' => 'system',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => $this->buildSystemPrompt($userProfile),
                        ]],
                    ], [
                        'role' => 'user',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => $text,
                        ]],
                    ]],
                    'text' => [
                        'format' => [
                            'type' => 'json_schema',
                            'name' => 'task_decomposition',
                            'strict' => true,
                            'schema' => [
                                'type' => 'object',
                                'additionalProperties' => false,
                                'required' => ['title', 'sub_tasks'],
                                'properties' => [
                                    'title' => [
                                        'type' => 'string',
                                    ],
                                    'sub_tasks' => [
                                        'type' => 'array',
                                        'minItems' => 3,
                                        'maxItems' => 6,
                                        'items' => [
                                            'type' => 'object',
                                            'additionalProperties' => false,
                                            'required' => [
                                                'judul_tugas',
                                                'deskripsi',
                                                'tips',
                                                'estimasi_waktu',
                                                'kategori_alat_ai_yang_rekomendasi',
                                            ],
                                            'properties' => [
                                                'judul_tugas' => ['type' => 'string'],
                                                'deskripsi' => ['type' => 'string'],
                                                'tips' => ['type' => 'string'],
                                                'estimasi_waktu' => ['type' => 'string'],
                                                'kategori_alat_ai_yang_rekomendasi' => [
                                                    'type' => 'string',
                                                    'enum' => ['Research', 'Writing', 'Coding', 'Data', 'Academic', 'Productivity'],
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'temperature' => 0.4,
                    'max_output_tokens' => 1400,
                ]);

                $rawText = $response->outputText;

                if (is_string($rawText) && trim($rawText) !== '') {
                    $decoded = json_decode($rawText, true);

                    if (is_array($decoded) && isset($decoded['title'], $decoded['sub_tasks']) && is_array($decoded['sub_tasks'])) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {
                // Fail silently and proceed to fallback
            }
        }

        // Local Heuristic Fallback Task Decomposition
        $title = "Rencana Tugas: " . Str::limit($text, 40);
        $subTasks = [];

        $textLower = strtolower($text);
        if (str_contains($textLower, 'code') || str_contains($textLower, 'web') || str_contains($textLower, 'program') || str_contains($textLower, 'aplikasi') || str_contains($textLower, 'react') || str_contains($textLower, 'laravel')) {
            $subTasks = [
                [
                    'judul_tugas' => 'Riset Kebutuhan Sistem & Desain Arsitektur',
                    'deskripsi' => 'Analisis kebutuhan proyek pengembangan software Anda dan susun spesifikasi arsitektur teknis.',
                    'tips' => 'Gunakan diagram terstruktur untuk memvisualisasikan relasi database.',
                    'estimasi_waktu' => '25 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Research',
                ],
                [
                    'judul_tugas' => 'Penulisan Kode & Struktur Komponen Utama',
                    'deskripsi' => 'Buat struktur kode dasar dan implementasikan komponen-komponen inti program sesuai arsitektur.',
                    'tips' => 'Gunakan modular programming untuk mempermudah unit testing.',
                    'estimasi_waktu' => '30 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Coding',
                ],
                [
                    'judul_tugas' => 'Debugging & Refactoring Kode',
                    'deskripsi' => 'Periksa kesalahan pada logika pemrograman dan lakukan optimasi struktur kode.',
                    'tips' => 'Lakukan pengujian secara bertahap untuk melokalisir error.',
                    'estimasi_waktu' => '20 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Coding',
                ],
            ];
        } elseif (str_contains($textLower, 'data') || str_contains($textLower, 'analis') || str_contains($textLower, 'grafik') || str_contains($textLower, 'statistik') || str_contains($textLower, 'excel')) {
            $subTasks = [
                [
                    'judul_tugas' => 'Pembersihan dan Pra-pemrosesan Data',
                    'deskripsi' => 'Periksa data mentah dari duplikasi atau nilai yang hilang, lalu lakukan normalisasi.',
                    'tips' => 'Simpan salinan data asli sebelum melakukan manipulasi.',
                    'estimasi_waktu' => '20 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Data',
                ],
                [
                    'judul_tugas' => 'Analisis Statistik & Deskriptif',
                    'deskripsi' => 'Lakukan analisis deskriptif untuk melihat korelasi antar variabel utama data Anda.',
                    'tips' => 'Fokus pada pola atau anomali data yang menarik.',
                    'estimasi_waktu' => '25 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Data',
                ],
                [
                    'judul_tugas' => 'Visualisasi dan Penyusunan Laporan',
                    'deskripsi' => 'Buat grafik representatif dan tulis interpretasi hasil analisis data secara ringkas.',
                    'tips' => 'Pilih jenis diagram yang paling mudah dipahami untuk audiens Anda.',
                    'estimasi_waktu' => '20 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Writing',
                ],
            ];
        } else {
            $subTasks = [
                [
                    'judul_tugas' => 'Riset Literatur & Pengumpulan Bahan',
                    'deskripsi' => 'Cari referensi ilmiah, jurnal kredibel, atau materi pendukung yang relevan dengan topik tugas.',
                    'tips' => 'Gunakan kata kunci pencarian yang spesifik untuk mempersempit hasil.',
                    'estimasi_waktu' => '20 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Research',
                ],
                [
                    'judul_tugas' => 'Penyusunan Outline & Kerangka Berpikir',
                    'deskripsi' => 'Buat struktur penulisan atau outline bab demi bab agar alur pembahasan logis dan teratur.',
                    'tips' => 'Pastikan setiap poin utama memiliki argumen pendukung yang kuat.',
                    'estimasi_waktu' => '15 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Academic',
                ],
                [
                    'judul_tugas' => 'Penulisan Draft Utama',
                    'deskripsi' => 'Tulis konten secara detail berdasarkan kerangka yang telah dibuat sebelumnya.',
                    'tips' => 'Tulis saja dulu tanpa terlalu sering mengedit ejaan secara real-time.',
                    'estimasi_waktu' => '30 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Writing',
                ],
                [
                    'judul_tugas' => 'Penyelarasan & Cek Plagiarisme',
                    'deskripsi' => 'Lakukan proofreading, cek keselarasan kalimat, dan pastikan sitasi ditulis dengan benar.',
                    'tips' => 'Baca ulang dengan suara keras untuk mendeteksi kalimat yang janggal.',
                    'estimasi_waktu' => '15 menit',
                    'kategori_alat_ai_yang_rekomendasi' => 'Academic',
                ],
            ];
        }

        return [
            'title' => $title,
            'sub_tasks' => $subTasks,
        ];
    }

    public function classifyBookmark(ScrapedTool $tool, array $userProfile): array
    {
        $apiKey = config('openai.api_key');
        if (!empty($apiKey)) {
            try {
                $response = OpenAI::responses()->create([
                    'model' => config('services.openai.chat_model'),
                    'input' => [[
                        'role' => 'system',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => $this->buildBookmarkSystemPrompt($userProfile),
                        ]],
                    ], [
                        'role' => 'user',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => $this->buildBookmarkToolPrompt($tool),
                        ]],
                    ]],
                    'text' => [
                        'format' => [
                            'type' => 'json_schema',
                            'name' => 'bookmark_classification',
                            'strict' => true,
                            'schema' => [
                                'type' => 'object',
                                'additionalProperties' => false,
                                'required' => ['utility_priority', 'semantic_keywords'],
                                'properties' => [
                                    'utility_priority' => [
                                        'type' => 'string',
                                        'enum' => ['must_try', 'very_good', 'niche', 'optional'],
                                    ],
                                    'semantic_keywords' => [
                                        'type' => 'array',
                                        'minItems' => 5,
                                        'maxItems' => 5,
                                        'items' => [
                                            'type' => 'string',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'temperature' => 0.2,
                    'max_output_tokens' => 300,
                ]);

                $rawText = $response->outputText;

                if (is_string($rawText) && trim($rawText) !== '') {
                    $decoded = json_decode($rawText, true);
                    if (
                        is_array($decoded) &&
                        isset($decoded['utility_priority'], $decoded['semantic_keywords']) &&
                        is_array($decoded['semantic_keywords']) &&
                        count($decoded['semantic_keywords']) === 5
                    ) {
                        return [
                            'utility_priority' => $decoded['utility_priority'],
                            'semantic_keywords' => array_values($decoded['semantic_keywords']),
                        ];
                    }
                }
            } catch (\Throwable $e) {
                // Fail silently and proceed to fallback
            }
        }

        // Local Heuristic Fallback
        $priority = 'very_good';
        if ($tool->rating >= 4.5) {
            $priority = 'must_try';
        } elseif ($tool->rating < 3.5) {
            $priority = 'optional';
        }

        return [
            'utility_priority' => $priority,
            'semantic_keywords' => [
                'AI Tool',
                $tool->category ?: 'Productivity',
                strtolower($tool->name),
                'Academic',
                'Helper'
            ],
        ];
    }

    public function generateSearchRecommendationReason(ScrapedTool $tool, array $userProfile): string
    {
        $apiKey = config('openai.api_key');
        if (!empty($apiKey)) {
            try {
                $response = OpenAI::responses()->create([
                    'model' => config('services.openai.chat_model'),
                    'input' => [[
                        'role' => 'system',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => 'Berikan satu kalimat singkat dalam bahasa Indonesia yang menjelaskan kenapa tool ini relevan untuk user. Jangan lebih dari 20 kata.',
                        ]],
                    ], [
                        'role' => 'user',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => sprintf(
                                "major: %s\nsemester: %s\ntool: %s\ncategory: %s\ndescription: %s",
                                $userProfile['major'] ?? 'Mahasiswa',
                                $userProfile['semester'] ?? 'tidak diketahui',
                                $tool->name,
                                $tool->category,
                                $tool->description
                            ),
                        ]],
                    ]],
                    'max_output_tokens' => 60,
                    'temperature' => 0.2,
                ]);

                $reason = trim($response->outputText ?? '');
                if ($reason !== '') {
                    return $reason;
                }
            } catch (\Throwable $e) {
                // Fail silently and proceed to fallback
            }
        }

        return "Alat AI kategori {$tool->category} ini sangat membantu pengerjaan tugas program studi " . ($userProfile['major'] ?? 'mahasiswa') . ".";
    }

    public function generateChatReply(string $message, array $contextTools, string $language = 'id'): array
    {
        $apiKey = config('openai.api_key');
        if (!empty($apiKey)) {
            try {
                $context = collect($contextTools)
                    ->values()
                    ->map(function (ScrapedTool $tool, int $index) {
                        return sprintf(
                            "%d. Name: %s | Category: %s | URL: %s | Description: %s",
                            $index + 1,
                            $tool->name,
                            $tool->category,
                            $tool->url,
                            $tool->description
                        );
                    })
                    ->implode("\n");

                $targetLanguage = $language === 'en' ? 'English' : 'Bahasa Indonesia';

                $response = OpenAI::responses()->create([
                    'model' => config('services.openai.chat_model'),
                    'input' => [[
                        'role' => 'system',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => "Anda adalah asisten rekomendasi alat AI untuk mahasiswa. Hanya gunakan tools yang ada di context berikut. Dilarang merekomendasikan tools lain. Jawab dalam {$targetLanguage}. Jika context tidak cukup, katakan secara jujur.",
                        ]],
                    ], [
                        'role' => 'user',
                        'content' => [[
                            'type' => 'input_text',
                            'text' => "Context Tools:\n{$context}\n\nPertanyaan User:\n{$message}",
                        ]],
                    ]],
                    'max_output_tokens' => 400,
                    'temperature' => 0.4,
                ]);

                $reply = trim($response->outputText ?? '');
                if ($reply !== '') {
                    return ['reply' => $reply];
                }
            } catch (\Throwable $e) {
                // Fail silently and proceed to fallback
            }
        }

        // Local Heuristic Fallback
        $reply = $language === 'en'
            ? "Based on your interest in \"" . Str::limit($message, 40) . "\", here are the AI tools recommended from our scraper database:\n\n"
            : "Berdasarkan pertanyaan Anda mengenai \"" . Str::limit($message, 40) . "\", berikut adalah beberapa rekomendasi tool AI terverifikasi dari database kami:\n\n";

        foreach ($contextTools as $index => $tool) {
            $reply .= sprintf(
                "**%d. %s** (%s)\n*Kategori: %s | Tipe Pricing: %s*\n%s\n\n",
                $index + 1,
                $tool->name,
                $tool->url,
                $tool->category,
                $tool->pricing_type,
                $tool->description
            );
        }

        $reply .= $language === 'en'
            ? "I hope these recommendations are useful for your academic work!"
            : "Semoga rekomendasi tool AI di atas dapat membantu mempermudah pengerjaan tugas Anda!";

        return ['reply' => $reply];
    }

    private function buildSystemPrompt(array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';
        $language = $userProfile['language_preference'] ?? 'id';

        return <<<PROMPT
Anda adalah insinyur alur kerja perilaku yang mensintesis metodologi Atomic Habits dengan pola KERNEL.

Konteks user:
- major: {$major}
- semester: {$semester}
- language_preference: {$language}

Aturan wajib:
- Pecah menjadi minimal 3 dan maksimal 6 sub-task.
- Setiap sub-task harus konkret, actionable, dan cukup kecil untuk dimulai sekarang juga.
- Setiap sub-task harus realistis diselesaikan dalam kurang dari 30 menit.
- Tulis deskripsi 2-3 kalimat.
- Tulis tips 1-2 kalimat yang konkret.
- kategori_alat_ai_yang_rekomendasi harus salah satu: Research, Writing, Coding, Data, Academic, Productivity.
- Judul keseluruhan harus ringkas dan relevan dengan tugas user.
- Balas hanya JSON valid sesuai schema.
PROMPT;
    }

    private function buildBookmarkSystemPrompt(array $userProfile): string
    {
        $major = $userProfile['major'] ?? 'Mahasiswa';
        $semester = $userProfile['semester'] ?? 'tidak diketahui';
        $language = $userProfile['language_preference'] ?? 'id';

        return <<<PROMPT
Anda adalah agen auditor utilitas alat AI untuk mahasiswa dengan pola KERNEL.

Konteks user:
- major: {$major}
- semester: {$semester}
- language_preference: {$language}

Aturan wajib:
- utility_priority harus salah satu: must_try, very_good, niche, optional.
- semantic_keywords harus berisi tepat 5 string unik.
- Nilai prioritas harus mempertimbangkan relevansi nyata untuk mahasiswa, kemudahan mulai, dan potensi dampak.
- Balas hanya JSON valid sesuai schema.
PROMPT;
    }

    private function buildBookmarkToolPrompt(ScrapedTool $tool): string
    {
        return <<<PROMPT
Klasifikasikan tool berikut:
- name: {$tool->name}
- category: {$tool->category}
- pricing_type: {$tool->pricing_type}
- description: {$tool->description}
PROMPT;
    }
}
