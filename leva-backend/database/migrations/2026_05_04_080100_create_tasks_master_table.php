<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks_master', function (Blueprint $table) {
            $table->uuid('task_id')->primary();
            $table->uuid('user_id');
            $table->string('title')->nullable();            // diisi LLM setelah dekomposisi
            $table->enum('status', ['processing', 'completed', 'failed'])->default('processing')->index();
            $table->enum('source_type', ['text', 'pdf'])->default('text');
            $table->string('source_pdf_hash', 64)->nullable(); // SHA-256 hash PDF untuk deduplication
            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks_master');
    }
};
