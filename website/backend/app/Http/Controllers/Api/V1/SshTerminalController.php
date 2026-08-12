<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Server;
use App\Services\SshService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Exception;

class SshTerminalController extends Controller
{
    protected SshService $sshService;

    public function __construct(SshService $sshService)
    {
        $this->sshService = $sshService;
    }

    /**
     * Execute command via SSH (Terminal) and track resulting CWD
     */
    public function execute(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);
        
        $validated = $request->validate([
            'command' => 'required|string',
            'cwd' => 'nullable|string',
        ]);

        $cmd = $validated['command'];
        $targetCwd = !empty($validated['cwd']) ? $validated['cwd'] : '~';

        $delimiter = "__ENV_PWD__:";
        // Chain command execution and retrieve updated PWD
        $fullCmd = "cd " . escapeshellarg($targetCwd) . " && " . $cmd . "; echo ''; echo '{$delimiter}'\$(pwd)";

        try {
            $rawOutput = $this->sshService->execute($server, $fullCmd);

            $newCwd = $targetCwd;
            $cleanOutput = $rawOutput;

            if (str_contains($rawOutput, $delimiter)) {
                $parts = explode($delimiter, $rawOutput);
                $newCwd = trim(end($parts));
                array_pop($parts);
                $cleanOutput = implode($delimiter, $parts);
            }

            ActivityLog::log('SSH_EXEC', 'SERVER', $server->id, [
                'label' => $server->label,
                'command' => $validated['command'],
                'cwd' => $newCwd,
            ]);

            return response()->json([
                'status' => 'success',
                'output' => rtrim($cleanOutput),
                'cwd' => $newCwd ?: $targetCwd,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * List directory contents via SFTP
     */
    public function listFiles(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);
        $path = $request->get('path', '/');

        try {
            $sftp = $this->sshService->sftp($server);
            $rawList = $sftp->rawlist($path);

            if ($rawList === false) {
                throw new Exception("Unable to list path: {$path}");
            }

            $items = [];
            $pwd = $sftp->pwd();

            foreach ($rawList as $filename => $info) {
                if ($filename === '.' || $filename === '..') {
                    continue;
                }

                $isDir = ($info['type'] ?? 0) === 2 || ($info['type'] ?? 0) === NET_SFTP_TYPE_DIRECTORY;
                if (isset($info['permissions']) && (($info['permissions'] & 0040000) === 0040000)) {
                    $isDir = true;
                }

                $items[] = [
                    'name' => $filename,
                    'path' => rtrim($path, '/') . '/' . $filename,
                    'type' => $isDir ? 'directory' : 'file',
                    'size' => $info['size'] ?? 0,
                    'mtime' => isset($info['mtime']) ? date('Y-m-d H:i:s', $info['mtime']) : null,
                    'permissions' => isset($info['permissions']) ? sprintf('%o', $info['permissions'] & 0777) : null,
                ];
            }

            usort($items, function ($a, $b) {
                if ($a['type'] === $b['type']) {
                    return strcasecmp($a['name'], $b['name']);
                }
                return $a['type'] === 'directory' ? -1 : 1;
            });

            return response()->json([
                'status' => 'success',
                'path' => $path,
                'pwd' => $pwd,
                'items' => $items,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Read file content via SFTP for in-app viewing/editing
     */
    public function readFile(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);
        $path = $request->get('path');

        if (!$path) {
            return response()->json(['status' => 'error', 'message' => 'Path parameter required.'], 422);
        }

        try {
            $sftp = $this->sshService->sftp($server);
            
            $size = $sftp->filesize($path);
            if ($size > 5 * 1024 * 1024) {
                return response()->json(['status' => 'error', 'message' => 'File size exceeds 5MB limit for in-app editor.'], 400);
            }

            $content = $sftp->get($path);
            if ($content === false) {
                throw new Exception("Could not read file at {$path}");
            }

            return response()->json([
                'status' => 'success',
                'path' => $path,
                'content' => $content,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Write/save file content via SFTP
     */
    public function writeFile(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);
        
        $validated = $request->validate([
            'path' => 'required|string',
            'content' => 'required|string',
        ]);

        try {
            $sftp = $this->sshService->sftp($server);
            $success = $sftp->put($validated['path'], $validated['content']);

            if (!$success) {
                throw new Exception("Failed to write to file {$validated['path']}");
            }

            ActivityLog::log('SFTP_EDIT_FILE', 'SERVER', $server->id, [
                'label' => $server->label,
                'path' => $validated['path'],
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'File saved successfully.',
                'path' => $validated['path'],
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Create new directory via SFTP
     */
    public function makeDirectory(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'path' => 'required|string',
        ]);

        try {
            $sftp = $this->sshService->sftp($server);
            $success = $sftp->mkdir($validated['path']);

            if (!$success) {
                throw new Exception("Failed to create directory at {$validated['path']}");
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Directory created successfully.',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete file or directory via SFTP
     */
    public function deleteItem(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);

        $validated = $request->validate([
            'path' => 'required|string',
            'type' => 'required|in:file,directory',
        ]);

        try {
            $sftp = $this->sshService->sftp($server);
            
            if ($validated['type'] === 'directory') {
                $success = $sftp->rmdir($validated['path'], true);
            } else {
                $success = $sftp->delete($validated['path']);
            }

            if (!$success) {
                throw new Exception("Failed to delete {$validated['type']} at {$validated['path']}");
            }

            ActivityLog::log('SFTP_DELETE', 'SERVER', $server->id, [
                'label' => $server->label,
                'path' => $validated['path'],
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Item deleted successfully.',
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Upload file via SFTP
     */
    public function uploadFile(Request $request, string $id)
    {
        $server = Server::where('user_id', Auth::id())->findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:51200',
            'target_dir' => 'required|string',
        ]);

        try {
            $file = $request->file('file');
            $targetDir = rtrim($request->get('target_dir'), '/');
            $targetPath = $targetDir . '/' . $file->getClientOriginalName();

            $sftp = $this->sshService->sftp($server);
            $success = $sftp->put($targetPath, $file->getRealPath(), NET_SFTP_LOCAL_FILE);

            if (!$success) {
                throw new Exception("Failed to upload file to {$targetPath}");
            }

            ActivityLog::log('SFTP_UPLOAD', 'SERVER', $server->id, [
                'label' => $server->label,
                'path' => $targetPath,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'File uploaded successfully.',
                'path' => $targetPath,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
