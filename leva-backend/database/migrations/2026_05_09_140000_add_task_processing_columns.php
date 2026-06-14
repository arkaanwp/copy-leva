<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks_master', function (Blueprint $table) {
            $table->longText('source_text')->nullable()->after('source_pdf_hash');
            $table->text('source_description')->nullable()->after('source_text');
            $table->string('source_file_path')->nullable()->after('source_description');
            $table->text('error_message')->nullable()->after('source_file_path');
        });
    }

    public function down(): void
    {
        Schema::table('tasks_master', function (Blueprint $table) {
            $table->dropColumn([
                'source_text',
                'source_description',
                'source_file_path',
                'error_message',
            ]);
        });
    }
};
