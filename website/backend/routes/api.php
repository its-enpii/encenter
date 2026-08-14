<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\StorageController;
use App\Http\Controllers\Api\V1\BackupController;
use App\Http\Controllers\Api\V1\SshTerminalController;

Route::prefix('v1')->group(function () {
    // Public routes
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');

    // Protected routes
    Route::middleware('auth.api')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::put('/auth/profile', [AuthController::class, 'updateProfile'])->name('auth.profile');

        
        // SSH & SFTP Terminal Gateway
        Route::post('servers/{id}/ssh/exec', [SshTerminalController::class, 'execute']);
        Route::get('servers/{id}/sftp/ls', [SshTerminalController::class, 'listFiles']);
        Route::get('servers/{id}/sftp/read', [SshTerminalController::class, 'readFile']);
        Route::post('servers/{id}/sftp/write', [SshTerminalController::class, 'writeFile']);
        Route::post('servers/{id}/sftp/mkdir', [SshTerminalController::class, 'makeDirectory']);
        Route::delete('servers/{id}/sftp/delete', [SshTerminalController::class, 'deleteItem']);
        Route::post('servers/{id}/sftp/upload', [SshTerminalController::class, 'uploadFile']);
        // Phase 2: Credential Vault
        Route::apiResource('servers', \App\Http\Controllers\Api\V1\ServerController::class);
        Route::post('servers/{id}/test', [\App\Http\Controllers\Api\V1\ServerController::class, 'testConnection']);
        Route::get('servers/{id}/credentials', [\App\Http\Controllers\Api\V1\ServerController::class, 'credentials']);
        
        Route::apiResource('database-connections', \App\Http\Controllers\Api\V1\DatabaseConnectionController::class);
        Route::get('servers/{id}/reveal', [\App\Http\Controllers\Api\V1\ServerController::class, 'reveal']);
        Route::get('database-connections/{id}/reveal', [\App\Http\Controllers\Api\V1\DatabaseConnectionController::class, 'reveal']);

        Route::post('database-connections/{id}/test', [\App\Http\Controllers\Api\V1\DatabaseConnectionController::class, 'testConnection']);
        Route::get('database-connections/{id}/credentials', [\App\Http\Controllers\Api\V1\DatabaseConnectionController::class, 'credentials']);

        Route::get('audit-logs', [\App\Http\Controllers\Api\V1\ActivityLogController::class, 'index']);
        Route::post('audit-logs/purge', [\App\Http\Controllers\Api\V1\ActivityLogController::class, 'purge']);

        // Phase 3: Backup Engine — EnStorage
        Route::get('storage', [StorageController::class, 'index']);
        Route::post('storage/settings', [StorageController::class, 'updateSettings']);
        Route::post('storage/connect', [StorageController::class, 'connect']);
        Route::delete('storage', [StorageController::class, 'disconnect']);
        Route::post('storage/cleanup', [StorageController::class, 'cleanup']);

        // Backup Actions
        Route::get('backups', [BackupController::class, 'index']);
        Route::post('backups/run', [BackupController::class, 'run'])->middleware('throttle:backup');
        Route::get('backups/{id}', [BackupController::class, 'show']);
        Route::post('backups/{id}/resend-webhook', [BackupController::class, 'resendWebhook']);

        // Phase 4: Webhooks
        Route::apiResource('webhooks', \App\Http\Controllers\Api\V1\WebhookSettingController::class);
        Route::post('webhooks/{id}/test', [\App\Http\Controllers\Api\V1\WebhookSettingController::class, 'test']);
    });
});
