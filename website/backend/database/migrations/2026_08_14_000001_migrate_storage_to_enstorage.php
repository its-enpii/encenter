<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename gdrive columns in backup_jobs
        Schema::table('backup_jobs', function (Blueprint $table) {
            $table->renameColumn('gdrive_file_id', 'storage_file_id');
            $table->renameColumn('gdrive_file_url', 'storage_file_url');
        });

        // Update user_storages for EnStorage provider
        Schema::table('user_storages', function (Blueprint $table) {
            $table->text('enstorage_url')->nullable()->after('email');
            $table->text('api_key')->nullable()->after('enstorage_url');
        });

        // Migrate existing data: change provider from google_drive to enstorage
        \Illuminate\Support\Facades\DB::table('user_storages')
            ->where('provider', 'google_drive')
            ->update(['provider' => 'enstorage']);

        // Drop old Google-specific columns (access_token, refresh_token, expires_at)
        Schema::table('user_storages', function (Blueprint $table) {
            $table->dropColumn(['access_token', 'refresh_token', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::table('backup_jobs', function (Blueprint $table) {
            $table->renameColumn('storage_file_id', 'gdrive_file_id');
            $table->renameColumn('storage_file_url', 'gdrive_file_url');
        });

        Schema::table('user_storages', function (Blueprint $table) {
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
        });

        Schema::table('user_storages', function (Blueprint $table) {
            $table->dropColumn(['enstorage_url', 'api_key']);
        });

        \Illuminate\Support\Facades\DB::table('user_storages')
            ->where('provider', 'enstorage')
            ->update(['provider' => 'google_drive']);
    }
};
