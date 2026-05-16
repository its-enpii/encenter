<?php

namespace App\Services;

use App\Models\UserStorage;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Support\Facades\Auth;
use Exception;

class GoogleDriveService
{
    protected $client;

    public function __construct()
    {
        $this->client = new Client();
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect_uri'));
        $this->client->addScope(Drive::DRIVE_FILE);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('select_account consent');
    }

    /**
     * Get the URL for Google OAuth authorization.
     */
    public function getAuthUrl(): string
    {
        return $this->client->createAuthUrl();
    }

    /**
     * Exchange authorization code for tokens.
     */
    public function authenticate(string $code): array
    {
        $token = $this->client->fetchAccessTokenWithAuthCode($code);
        
        if (isset($token['error'])) {
            throw new Exception("Google Auth Error: " . $token['error_description']);
        }

        return $token;
    }

    /**
     * Set access token for the client.
     */
    public function setAccessToken(UserStorage $storage)
    {
        $this->client->setAccessToken([
            'access_token' => $storage->access_token,
            'refresh_token' => $storage->refresh_token,
            'expires_in' => $storage->expires_at->timestamp - now()->timestamp,
            'created' => $storage->updated_at->timestamp
        ]);

        if ($this->client->isAccessTokenExpired()) {
            $newToken = $this->client->fetchAccessTokenWithRefreshToken($this->client->getRefreshToken());
            
            if (isset($newToken['error'])) {
                throw new Exception("Failed to refresh Google token.");
            }

            $storage->update([
                'access_token' => $newToken['access_token'],
                'expires_at' => now()->addSeconds($newToken['expires_in'])
            ]);
        }
    }

    /**
     * Create a folder in Google Drive.
     */
    /**
     * Create a folder in Google Drive, optionally inside a parent folder.
     */
    public function createFolder(string $name, string $parentId = null): string
    {
        $driveService = new Drive($this->client);
        $metadata = [
            'name' => $name,
            'mimeType' => 'application/vnd.google-apps.folder'
        ];

        if ($parentId) {
            $metadata['parents'] = [$parentId];
        }

        $fileMetadata = new DriveFile($metadata);
        $folder = $driveService->files->create($fileMetadata, ['fields' => 'id']);
        return $folder->id;
    }

    /**
     * Get or create a root-level folder by name.
     */
    public function getOrCreateFolderByName(string $name): string
    {
        $driveService = new Drive($this->client);
        
        // Clean name (remove leading slash)
        $cleanName = ltrim($name, '/');
        if (empty($cleanName)) $cleanName = 'Backup';

        $response = $driveService->files->listFiles([
            'q' => "name = '{$cleanName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents",
            'spaces' => 'drive',
            'fields' => 'files(id, name)',
        ]);

        if (count($response->files) > 0) {
            return $response->files[0]->id;
        }

        return $this->createFolder($cleanName);
    }

    /**
     * Get or create a subfolder inside a parent folder.
     */
    public function getOrCreateSubfolder(string $name, string $parentId): string
    {
        $driveService = new Drive($this->client);

        $response = $driveService->files->listFiles([
            'q' => "name = '{$name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '{$parentId}' in parents",
            'spaces' => 'drive',
            'fields' => 'files(id, name)',
        ]);

        if (count($response->files) > 0) {
            return $response->files[0]->id;
        }

        return $this->createFolder($name, $parentId);
    }

    /**
     * Upload a file to Google Drive.
     */
    public function uploadFile(string $filePath, string $fileName, string $folderId = null): string
    {
        $driveService = new Drive($this->client);
        $fileMetadata = new DriveFile([
            'name' => $fileName,
            'parents' => $folderId ? [$folderId] : []
        ]);

        $fileSize = filesize($filePath);
        
        // For very small files, simple multipart is fine
        if ($fileSize <= 5 * 1024 * 1024) {
            $content = file_get_contents($filePath);
            $file = $driveService->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => 'application/octet-stream',
                'uploadType' => 'multipart',
                'fields' => 'id'
            ]);
            return $file->id;
        }

        // For large files (e.g. 3GB databases), use chunked resumable upload to avoid memory exhaustion
        $this->client->setDefer(true);
        $request = $driveService->files->create($fileMetadata, [
            'mimeType' => 'application/octet-stream',
            'uploadType' => 'resumable'
        ]);

        $chunkSizeBytes = 20 * 1024 * 1024; // 20MB chunks
        $media = new \Google\Http\MediaFileUpload(
            $this->client,
            $request,
            'application/octet-stream',
            null,
            true,
            $chunkSizeBytes
        );
        $media->setFileSize($fileSize);

        $status = false;
        $handle = fopen($filePath, "rb");
        
        while (!$status && !feof($handle)) {
            $chunk = fread($handle, $chunkSizeBytes);
            $status = $media->nextChunk($chunk);
        }
        
        fclose($handle);
        $this->client->setDefer(false); // Reset defer state
        
        return $status->id;
    }
}
