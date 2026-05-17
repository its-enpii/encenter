<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('webhook_settings', function (Blueprint $table) {
            $table->string('target_whatsapp_id', 100)->nullable()->after('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('webhook_settings', function (Blueprint $table) {
            $table->dropColumn('target_whatsapp_id');
        });
    }
};
