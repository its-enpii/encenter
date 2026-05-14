<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gdrive_credentials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->text('access_token'); // [encrypted]
            $table->text('refresh_token'); // [encrypted]
            $table->string('token_type', 50)->default('Bearer');
            $table->timestamp('expires_at')->nullable();
            $table->text('scope')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gdrive_credentials');
    }
};
