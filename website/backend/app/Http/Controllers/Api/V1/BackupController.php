<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\RunBackupJob;
use App\Models\BackupJob;
use App\Models\DatabaseConnection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;

class BackupController extends Controller
{
    /**
     * Get backup history.
     */
    public function index(Request $request)
    {
        try {
            $query = BackupJob::with(['databaseConnection.server'])
                ->orderBy('created_at', 'desc');

            if ($request->has('db_connection_id')) {
                $query->where('db_connection_id', $request->db_connection_id);
            }

            if ($request->get('paginate') === 'false') {
                return response()->json([
                    'status' => 'success',
                    'data' => $query->get()
                ]);
            }

            return response()->json([
                'status' => 'success',
                'data' => $query->paginate($request->get('per_page', 10))
            ]);
        } catch (Exception $e) {
            Log::error("Backup Index Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Trigger a manual backup.
     */
    public function run(Request $request)
    {
        try {
            $request->validate([
                'db_connection_id' => 'required_without:db_label|nullable|uuid|exists:database_connections,id',
                'db_label' => 'required_without:db_connection_id|nullable|string|max:100',
                'triggered_by' => 'nullable|string|max:50'
            ]);

            if ($request->has('db_connection_id') && $request->db_connection_id) {
                $dbConn = DatabaseConnection::whereHas('server', function($q) {
                    $q->where('user_id', Auth::id());
                })->findOrFail($request->db_connection_id);
            } else {
                $dbConn = DatabaseConnection::whereHas('server', function($q) {
                    $q->where('user_id', Auth::id());
                })->where('label', $request->db_label)->first();

                if (!$dbConn) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Database connection with label '{$request->db_label}' not found or unauthorized."
                    ], 404);
                }
            }

            $backupJob = BackupJob::create([
                'db_connection_id' => $dbConn->id,
                'triggered_by' => $request->get('triggered_by', 'manual'),
                'triggered_by_user' => Auth::id(),
                'status' => 'pending',
            ]);

            RunBackupJob::dispatch($backupJob);

            return response()->json([
                'status' => 'success',
                'message' => 'Backup job dispatched successfully.',
                'data' => $backupJob
            ]);
        } catch (Exception $e) {
            Log::error("Backup Run Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get backup job status.
     */
    public function show($id)
    {
        try {
            $backupJob = BackupJob::with(['databaseConnection.server'])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $backupJob
            ]);
        } catch (Exception $e) {
            Log::error("Backup Show Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
