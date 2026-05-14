<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('database_connections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('server_id');
            $table->string('label', 100);
            $table->string('db_type', 20)->default('mysql');
            $table->string('db_host', 255)->default('127.0.0.1');
            $table->smallInteger('db_port')->default(3306);
            $table->text('db_name'); // [encrypted]
            $table->text('db_username'); // [encrypted]
            $table->text('db_password'); // [encrypted]
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('server_id')->references('id')->on('servers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('database_connections');
    }
};
