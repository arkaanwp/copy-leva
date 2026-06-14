<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_libraries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->unsignedBigInteger('tool_id');

            // 4 kuadran utilitas sesuai spesifikasi REQ-F05 (Section 4.4):
            // must_try   = Wajib Dicoba   (fungsionalitas game-changer untuk jurusan)
            // very_good  = Sangat Bagus   (efisiensi tinggi)
            // niche      = Bagus/Niche    (situasional atau tugas spesifik)
            // optional   = Opsional/Alternatif (duplikasi fungsional dari alat lebih kuat)
            $table->enum('utility_priority', ['must_try', 'very_good', 'niche', 'optional'])
                  ->default('very_good')
                  ->index();

            // Dipaksa berisi tepat 5 kata kunci semantik oleh LLM (REQ-F05)
            $table->json('semantic_keywords')->nullable();

            $table->enum('tagging_status', ['pending', 'completed', 'failed'])
                  ->default('pending')
                  ->index();

            $table->text('note')->nullable(); // catatan manual dari user

            $table->timestamps();

            // Satu user tidak bisa bookmark alat yang sama dua kali
            $table->unique(['user_id', 'tool_id']);

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('tool_id')
                ->references('id')
                ->on('scraped_tools')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_libraries');
    }
};
