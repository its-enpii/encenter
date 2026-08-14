<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BackupJob extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'db_connection_id',
        'triggered_by',
        'triggered_by_user',
        'status',
        'started_at',
        'finished_at',
        'duration_seconds',
        'file_name',
        'file_size_bytes',
        'storage_file_id',
        'storage_file_url',
        'webhook_sent',
        'webhook_sent_at',
        'error_message',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'webhook_sent' => 'boolean',
        'webhook_sent_at' => 'datetime',
        'duration_seconds' => 'integer',
        'file_size_bytes' => 'integer',
    ];

    public function databaseConnection()
    {
        return $this->belongsTo(DatabaseConnection::class, 'db_connection_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'triggered_by_user');
    }
}
