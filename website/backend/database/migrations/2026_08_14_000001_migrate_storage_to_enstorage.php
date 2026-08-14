<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename gdrive columns in backup_jobs if exists
        if (Schema::hasColumn('backup_jobs', 'gdrive_file_id')) {
            Schema::table('backup_jobs', function (Blueprint $table) {
                $table->renameColumn('gdrive_file_id', 'storage_file_id');
                $table->renameColumn('gdrive_file_url', 'storage_file_url');
            });
        }

        // Update user_storages for EnStorage provider
        Schema::table('user_storages', function (Blueprint $table) {
            if (!Schema::hasColumn('user_storages', 'enstorage_url')) {
                $table->text('enstorage_url')->nullable()->after('email');
            }
            if (!Schema::hasColumn('user_storages', 'api_key')) {
                $table->text('api_key')->nullable()->after('enstorage_url');
            }
        });

        // Drop old Google-specific columns if they exist
        $colsToDrop = [];
        foreach (['access_token', 'refresh_token', 'expires_at'] as $col) {
            if (Schema::hasColumn('user_storages', $col)) {
                $colsToDrop[] = $col;
            }
        }
        if (!empty($colsToDrop)) {
            Schema::table('user_storages', function (Blueprint $table) use ($colsToDrop) {
                $table->dropColumn($colsToDrop);
            });
        }

        // Clear any old google_drive rows that do not have enstorage credentials
        \Illuminate\Support\Facades\DB::table('user_storages')
            ->whereNull('api_key')
            ->orWhereNull('enstorage_url')
            ->delete();
    }

    public function down(): void
    {
        if (Schema::hasColumn('backup_jobs', 'storage_file_id')) {
            Schema::table('backup_jobs', function (Blueprint $table) {
                $table->renameColumn('storage_file_id', 'gdrive_file_id');
                $table->renameColumn('storage_file_url', 'gdrive_file_url');
            });
        }

        Schema::table('user_storages', function (Blueprint $table) {
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
        });

        Schema::table('user_storages', function (Blueprint $table) {
            $table->dropColumn(['enstorage_url', 'api_key']);
        });
    }
};
