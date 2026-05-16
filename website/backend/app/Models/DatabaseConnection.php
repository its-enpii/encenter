<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DatabaseConnection extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'server_id',
        'label',
        'db_type',
        'db_host',
        'db_port',
        'db_name',
        'db_username',
        'db_password',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'db_port' => 'integer',
        'is_active' => 'boolean',
        'db_name' => 'encrypted',
        'db_username' => 'encrypted',
        'db_password' => 'encrypted',
    ];

    /**
     * Get the server that the database connection belongs to.
     */
    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }
}
