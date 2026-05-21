<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ActivityLog::where('user_id', Auth::id())
            ->with('user');

        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('action', 'like', '%' . $request->search . '%')
                  ->orWhere('resource', 'like', '%' . $request->search . '%');
            });
        }

        $query = $query->orderBy('created_at', 'desc');

        if ($request->get('paginate') === 'false') {
            return response()->json($query->get());
        }

        return response()->json($query->paginate($request->limit ?? 20));
    }

    /**
     * Bulk-purge old audit logs for the current operator.
     * Accepts `older_than_days` (int, 0 means purge ALL).
     */
    public function purge(Request $request)
    {
        $validated = $request->validate([
            'older_than_days' => 'required|integer|min:0|max:36500',
        ]);

        $days = (int) $validated['older_than_days'];

        $query = ActivityLog::where('user_id', Auth::id());

        if ($days > 0) {
            $cutoff = now()->subDays($days);
            $query->where('created_at', '<', $cutoff);
        }

        $deleted = $query->delete();

        ActivityLog::log('PURGE', 'ACTIVITY_LOG', null, [
            'older_than_days' => $days,
            'deleted_count' => $deleted,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => $deleted > 0
                ? "Purged {$deleted} audit log entr" . ($deleted === 1 ? 'y' : 'ies') . '.'
                : 'No matching audit logs to purge.',
            'data' => [
                'deleted' => $deleted,
                'older_than_days' => $days,
            ],
        ]);
    }
}
