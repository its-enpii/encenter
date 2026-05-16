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

        $logs = $query->orderBy('created_at', 'desc')
            ->paginate($request->limit ?? 20);

        return response()->json($logs);
    }
}
