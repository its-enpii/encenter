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
    private const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB per chunk
    private const MAX_SIMPLE_UPLOAD = 100 * 1024 * 1024; // 100 MB

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
     * Uses simple multipart for small files, chunked upload for large files.
     *
     * @return array{file_id: string, file_url: string}
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
     * Simple multipart upload for files <= 100 MB.
     */
    private function simpleUpload(string $filePath, string $fileName, ?string $folderId): array
    {
        $request = $this->client()
            ->timeout(300)
            ->attach('file', fopen($filePath, 'r'), $fileName);

        if ($folderId) {
            $request = $request->asMultipart()->attach('folder_id', $folderId);
        }

        $response = $request->post('/files/upload');

        if (!$response->successful()) {
            $this->handleUploadError($response);
        }

        $files = $response->json('data.files', []);
        if (empty($files)) {
            throw new Exception('EnStorage upload returned no file data.');
        }

        $file = $files[0];

        return [
            'file_id' => $file['file_id'],
            'file_url' => $this->buildFileUrl($file['file_id']),
        ];
    }

    /**
     * Chunked upload for files > 100 MB.
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
            'shareable' => false,
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

                $chunkResponse = $this->client()
                    ->timeout(600)
                    ->withBody($chunkData, 'application/octet-stream')
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
            ->timeout(120)
            ->post("/files/upload/{$fileId}/complete");

        if (!$completeResponse->successful()) {
            throw new Exception('EnStorage chunked complete failed: ' . $completeResponse->body());
        }

        return [
            'file_id' => $fileId,
            'file_url' => $this->buildFileUrl($fileId),
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

    private function buildFileUrl(string $fileId): string
    {
        return $this->baseUrl . '/api/v1/files/' . $fileId;
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
