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
        'enstorage_url',
        'api_key',
        'folder_id',
        'folder_name',
        'is_active',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'api_key',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
