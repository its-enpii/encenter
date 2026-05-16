<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backup_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('db_connection_id')->nullable();
            $table->string('triggered_by', 20); // 'manual' | 'api'
            $table->uuid('triggered_by_user')->nullable();
            $table->string('status', 20)->default('pending'); // 'pending'|'running'|'success'|'failed'
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->string('file_name', 255)->nullable();
            $table->bigInteger('file_size_bytes')->nullable();
            $table->string('gdrive_file_id', 255)->nullable();
            $table->text('gdrive_file_url')->nullable();
            $table->boolean('webhook_sent')->default(false);
            $table->timestamp('webhook_sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('db_connection_id')->references('id')->on('database_connections')->onDelete('set null');
            $table->foreign('triggered_by_user')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_jobs');
    }
};
