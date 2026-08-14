<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserStorage;
use App\Services\EnStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;

class StorageController extends Controller
{
    protected $enStorage;

    public function __construct(EnStorageService $enStorage)
    {
        $this->enStorage = $enStorage;
    }

    /**
     * Get the current storage status.
     */
    public function index()
    {
        try {
            $storage = UserStorage::where('user_id', Auth::id())
                ->where('provider', 'enstorage')
                ->first();

            return response()->json([
                'status' => 'success',
                'data' => $storage ? [
                    'id' => $storage->id,
                    'provider' => $storage->provider,
                    'enstorage_url' => $storage->enstorage_url,
                    'folder_name' => $storage->folder_name,
                    'is_active' => $storage->is_active,
                ] : null,
            ]);
        } catch (Exception $e) {
            Log::error("Storage Index Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Connect EnStorage by providing API key and base URL.
     */
    public function connect(Request $request)
    {
        $request->validate([
            'enstorage_url' => 'required|url|max:500',
            'api_key' => 'required|string|max:500',
            'folder_name' => 'nullable|string|max:255',
        ]);

        try {
            $folderName = $request->input('folder_name', 'EnCenter_Backups');

            // Test the connection first
            $this->enStorage->configureManual(
                $request->input('enstorage_url'),
                $request->input('api_key')
            );
            $userInfo = $this->enStorage->testConnection();

            // Create/get root folder
            $folderId = $this->enStorage->getOrCreateFolder($folderName);

            $storage = UserStorage::updateOrCreate(
                ['user_id' => Auth::id(), 'provider' => 'enstorage'],
                [
                    'enstorage_url' => $request->input('enstorage_url'),
                    'api_key' => $request->input('api_key'),
                    'folder_name' => $folderName,
                    'folder_id' => $folderId,
                    'is_active' => \Illuminate\Support\Facades\DB::raw('true'),
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'EnStorage connected successfully.',
                'data' => [
                    'id' => $storage->id,
                    'provider' => $storage->provider,
                    'enstorage_url' => $storage->enstorage_url,
                    'folder_name' => $storage->folder_name,
                    'folder_id' => $storage->folder_id,
                    'is_active' => $storage->is_active,
                ],
            ]);
        } catch (Exception $e) {
            Log::error("EnStorage Connect Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Update storage settings (e.g. folder name).
     */
    public function updateSettings(Request $request)
    {
        $request->validate([
            'folder_name' => 'required|string|max:255'
        ]);

        try {
            $storage = UserStorage::updateOrCreate(
                ['user_id' => Auth::id(), 'provider' => 'enstorage'],
                ['folder_name' => $request->folder_name]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Settings updated successfully.',
                'data' => [
                    'id' => $storage->id,
                    'provider' => $storage->provider,
                    'folder_name' => $storage->folder_name,
                    'is_active' => $storage->is_active,
                ],
            ]);
        } catch (Exception $e) {
            Log::error("Update Settings Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Disconnect storage provider.
     */
    public function disconnect()
    {
        try {
            UserStorage::where('user_id', Auth::id())->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Storage provider disconnected.'
            ]);
        } catch (Exception $e) {
            Log::error("Disconnect Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Clean up old backup folders (older than 7 days).
     */
    public function cleanup(Request $request)
    {
        try {
            $storage = UserStorage::where('user_id', Auth::id())
                ->where('provider', 'enstorage')
                ->whereRaw('"is_active" = true')
                ->first();

            if (!$storage || !$storage->folder_id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Active EnStorage configuration not found.'
                ], 404);
            }

            $this->enStorage->configure($storage);
            $deleted = $this->enStorage->deleteOldSubfolders($storage->folder_id, 7);

            return response()->json([
                'status' => 'success',
                'message' => 'Storage cleanup completed.',
                'deleted_folders' => $deleted
            ]);
        } catch (Exception $e) {
            Log::error("Storage Cleanup Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
