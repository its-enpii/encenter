<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records authentication-related activity (login / logout) in `activity_logs`.
 *
 * Domain-specific writes (REGISTER, VAULT_ADD, VIEW_CREDENTIALS, …) are
 * already emitted from the controllers themselves. This middleware exists
 * solely so login/logout — which do not have a natural place to call
 * ActivityLog::log() — still appear in the audit trail. All other requests
 * are skipped to avoid duplicate, low-signal entries.
 */
class ActivityLogger
{
    /**
     * Route names this middleware will record.
     */
    protected const TRACKED_ROUTES = [
        'auth.login',
        'auth.logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$this->shouldLog($request)) {
            return $response;
        }

        $this->logAction($request, $response);

        return $response;
    }

    protected function shouldLog(Request $request): bool
    {
        foreach (self::TRACKED_ROUTES as $name) {
            if ($request->routeIs($name)) {
                return true;
            }
        }

        return false;
    }

    protected function logAction(Request $request, Response $response): void
    {
        try {
            // Safety net: don't crash if the table is not yet migrated.
            if (!Schema::hasTable('activity_logs')) {
                return;
            }

            $action = $request->routeIs('auth.login') ? 'auth.login' : 'auth.logout';

            ActivityLog::create([
                'user_id' => Auth::id(),
                'action' => $action,
                'resource' => 'AUTH',
                'resource_id' => null,
                'meta' => [
                    'method' => $request->method(),
                    'user_agent' => $request->userAgent(),
                    'status_code' => $response->getStatusCode(),
                ],
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable $e) {
            logger()->error('Failed to log activity: ' . $e->getMessage());
        }
    }
}
