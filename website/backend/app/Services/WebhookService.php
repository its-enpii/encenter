<?php

namespace App\Services;

use App\Models\User;
use App\Models\WebhookSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookService
{
    /**
     * Send webhook payload to all active endpoints listening to the event.
     *
     * @param string $event
     * @param array $data
     * @param User $user
     * @return array Array of results
     */
    public function send(string $event, array $data, User $user): array
    {
        $settings = $user->webhookSettings()
            ->where('is_active', \Illuminate\Support\Facades\DB::raw('true'))
            ->get();

        $results = [];

        foreach ($settings as $setting) {
            // Check if this setting is listening to the event
            $events = $setting->events ?? [];
            if (!in_array($event, $events)) {
                continue;
            }

            $targetPhone = $setting->target_whatsapp_id ?: $user->phone_number;

            $payload = [
                'event' => $event,
                'timestamp' => now()->toIso8601ZuluString(),
                'phone_number' => $targetPhone,
                'data' => $data,
            ];

            $jsonPayload = json_encode($payload);
            $signature = hash_hmac('sha256', $jsonPayload, $setting->secret_key);

            try {
                $response = Http::withHeaders([
                    'X-Webhook-Signature' => 'hmac-sha256=' . $signature,
                    'X-Webhook-Event' => $event,
                    'Content-Type' => 'application/json',
                ])
                ->timeout(10)
                ->retry(2, 500, function ($exception, $request) {
                    return $exception instanceof \Illuminate\Http\Client\ConnectionException ||
                           ($exception instanceof \Illuminate\Http\Client\RequestException && $exception->response->serverError());
                })
                ->send('POST', $setting->webhook_url, [
                    'body' => $jsonPayload
                ]);

                $success = $response->successful();
                
                $results[] = [
                    'setting_id' => $setting->id,
                    'url' => $setting->webhook_url,
                    'success' => $success,
                    'status' => $response->status(),
                    'body' => $response->body()
                ];

                if (!$success) {
                    Log::warning("Webhook dispatch failed for setting {$setting->id}", [
                        'status' => $response->status(),
                        'response' => $response->body()
                    ]);
                }
            } catch (\Exception $e) {
                Log::error("Webhook dispatch exception for setting {$setting->id}: " . $e->getMessage());
                
                $results[] = [
                    'setting_id' => $setting->id,
                    'url' => $setting->webhook_url,
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }
}
