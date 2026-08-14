<?php

namespace App\Services;

use App\Models\UserStorage;
use Exception;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EnStorageService
{
    private const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB per chunk (safe for proxies & nginx)
    private const MAX_SIMPLE_UPLOAD = 1024 * 1024 * 1024; // 1 GB (EnStorage supports up to 1GB per multipart file)

    protected string $baseUrl;
    protected string $apiKey;

    /**
     * Normalize URL so user can input:
     * - https://storage.domain.com
     * - https://storage.domain.com/
     * - https://storage.domain.com/api/v1
     * - https://storage.domain.com/api/v1/
     * All will be normalized to https://storage.domain.com
     */
    public function normalizeBaseUrl(string $url): string
    {
        $trimmed = rtrim(trim($url), '/');
        if (str_ends_with($trimmed, '/api/v1')) {
            $trimmed = substr($trimmed, 0, -strlen('/api/v1'));
        }
        return rtrim($trimmed, '/');
    }

    public function configure(UserStorage $storage): void
    {
        $this->baseUrl = $this->normalizeBaseUrl($storage->enstorage_url);
        $this->apiKey = $storage->api_key;
    }

    public function configureManual(string $baseUrl, string $apiKey): void
    {
        $this->baseUrl = $this->normalizeBaseUrl($baseUrl);
        $this->apiKey = $apiKey;
    }

    /**
     * Test connectivity with the EnStorage API.
     */
    public function testConnection(): array
    {
        try {
            $response = $this->client()->timeout(15)->get('/auth/me');

            if (!$response->successful()) {
                $status = $response->status();
                $err = $response->json('message') ?? $response->body();
                throw new Exception("EnStorage API returned HTTP {$status}: {$err}");
            }

            return $response->json('data') ?? [];
        } catch (ConnectionException $e) {
            throw new Exception("Could not reach EnStorage at '{$this->baseUrl}': " . $e->getMessage());
        } catch (\Throwable $e) {
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Get or create a folder by name (at root level).
     */
    public function getOrCreateFolder(string $name): string
    {
        try {
            $response = $this->client()->get('/folders', [
                'parent_id' => 'null',
                'search' => $name,
                'per_page' => 100,
            ]);

            if ($response->successful()) {
                $folders = $response->json('data', []);
                foreach ($folders as $folder) {
                    if (strcasecmp($folder['name'], $name) === 0) {
                        return $folder['id'];
                    }
                }
            }

            $response = $this->client()->post('/folders', [
                'name' => $name,
            ]);

            if (!$response->successful()) {
                throw new Exception('Failed to create folder in EnStorage: ' . $response->body());
            }

            return $response->json('data.id');
        } catch (\Throwable $e) {
            throw new Exception("EnStorage folder error: " . $e->getMessage());
        }
    }

    /**
     * Get or create a subfolder inside a parent folder.
     */
    public function getOrCreateSubfolder(string $name, string $parentId): string
    {
        $response = $this->client()->get('/folders', [
            'parent_id' => $parentId,
            'search' => $name,
            'per_page' => 100,
        ]);

        if ($response->successful()) {
            $folders = $response->json('data', []);
            foreach ($folders as $folder) {
                if (strcasecmp($folder['name'], $name) === 0) {
                    return $folder['id'];
                }
            }
        }

        $response = $this->client()->post('/folders', [
            'name' => $name,
            'parent_id' => $parentId,
        ]);

        if (!$response->successful()) {
            throw new Exception('Failed to create subfolder in EnStorage: ' . $response->body());
        }

        return $response->json('data.id');
    }

    /**
     * Upload a file to EnStorage.
     * Uses native multipart upload for files <= 1 GB, chunked upload for > 1 GB.
     *
     * @return array{
     *   file_id: string,
     *   file_url: string,
     *   download_url: string,
     *   preview_url: string,
     *   share_token: ?string
     * }
     */
    public function uploadFile(string $filePath, string $fileName, ?string $folderId = null): array
    {
        $fileSize = filesize($filePath);

        if ($fileSize === false || $fileSize === 0) {
            throw new Exception('Cannot read file or file is empty: ' . $filePath);
        }

        if ($fileSize <= self::MAX_SIMPLE_UPLOAD) {
            return $this->simpleUpload($filePath, $fileName, $folderId);
        }

        return $this->chunkedUpload($filePath, $fileName, $fileSize, $folderId);
    }

    /**
     * Native multipart upload for files <= 1 GB.
     */
    private function simpleUpload(string $filePath, string $fileName, ?string $folderId): array
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new Exception('Cannot open file for reading: ' . $filePath);
        }

        try {
            $request = $this->client()
                ->timeout(1800) // 30 minutes for large files
                ->attach('file', $handle, $fileName)
                ->attach('shareable', '1');

            if ($folderId) {
                $request = $request->attach('folder_id', $folderId);
            }

            $response = $request->post('/files/upload');
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }
        }

        if (!$response->successful()) {
            $this->handleUploadError($response);
        }

        $files = $response->json('data.accepted') ?? $response->json('data.files') ?? [];
        if (empty($files)) {
            throw new Exception('EnStorage upload returned no accepted file data.');
        }

        $file = $files[0];
        $fileId = $file['file_id'] ?? $file['id'];
        $shareToken = $file['share_token'] ?? null;

        return $this->formatUploadResult($fileId, $shareToken);
    }

    /**
     * Chunked upload for very large files (> 1 GB).
     */
    private function chunkedUpload(string $filePath, string $fileName, int $fileSize, ?string $folderId): array
    {
        $totalChunks = (int) ceil($fileSize / self::CHUNK_SIZE);
        $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';

        // 1. Init
        $initPayload = [
            'file_name' => $fileName,
            'mime_type' => $mimeType,
            'total_size' => $fileSize,
            'total_chunks' => $totalChunks,
            'shareable' => true,
        ];

        if ($folderId) {
            $initPayload['folder_id'] = $folderId;
        }

        $initResponse = $this->client()
            ->timeout(60)
            ->post('/files/upload/init', $initPayload);

        if (!$initResponse->successful()) {
            throw new Exception('EnStorage chunked init failed: ' . $initResponse->body());
        }

        $fileId = $initResponse->json('data.file_id');
        if (!$fileId) {
            throw new Exception('EnStorage chunked init returned no file_id.');
        }

        // 2. Upload chunks
        $handle = fopen($filePath, 'rb');
        if (!$handle) {
            throw new Exception('Cannot open file for chunked upload: ' . $filePath);
        }

        try {
            for ($chunkIndex = 0; $chunkIndex < $totalChunks; $chunkIndex++) {
                $chunkData = fread($handle, self::CHUNK_SIZE);
                if ($chunkData === false) {
                    throw new Exception("Failed to read chunk {$chunkIndex} from file.");
                }

                // Send chunk as multipart 'chunk' file
                $chunkResponse = $this->client()
                    ->timeout(600)
                    ->attach('chunk', $chunkData, "chunk_{$chunkIndex}")
                    ->post("/files/upload/{$fileId}/chunk/{$chunkIndex}");

                if (!$chunkResponse->successful()) {
                    throw new Exception("EnStorage chunk {$chunkIndex} upload failed: " . $chunkResponse->body());
                }
            }
        } finally {
            fclose($handle);
        }

        // 3. Complete
        $completeResponse = $this->client()
            ->timeout(300)
            ->post("/files/upload/{$fileId}/complete");

        if (!$completeResponse->successful()) {
            throw new Exception('EnStorage chunked complete failed: ' . $completeResponse->body());
        }

        $data = $completeResponse->json('data') ?? [];
        $shareToken = $data['share_token'] ?? null;

        return $this->formatUploadResult($fileId, $shareToken);
    }

    /**
     * Build standard upload result:
     * - preview_url: Web UI landing page in EnStorage frontend (/s/{token})
     * - download_url: Direct download URL (/api/v1/s/{token}?download=1)
     */
    private function formatUploadResult(string $fileId, ?string $shareToken): array
    {
        if ($shareToken) {
            $downloadUrl = "{$this->baseUrl}/api/v1/s/{$shareToken}?download=1";
            $previewUrl = "{$this->baseUrl}/s/{$shareToken}";
        } else {
            $downloadUrl = "{$this->baseUrl}/api/v1/files/{$fileId}/download";
            $previewUrl = "{$this->baseUrl}/api/v1/files/{$fileId}";
        }

        return [
            'file_id' => $fileId,
            'share_token' => $shareToken,
            'download_url' => $downloadUrl,
            'preview_url' => $previewUrl,
            'file_url' => $downloadUrl,
        ];
    }

    /**
     * Delete old subfolders (date-named) from a root folder.
     */
    public function deleteOldSubfolders(string $rootFolderId, int $days = 7): array
    {
        $cutoffDate = now()->subDays($days)->format('Ymd');
        $deleted = [];

        $response = $this->client()->get('/folders', [
            'parent_id' => $rootFolderId,
            'per_page' => 100,
        ]);

        if (!$response->successful()) {
            return $deleted;
        }

        $folders = $response->json('data', []);

        foreach ($folders as $folder) {
            if (preg_match('/^\d{8}$/', $folder['name']) && $folder['name'] < $cutoffDate) {
                try {
                    $deleteResponse = $this->client()->delete('/folders/' . $folder['id']);
                    $deleted[] = [
                        'id' => $folder['id'],
                        'name' => $folder['name'],
                        'status' => $deleteResponse->successful() ? 'deleted' : 'failed',
                    ];
                } catch (\Throwable $e) {
                    $deleted[] = [
                        'id' => $folder['id'],
                        'name' => $folder['name'],
                        'status' => 'failed',
                        'error' => $e->getMessage(),
                    ];
                }
            }
        }

        return $deleted;
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl . '/api/v1')
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Accept' => 'application/json',
            ]);
    }

    private function handleUploadError($response): void
    {
        $status = $response->status();
        $body = $response->body();

        if ($status === 413) {
            throw new Exception('EnStorage upload failed: File too large.');
        }
        if ($status === 401) {
            throw new Exception('EnStorage upload failed: Unauthorized. Check API key.');
        }
        if ($status === 403) {
            throw new Exception('EnStorage upload failed: Forbidden. API key may lack write scope.');
        }
        if ($status === 422) {
            throw new Exception('EnStorage upload failed: Validation error - ' . $body);
        }

        throw new Exception('EnStorage upload failed (HTTP ' . $status . '): ' . $body);
    }
}
