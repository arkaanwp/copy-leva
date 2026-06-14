<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scraped_tools', function (Blueprint $table) {
            $table->id(); // BIGINT auto-increment sebagai PK (sesuai spesifikasi)
            $table->string('name');
            $table->string('url')->unique();
            $table->text('description')->nullable();
            $table->string('category')->nullable();         // Research, Writing, Coding, Data, Academic, Productivity
            $table->string('pricing_type')->default('freemium'); // free, freemium, paid, opensource
            $table->decimal('rating', 3, 1)->nullable();
            $table->uuid('qdrant_uuid')->nullable()->unique(); // join anchor ke koleksi Qdrant tools_semantic_vectors
            $table->timestamp('scraped_at')->nullable();
            $table->timestamps();

            $table->index('category');
            $table->index('pricing_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scraped_tools');
    }
};
