<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\WebhookSetting;
use App\Services\WebhookService;
use Illuminate\Http\Request;

class WebhookSettingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $settings = $request->user()->webhookSettings()->latest()->get();
        return response()->json(['data' => $settings]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'target_whatsapp_id' => 'nullable|string|max:100',
            'webhook_url' => 'required|url',
            'secret_key' => 'required|string',
            'is_active' => 'boolean',
            'events' => 'nullable|array',
        ]);

        $validated['is_active'] = $request->boolean('is_active') 
            ? \Illuminate\Support\Facades\DB::raw('true') 
            : \Illuminate\Support\Facades\DB::raw('false');

        $setting = $request->user()->webhookSettings()->create($validated);

        return response()->json($setting, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        $setting = $request->user()->webhookSettings()->findOrFail($id);
        return response()->json($setting);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $setting = $request->user()->webhookSettings()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'target_whatsapp_id' => 'nullable|string|max:100',
            'webhook_url' => 'sometimes|url',
            'secret_key' => 'sometimes|string',
            'is_active' => 'boolean',
            'events' => 'nullable|array',
        ]);

        if (isset($validated['is_active'])) {
            $validated['is_active'] = $request->boolean('is_active') 
                ? \Illuminate\Support\Facades\DB::raw('true') 
                : \Illuminate\Support\Facades\DB::raw('false');
        }

        $setting->update($validated);

        return response()->json($setting);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        $setting = $request->user()->webhookSettings()->findOrFail($id);
        $setting->delete();

        return response()->json(null, 204);
    }

    /**
     * Test a specific webhook setting.
     */
    public function test(Request $request, string $id, WebhookService $webhookService)
    {
        $setting = $request->user()->webhookSettings()->findOrFail($id);

        // Temporarily override the events so we can guarantee it gets triggered if active.
        // Wait, WebhookService loops through all active user settings that match the event.
        // Instead of using WebhookService->send() for everything, for the test we should just trigger a manual send.
        // Let's create the payload manually for the test.
        $payload = [
            'event' => 'test',
            'timestamp' => now()->toIso8601ZuluString(),
            'phone_number' => $request->user()->phone_number,
            'data' => [
                'message' => 'This is a test webhook payload from Server Control Center.',
            ]
        ];

        $jsonPayload = json_encode($payload);
        $signature = hash_hmac('sha256', $jsonPayload, $setting->secret_key);

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'X-Webhook-Signature' => 'hmac-sha256=' . $signature,
                'X-Webhook-Event' => 'test',
                'Content-Type' => 'application/json',
            ])
            ->timeout(10)
            ->send('POST', $setting->webhook_url, [
                'body' => $jsonPayload
            ]);

            return response()->json([
                'success' => $response->successful(),
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
