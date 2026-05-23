<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyOrSanctum
{
    /**
     * Handle an incoming request.
     *
     * Supports both custom X-API-Key header authentication for external automation (n8n)
     * and standard Laravel Sanctum bearer tokens/sessions for the Next.js frontend.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check for custom X-API-Key header
        $apiKey = $request->header('X-API-Key');
        $configuredKey = env('N8N_API_KEY');

        if ($apiKey && $configuredKey && hash_equals($configuredKey, $apiKey)) {
            // Find the first active admin user to associate the request context with.
            // Note: DB::raw('true') is intentional. Laravel's prepareBindings() casts
            // PHP booleans to integers, which Postgres rejects on a `boolean` column
            // (`operator does not exist: boolean = integer`).
            $user = User::where('is_active', \Illuminate\Support\Facades\DB::raw('true'))->first();

            if ($user) {
                // Log the user in dynamically for this request lifecycle
                Auth::setUser($user);
                $request->setUserResolver(fn () => $user);
                
                return $next($request);
            }
        }

        // 2. Fallback to standard Laravel Sanctum authentication (frontend/Next.js)
        if (Auth::guard('sanctum')->check()) {
            $user = Auth::guard('sanctum')->user();
            Auth::setUser($user);
            $request->setUserResolver(fn () => $user);
            
            return $next($request);
        }

        // 3. Return 401 Unauthenticated if both methods fail
        return response()->json([
            'status' => 'error',
            'message' => 'Unauthenticated.'
        ], 401);
    }
}
