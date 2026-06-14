<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('atomic_sub_tasks', function (Blueprint $table) {
            $table->uuid('sub_task_id')->primary();
            $table->uuid('parent_task_id');
            $table->string('actionable_title');              // judul_tugas dari output LLM
            $table->text('description')->nullable();
            $table->text('tips')->nullable();                // prompt engineering tips per sub-task
            $table->enum('status', ['done', 'next'])->default('next')->index();
            $table->string('category')->nullable();          // kategori_alat_ai_yang_rekomendasi dari LLM
            $table->string('estimated_duration')->nullable(); // estimasi_waktu dari output LLM
            $table->json('recommended_tool_ids')->nullable(); // array of scraped_tools.id dari Qdrant query
            $table->tinyInteger('order')->default(1);
            $table->timestamps();

            $table->foreign('parent_task_id')
                ->references('task_id')
                ->on('tasks_master')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('atomic_sub_tasks');
    }
};
