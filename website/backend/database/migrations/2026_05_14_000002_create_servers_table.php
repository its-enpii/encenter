<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('group_id')->nullable();
            $table->string('label', 100);
            $table->string('host', 255);
            $table->smallInteger('port')->default(22);
            $table->text('username'); // [encrypted]
            $table->string('auth_type', 20)->default('password'); // 'password' | 'private_key'
            $table->text('password')->nullable(); // [encrypted]
            $table->text('private_key')->nullable(); // [encrypted]
            $table->text('passphrase')->nullable(); // [encrypted]
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_connected')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('group_id')->references('id')->on('server_groups')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servers');
    }
};
