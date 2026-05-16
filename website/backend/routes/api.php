<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;

Route::prefix('v1')->group(function () {
    // Public routes
    Route::post('/auth/login', [AuthController::class, 'login'])->name('auth.login');

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::put('/auth/profile', [AuthController::class, 'updateProfile'])->name('auth.profile');

        // Phase 2: Credential Vault
        Route::apiResource('server-groups', \App\Http\Controllers\Api\V1\ServerGroupController::class);
        
        Route::apiResource('servers', \App\Http\Controllers\Api\V1\ServerController::class);
        Route::post('servers/{id}/test', [\App\Http\Controllers\Api\V1\ServerController::class, 'testConnection']);
        
        Route::apiResource('database-connections', \App\Http\Controllers\Api\V1\DatabaseConnectionController::class);
        Route::post('database-connections/{id}/test', [\App\Http\Controllers\Api\V1\DatabaseConnectionController::class, 'testConnection']);

        Route::get('audit-logs', [\App\Http\Controllers\Api\V1\ActivityLogController::class, 'index']);
    });
});
