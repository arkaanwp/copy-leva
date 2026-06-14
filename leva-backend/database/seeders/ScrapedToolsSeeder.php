<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ScrapedToolsSeeder extends Seeder
{
    public function run(): void
    {
        $tools = [
            [
                'name'        => 'Perplexity AI',
                'url'         => 'perplexity.ai',
                'description' => 'Mesin pencari berbasis AI dengan sumber terverifikasi. Ideal untuk literature review cepat. Cocok untuk mencari sumber awal tugas karena jawaban disertai sitasi yang bisa langsung dicek.',
                'category'    => 'Research',
                'pricing_type'=> 'freemium',
                'rating'      => 4.8,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'GitHub Copilot',
                'url'         => 'github.com/copilot',
                'description' => 'Asisten koding AI dari GitHub yang membantu autocomplete dan debug kode secara real-time. Produktif untuk pairing saat ngerjain praktikum atau project coding.',
                'category'    => 'Coding',
                'pricing_type'=> 'paid',
                'rating'      => 4.9,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Scite.ai',
                'url'         => 'scite.ai',
                'description' => 'Temukan dan evaluasi referensi ilmiah dengan konteks sitasi langsung dari paper aslinya. Membantu bedakan paper yang mendukung atau membantah temuan penelitian.',
                'category'    => 'Academic',
                'pricing_type'=> 'freemium',
                'rating'      => 4.6,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Julius AI',
                'url'         => 'julius.ai',
                'description' => 'Analisis data dan buat visualisasi hanya dengan upload spreadsheet dan bertanya dalam bahasa natural. Praktis untuk mahasiswa yang butuh insight data cepat tanpa coding panjang.',
                'category'    => 'Data',
                'pricing_type'=> 'freemium',
                'rating'      => 4.5,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Grammarly',
                'url'         => 'grammarly.com',
                'description' => 'Periksa grammar, tone, dan kejelasan tulisan akademikmu secara otomatis. Efektif untuk polishing laporan dan email akademik.',
                'category'    => 'Writing',
                'pricing_type'=> 'freemium',
                'rating'      => 4.7,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Notion AI',
                'url'         => 'notion.so',
                'description' => 'Workspace serba bisa dengan AI terintegrasi untuk nulis, organisir, dan merangkum catatan. Bagus untuk membuat workflow tugas dari brainstorming sampai checklist.',
                'category'    => 'Productivity',
                'pricing_type'=> 'freemium',
                'rating'      => 4.6,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Consensus',
                'url'         => 'consensus.app',
                'description' => 'Cari jawaban dari ribuan paper akademik peer-reviewed secara instan. Berfokus pada jawaban ringkas berbasis evidence dari jurnal ilmiah.',
                'category'    => 'Research',
                'pricing_type'=> 'free',
                'rating'      => 4.5,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Codeium',
                'url'         => 'codeium.com',
                'description' => 'Alternatif Copilot gratis dengan kemampuan koding AI multi-bahasa pemrograman. Pilihan ekonomis untuk auto-complete dan assist coding harian.',
                'category'    => 'Coding',
                'pricing_type'=> 'free',
                'rating'      => 4.4,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Elicit',
                'url'         => 'elicit.com',
                'description' => 'Otomatiskan literature review dan ekstraksi data dari paper ilmiah. Meringkas dan mengekstrak temuan paper dengan cepat untuk draft tinjauan pustaka.',
                'category'    => 'Academic',
                'pricing_type'=> 'freemium',
                'rating'      => 4.3,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'QuillBot',
                'url'         => 'quillbot.com',
                'description' => 'Alat parafrase dan ringkasan teks berbasis AI. Ideal untuk membantu mahasiswa merumuskan ulang kalimat akademik agar terhindar dari plagiarisme.',
                'category'    => 'Writing',
                'pricing_type'=> 'freemium',
                'rating'      => 4.5,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'ChatPDF',
                'url'         => 'chatpdf.com',
                'description' => 'Upload PDF dan langsung chat dengan isinya. Sangat berguna untuk memahami paper panjang, buku teks, atau dokumen akademik dengan cepat.',
                'category'    => 'Academic',
                'pricing_type'=> 'freemium',
                'rating'      => 4.4,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
            [
                'name'        => 'Tableau Public',
                'url'         => 'public.tableau.com',
                'description' => 'Platform visualisasi data interaktif yang gratis untuk publik. Cocok untuk mahasiswa yang perlu menyajikan data penelitian secara visual dan profesional.',
                'category'    => 'Data',
                'pricing_type'=> 'free',
                'rating'      => 4.6,
                'qdrant_uuid' => Str::uuid(),
                'scraped_at'  => now(),
            ],
        ];

        DB::table('scraped_tools')->insert($tools);
    }
}
