<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\DatabaseConnection;
use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DatabaseConnectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = DatabaseConnection::whereHas('server', function($q) {
            $q->where('user_id', Auth::id());
        });

        if ($request->has('server_id')) {
            $query->where('server_id', $request->server_id);
        }

        $query = $query->with('server')->orderBy('label');

        if ($request->get('paginate') === 'false') {
            return response()->json($query->get());
        }

        return response()->json($query->paginate($request->limit ?? 10));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'server_id' => 'required|exists:servers,id',
            'label' => 'required|string|max:100',
            'db_type' => 'required|in:mysql,mariadb,postgresql',
            'db_host' => 'required|string|max:255',
            'db_port' => 'required|integer',
            'db_name' => 'nullable|string',
            'db_username' => 'required|string',
            'db_password' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        // Verify server ownership
        $server = Server::where('user_id', Auth::id())->findOrFail($validated['server_id']);

        $connection = DatabaseConnection::create($validated);

        ActivityLog::log('VAULT_ADD', 'DB_CONN', $connection->id, ['label' => $connection->label]);

        return response()->json([
            'status' => 'success',
            'message' => 'Database connection credentials stored',
            'data' => $connection,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $connection = DatabaseConnection::whereHas('server', function($q) {
            $q->where('user_id', Auth::id());
        })->with('server')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $connection,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $connection = DatabaseConnection::whereHas('server', function($q) {
            $q->where('user_id', Auth::id());
        })->findOrFail($id);

        $validated = $request->validate([
            'label' => 'sometimes|required|string|max:100',
            'db_type' => 'sometimes|required|in:mysql,mariadb,postgresql',
            'db_host' => 'sometimes|required|string|max:255',
            'db_port' => 'sometimes|required|integer',
            'db_name' => 'nullable|string',
            'db_username' => 'sometimes|required|string',
            'db_password' => 'sometimes|required|string',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $connection->update($validated);

        ActivityLog::log('VAULT_UPDATE', 'DB_CONN', $connection->id, ['label' => $connection->label]);

        return response()->json([
            'status' => 'success',
            'message' => 'Database connection details updated',
            'data' => $connection,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $connection = DatabaseConnection::whereHas('server', function($q) {
            $q->where('user_id', Auth::id());
        })->findOrFail($id);
        
        $label = $connection->label;
        $connection->delete();

        ActivityLog::log('VAULT_DELETE', 'DB_CONN', $id, ['label' => $label]);

        return response()->json([
            'status' => 'success',
            'message' => 'Database credentials removed from vault',
        ]);
    }

    /**
     * Test Database connection.
     */
    public function testConnection(string $id, \App\Services\SshService $sshService)
    {
        $connection = DatabaseConnection::whereHas('server', function($q) {
            $q->where('user_id', Auth::id());
        })->findOrFail($id);
        $server = $connection->server;

        if (!$server) {
            return response()->json([
                'status' => 'error',
                'message' => 'Associated server not found.'
            ], 404);
        }

        try {
            // Determine the command based on database type
            // We use standard CLI tools that are usually present or easily installed
            $command = '';
            if ($connection->db_type === 'mysql' || $connection->db_type === 'mariadb') {
                // mysqladmin ping returns 'mysqld is alive' if connection is okay
                $command = sprintf(
                    'MYSQL_PWD=%s mysqladmin -u %s -h %s -P %s ping',
                    escapeshellarg($connection->db_password),
                    escapeshellarg($connection->db_username),
                    escapeshellarg($connection->db_host),
                    escapeshellarg($connection->db_port)
                );
            } elseif ($connection->db_type === 'postgresql') {
                // pg_isready is standard for Postgres connection checks
                $command = sprintf(
                    'PGPASSWORD=%s pg_isready -h %s -p %s -U %s',
                    escapeshellarg($connection->db_password),
                    escapeshellarg($connection->db_host),
                    escapeshellarg($connection->db_port),
                    escapeshellarg($connection->db_username)
                );
            }

            // Execute the command via SSH on the target server
            $start = microtime(true);
            $result = $sshService->execute($server, $command);
            $latency = round((microtime(true) - $start) * 1000, 2);

            ActivityLog::log('TEST_CONNECTION', 'DATABASE', $connection->id, [
                'label' => $connection->label,
                'status' => 'success'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Remote database handshake successful.',
                'latency' => "{$latency}ms",
                'details' => trim($result)
            ]);

        } catch (Exception $e) {
            ActivityLog::log('TEST_CONNECTION', 'DATABASE', $connection->id, [
                'label' => $connection->label,
                'status' => 'failed',
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Handshake failed via SSH: ' . $e->getMessage()
            ], 400);
        }
    }
}
