<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookSetting extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'target_whatsapp_id',
        'webhook_url',
        'secret_key',
        'is_active',
        'events',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'events' => 'array',
        'secret_key' => 'encrypted',
    ];

    /**
     * Get the user that owns the webhook setting.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
