<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action',
        'resource',
        'resource_id',
        'meta',
        'ip_address',
    ];

    protected $casts = [
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Helper to log an activity.
     */
    public static function log(string $action, string $resource, ?string $resourceId = null, array $meta = [])
    {
        return self::create([
            'user_id' => \Illuminate\Support\Facades\Auth::id(),
            'action' => $action,
            'resource' => $resource,
            'resource_id' => $resourceId,
            'meta' => $meta,
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }
}
