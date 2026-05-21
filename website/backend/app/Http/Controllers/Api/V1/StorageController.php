<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserStorage;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;

class StorageController extends Controller
{
    protected $googleDrive;

    public function __construct(GoogleDriveService $googleDrive)
    {
        $this->googleDrive = $googleDrive;
    }

    /**
     * Get the current storage status.
     */
    public function index()
    {
        try {
            $storage = UserStorage::where('user_id', Auth::id())
                ->where('provider', 'google_drive')
                ->first();

            return response()->json([
                'status' => 'success',
                'data' => $storage
            ]);
        } catch (Exception $e) {
            Log::error("Storage Index Error: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get Google OAuth Authorization URL.
     */
    public function getGoogleAuthUrl()
    {
        try {
            $url = $this->googleDrive->getAuthUrl();
            return response()->json([
                'status' => 'success',
                'url' => $url
            ]);
        } catch (Exception $e) {
            Log::error("Google Auth URL Error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle the callback from Google and save tokens.
     */
    public function connectGoogle(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        try {
            $tokens = $this->googleDrive->authenticate($request->code);
            
            // Safe access to existing config
            $existing = UserStorage::where('user_id', Auth::id())
                ->where('provider', 'google_drive')
                ->first();
            
            $folderName = ($existing && $existing->folder_name) ? $existing->folder_name : 'EnCenter_Backups';

            // Save tokens first so we can use the service
            $storage = UserStorage::updateOrCreate(
                ['user_id' => Auth::id(), 'provider' => 'google_drive'],
                [
                    'access_token' => $tokens['access_token'],
                    'refresh_token' => $tokens['refresh_token'] ?? ($existing ? $existing->refresh_token : null),
                    'expires_at' => now()->addSeconds($tokens['expires_in']),
                    'folder_name' => $folderName,
                    'is_active' => \Illuminate\Support\Facades\DB::raw('true')
                ]
            );

            // Now try to create the folder in Google Drive if not exists
            $this->googleDrive->setAccessToken($storage);
            $folderId = $this->googleDrive->getOrCreateFolderByName($folderName);
            
            $storage->update(['folder_id' => $folderId]);

            return response()->json([
                'status' => 'success',
                'message' => 'Google Drive connected successfully.',
                'data' => $storage
            ]);

        } catch (Exception $e) {
            Log::error("Google Connect Error: " . $e->getMessage());
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
                ['user_id' => Auth::id(), 'provider' => 'google_drive'],
                ['folder_name' => $request->folder_name]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Settings updated successfully.',
                'data' => $storage
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
     * Clean up Google Drive folders older than 7 days.
     * Can be triggered by cron/n8n.
     */
    public function cleanup(Request $request)
    {
        try {
            $storage = UserStorage::where('user_id', Auth::id())
                ->where('provider', 'google_drive')
                ->whereRaw('"is_active" = true')
                ->first();

            if (!$storage || !$storage->folder_id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Active Google Drive storage not configured.'
                ], 404);
            }

            $this->googleDrive->setAccessToken($storage);
            $deleted = $this->googleDrive->deleteOldFolders($storage->folder_id, 7);

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