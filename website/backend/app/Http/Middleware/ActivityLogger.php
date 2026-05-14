<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class ActivityLogger
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log successful or important actions (you can customize this)
        if ($request->isMethodSafe()) {
            // Optional: Skip logging simple GET requests if too noisy
            // return $response;
        }

        $this->logAction($request, $response);

        return $response;
    }

    protected function logAction(Request $request, Response $response): void
    {
        try {
            // Safety check: Don't crash if database is not ready
            if (!\Illuminate\Support\Facades\Schema::hasTable('activity_logs')) {
                return;
            }

            $user = Auth::user();
            
            // Define action based on route/method
            $action = $request->method() . ' ' . $request->path();
            
            // Map common routes to readable actions
            if ($request->routeIs('auth.login')) $action = 'auth.login';
            if ($request->routeIs('auth.logout')) $action = 'auth.logout';

            ActivityLog::create([
                'user_id' => $user?->id,
                'action' => $action,
                'resource' => $this->getResourceType($request),
                'resource_id' => $request->route('id'),
                'meta' => [
                    'method' => $request->method(),
                    'user_agent' => $request->userAgent(),
                    'status_code' => $response->getStatusCode(),
                    // Mask sensitive data in meta if needed
                ],
                'ip_address' => $request->ip(),
            ]);
        } catch (\Exception $e) {
            // Don't crash the app if logging fails, but maybe log to file
            logger()->error('Failed to log activity: ' . $e->getMessage());
        }
    }

    protected function getResourceType(Request $request): ?string
    {
        $segments = $request->segments();
        return $segments[1] ?? null; // Assuming /api/v1/{resource}
    }
}
