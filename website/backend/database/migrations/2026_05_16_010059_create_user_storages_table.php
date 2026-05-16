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
        Schema::create('user_storages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('provider')->default('google_drive');
            $table->string('email')->nullable();
            $table->text('access_token')->nullable(); // Will be encrypted via model casts
            $table->text('refresh_token')->nullable(); // Will be encrypted via model casts
            $table->timestamp('expires_at')->nullable();
            $table->string('folder_id')->nullable();
            $table->string('folder_name')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_storages');
    }
};
