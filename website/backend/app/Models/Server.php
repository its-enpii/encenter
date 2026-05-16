<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Server extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'group_id',
        'label',
        'host',
        'port',
        'username',
        'auth_type',
        'password',
        'private_key',
        'passphrase',
        'notes',
        'is_active',
        'last_connected',
    ];

    protected $casts = [
        'port' => 'integer',
        'is_active' => 'boolean',
        'last_connected' => 'datetime',
        'username' => 'encrypted',
        'password' => 'encrypted',
        'private_key' => 'encrypted',
        'passphrase' => 'encrypted',
    ];

    /**
     * Get the user that owns the server.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the group that the server belongs to.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ServerGroup::class, 'group_id');
    }

    /**
     * Get the database connections for the server.
     */
    public function databaseConnections(): HasMany
    {
        return $this->hasMany(DatabaseConnection::class);
    }
}
