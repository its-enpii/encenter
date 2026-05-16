<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class UserStorage extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'provider',
        'email',
        'access_token',
        'refresh_token',
        'expires_at',
        'folder_id',
        'folder_name',
        'is_active',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
