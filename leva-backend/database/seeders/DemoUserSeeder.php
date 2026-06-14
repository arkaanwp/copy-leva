<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $userId = Str::uuid();
        $profileId = Str::uuid();

        // Demo user (password: password123)
        DB::table('users')->insert([
            'id'         => $userId,
            'name'       => 'Renisa Assyifa Putri',
            'email'      => 'renisa@demo.leva.id',
            'password'   => Hash::make('password123'),
            'status'     => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('user_profiles')->insert([
            'id'                  => $profileId,
            'user_id'             => $userId,
            'major'               => 'Teknik Informatika',
            'semester'            => 6,
            'language_preference' => 'id',
            'learning_style'      => 'visual',
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        // Demo task + sub-tasks
        $taskId = Str::uuid();
        DB::table('tasks_master')->insert([
            'task_id'     => $taskId,
            'user_id'     => $userId,
            'title'       => 'Menyusun Skripsi Teknik Informatika',
            'status'      => 'completed',
            'source_type' => 'text',
            'created_at'  => now()->subDays(3),
            'updated_at'  => now()->subDays(3),
        ]);

        $subTasks = [
            [
                'sub_task_id'          => Str::uuid(),
                'parent_task_id'       => $taskId,
                'actionable_title'     => 'Cari Topik',
                'description'          => 'Langkah pertama dan sangat krusial adalah mencari topik. Topik yang kamu pilih harus selinear dengan jurusan Teknik Informatika dan memiliki novelty yang jelas.',
                'tips'                 => 'Gunakan Perplexity AI untuk riset cepat: minta 5 topik skripsi terbaru, lalu lanjutkan dengan prompt "sertakan gap riset dan minimal 3 sumber 2022-2026".',
                'status'               => 'done',
                'category'             => 'Research',
                'estimated_duration'   => '1–2 hari',
                'recommended_tool_ids' => json_encode([1, 3, 7]),
                'order'                => 1,
                'created_at'           => now()->subDays(3),
                'updated_at'           => now()->subDays(2),
            ],
            [
                'sub_task_id'          => Str::uuid(),
                'parent_task_id'       => $taskId,
                'actionable_title'     => 'Cari Referensi atau Jurnal Terkait',
                'description'          => 'Setelah topik ditentukan, kumpulkan minimal 20–30 referensi dari jurnal ilmiah terindeks (Scopus, IEEE, ACM). Prioritaskan jurnal 5 tahun terakhir.',
                'tips'                 => 'Di Scite.ai, pakai fitur Smart Citations untuk cek apakah paper "supporting" atau "contrasting", lalu prioritaskan referensi yang paling sering didukung.',
                'status'               => 'next',
                'category'             => 'Academic',
                'estimated_duration'   => '3–5 hari',
                'recommended_tool_ids' => json_encode([1, 3, 9]),
                'order'                => 2,
                'created_at'           => now()->subDays(3),
                'updated_at'           => now()->subDays(3),
            ],
            [
                'sub_task_id'          => Str::uuid(),
                'parent_task_id'       => $taskId,
                'actionable_title'     => 'Menulis Draft',
                'description'          => 'Mulai dengan outline terlebih dahulu sebelum menulis draft penuh. Fokus pada BAB I (Pendahuluan) dan BAB II (Tinjauan Pustaka) dulu.',
                'tips'                 => 'Gunakan Notion AI untuk menyusun kerangka BAB, lalu cek kejelasan kalimat di Grammarly agar draft tetap akademik, runtut, dan minim repetisi.',
                'status'               => 'next',
                'category'             => 'Writing',
                'estimated_duration'   => '2–4 minggu',
                'recommended_tool_ids' => json_encode([5, 6, 2]),
                'order'                => 3,
                'created_at'           => now()->subDays(3),
                'updated_at'           => now()->subDays(3),
            ],
            [
                'sub_task_id'          => Str::uuid(),
                'parent_task_id'       => $taskId,
                'actionable_title'     => 'Parafrase',
                'description'          => 'Setelah draft selesai, pastikan setiap kalimat yang bersumber dari referensi sudah diparafrase dengan baik agar tidak terdeteksi sebagai plagiarisme.',
                'tips'                 => 'Pakai QuillBot mode Formal untuk variasi struktur kalimat, lalu revisi manual agar istilah teknis tetap akurat.',
                'status'               => 'next',
                'category'             => 'Writing',
                'estimated_duration'   => '3–5 hari',
                'recommended_tool_ids' => json_encode([5, 10]),
                'order'                => 4,
                'created_at'           => now()->subDays(3),
                'updated_at'           => now()->subDays(3),
            ],
            [
                'sub_task_id'          => Str::uuid(),
                'parent_task_id'       => $taskId,
                'actionable_title'     => 'Cek Similaritas',
                'description'          => 'Sebelum submit ke dosen pembimbing, wajib cek similaritas. Target persentase similaritas untuk skripsi Teknik Informatika umumnya di bawah 20%.',
                'tips'                 => 'Cek dulu dengan Copyleaks untuk skrining awal, lalu validasi final di Turnitin akun kampus. Fokus perbaikan pada blok teks merah yang panjang.',
                'status'               => 'next',
                'category'             => 'Academic',
                'estimated_duration'   => '1 hari',
                'recommended_tool_ids' => json_encode([3]),
                'order'                => 5,
                'created_at'           => now()->subDays(3),
                'updated_at'           => now()->subDays(3),
            ],
        ];

        DB::table('atomic_sub_tasks')->insert($subTasks);

        // Demo bookmarks untuk user ini
        $bookmarks = [
            [
                'id'               => Str::uuid(),
                'user_id'          => $userId,
                'tool_id'          => 1, // Perplexity AI
                'utility_priority' => 'must_try',
                'semantic_keywords'=> json_encode(['literature review', 'sumber terverifikasi', 'riset cepat', 'academic search', 'AI search']),
                'tagging_status'   => 'completed',
                'note'             => 'Digunakan untuk bab 2 skripsi',
                'created_at'       => now()->subDays(10),
                'updated_at'       => now()->subDays(10),
            ],
            [
                'id'               => Str::uuid(),
                'user_id'          => $userId,
                'tool_id'          => 3, // Scite.ai
                'utility_priority' => 'very_good',
                'semantic_keywords'=> json_encode(['jurnal', 'sitasi', 'peer review', 'referensi', 'paper']),
                'tagging_status'   => 'completed',
                'note'             => 'Alternatif Google Scholar yang lebih kontekstual',
                'created_at'       => now()->subDays(10),
                'updated_at'       => now()->subDays(10),
            ],
            [
                'id'               => Str::uuid(),
                'user_id'          => $userId,
                'tool_id'          => 6, // Notion AI
                'utility_priority' => 'must_try',
                'semantic_keywords'=> json_encode(['catatan', 'outline', 'workspace', 'template', 'organisir']),
                'tagging_status'   => 'completed',
                'note'             => 'Untuk template BAB I skripsi',
                'created_at'       => now()->subDays(15),
                'updated_at'       => now()->subDays(15),
            ],
            [
                'id'               => Str::uuid(),
                'user_id'          => $userId,
                'tool_id'          => 2, // GitHub Copilot
                'utility_priority' => 'must_try',
                'semantic_keywords'=> json_encode(['coding', 'autocomplete', 'debug', 'python', 'javascript']),
                'tagging_status'   => 'completed',
                'note'             => 'Wajib untuk praktikum',
                'created_at'       => now()->subDays(20),
                'updated_at'       => now()->subDays(20),
            ],
            [
                'id'               => Str::uuid(),
                'user_id'          => $userId,
                'tool_id'          => 5, // Grammarly
                'utility_priority' => 'very_good',
                'semantic_keywords'=> json_encode(['grammar', 'parafrase', 'writing', 'english', 'editing']),
                'tagging_status'   => 'completed',
                'note'             => 'Untuk proofreading tulisan berbahasa Inggris',
                'created_at'       => now()->subDays(25),
                'updated_at'       => now()->subDays(25),
            ],
            [
                'id'               => Str::uuid(),
                'user_id'          => $userId,
                'tool_id'          => 4, // Julius AI
                'utility_priority' => 'niche',
                'semantic_keywords'=> json_encode(['data analysis', 'visualisasi', 'spreadsheet', 'chart', 'statistik']),
                'tagging_status'   => 'completed',
                'note'             => 'Mau coba untuk analisis data skripsi',
                'created_at'       => now()->subDays(30),
                'updated_at'       => now()->subDays(30),
            ],
        ];

        DB::table('saved_libraries')->insert($bookmarks);

        // Demo chat conversation
        $conversationId = Str::uuid();
        DB::table('chat_conversations')->insert([
            'id'         => $conversationId,
            'user_id'    => $userId,
            'title'      => 'Bantu saya susun skripsi',
            'created_at' => now()->subDays(3),
            'updated_at' => now()->subDays(3),
        ]);

        DB::table('chat_messages')->insert([
            [
                'conversation_id'      => $conversationId,
                'role'                 => 'user',
                'content'              => 'Bantu aku susun skripsi untuk jurusan Teknik Informatika semester 6',
                'recommended_tool_ids' => null,
                'created_at'           => now()->subDays(3),
                'updated_at'           => now()->subDays(3),
            ],
            [
                'conversation_id'      => $conversationId,
                'role'                 => 'assistant',
                'content'              => 'Baik! Saya akan membantu kamu menyusun skripsi. Berikut adalah langkah-langkah atomik yang sudah saya buat berdasarkan standar akademik Teknik Informatika...',
                'recommended_tool_ids' => json_encode([1, 3, 7]),
                'created_at'           => now()->subDays(3),
                'updated_at'           => now()->subDays(3),
            ],
        ]);
    }
}
