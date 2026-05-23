<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * The `gdrive_credentials` table was created early in development and was
 * later replaced by `user_storages` which stores the same OAuth payload but
 * also tracks the Drive folder and a generic `provider` column. The legacy
 * table has had no readers or writers in the application since that switch.
 * Drop it so future operators do not assume it is authoritative.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('gdrive_credentials');
    }

    public function down(): void
    {
        // Intentionally non-restorable. If the legacy table is ever needed,
        // re-run the original migration `2026_05_14_000005_create_gdrive_credentials_table`.
    }
};
