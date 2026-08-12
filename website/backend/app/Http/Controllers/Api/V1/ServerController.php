<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use phpseclib3\Net\SSH2;
use phpseclib3\Crypt\PublicKeyLoader;
use Exception;

class ServerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Server::where('user_id', Auth::id());


        if ($request->has('search')) {
            $query->where('label', 'like', '%' . $request->search . '%');
        }

        $query = $query->orderBy('label');

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
            'label' => 'required|string|max:100',
            'host' => 'required|string|max:255',
            'port' => 'nullable|integer',
            'username' => 'required|string',
            'auth_type' => 'required|in:password,private_key',
            'password' => 'required_if:auth_type,password|nullable|string',
            'private_key' => 'required_if:auth_type,private_key|nullable|string',
            'passphrase' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $server = Server::create([
            'user_id' => Auth::id(),
            'label' => $validated['label'],
            'host' => $validated['host'],
            'port' => $validated['port'] ?? 22,
            'username' => $validated['username'],
            'auth_type' => $validated['auth_type'],
            'password' => $validated['password'] ?? null,
            'private_key' => $validated['private_key'] ?? null,
            'passphrase' => $validated['passphrase'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        ActivityLog::log('REGISTER', 'SERVER', $server->id, ['label' => $server->label]);

        return response()->json([
            'status' => 'success',
            'message' => 'Server node registered successfully',
            'data' => $server,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $server = Server::where('user_id', Auth::id())
            ->with('databaseConnections')
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $server,
        ]);
    }

    /**
     * Display decrypted credentials for specified server.
     */
    public function credentials(string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);

        ActivityLog::log('VIEW_CREDENTIALS', 'SERVER', $server->id, ['label' => $server->label]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $server->id,
                'label' => $server->label,
                'host' => $server->host,
                'port' => $server->port,
                'username' => $server->username,
                'auth_type' => $server->auth_type,
                'password' => $server->auth_type === 'password' ? $server->password : null,
                'private_key' => $server->auth_type === 'private_key' ? $server->private_key : null,
                'passphrase' => $server->passphrase,
            ],
        ]);
    }

    /**
     * Backward-compatible alias for credentials().
     */
    public function reveal(string $id)
    {
        return $this->credentials($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'label' => 'sometimes|required|string|max:100',
            'host' => 'sometimes|required|string|max:255',
            'port' => 'nullable|integer',
            'username' => 'sometimes|required|string',
            'auth_type' => 'sometimes|required|in:password,private_key',
            'password' => 'nullable|string',
            'private_key' => 'nullable|string',
            'passphrase' => 'nullable|string',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $server->update($validated);

        ActivityLog::log('UPDATE', 'SERVER', $server->id, ['label' => $server->label]);

        return response()->json([
            'status' => 'success',
            'message' => 'Server details updated successfully',
            'data' => $server,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);
        $label = $server->label;
        $server->delete();

        ActivityLog::log('DELETE', 'SERVER', $id, ['label' => $label]);

        return response()->json([
            'status' => 'success',
            'message' => 'Server node removed successfully',
        ]);
    }

    /**
     * Test SSH connection.
     */
    public function testConnection(string $id, \App\Services\SshService $sshService)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);

        try {
            $ssh = $sshService->connect($server);

            // Connection successful
            $server->update(['last_connected' => now()]);
            
            ActivityLog::log('TEST_CONNECTION', 'SERVER', $server->id, [
                'label' => $server->label,
                'status' => 'success'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Secure handshake established successfully.',
                'banner' => $ssh->getServerIdentification()
            ]);

        } catch (Exception $e) {
            ActivityLog::log('TEST_CONNECTION', 'SERVER', $server->id, [
                'label' => $server->label,
                'status' => 'failed',
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Handshake failed: ' . $e->getMessage()
            ], 400);
        }
    }
}

