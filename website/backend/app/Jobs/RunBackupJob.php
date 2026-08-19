<?php

namespace App\Jobs;

use App\Models\BackupJob;
use App\Models\UserStorage;
use App\Services\EnStorageService;
use App\Services\SshService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Exception;
use Throwable;

class RunBackupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $backupJob;
    public $timeout = 0;
    public $tries = 1;

    public function __construct(BackupJob $backupJob)
    {
        $this->backupJob = $backupJob;
    }

    private function formatDuration(int $seconds): string
    {
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);
        $s = $seconds % 60;
        if ($h > 0) return "{$h}j {$m}m {$s}d";
        if ($m > 0) return "{$m}m {$s}d";
        return "{$s}d";
    }

    public function handle(SshService $sshService, EnStorageService $enStorageService, \App\Services\WebhookService $webhookService): void
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(0);

        $startTime = microtime(true);

        $this->backupJob->update([
            'status' => 'running',
            'started_at' => now(),
            'error_message' => null,
        ]);

        $dbConn = $this->backupJob->databaseConnection;
        $server = $dbConn->server;

        $label = preg_replace('/[^A-Za-z0-9_\-]/', '_', $dbConn->label);
        $targetDb = $dbConn->db_name ? preg_replace('/[^A-Za-z0-9_\-]/', '_', $dbConn->db_name) : 'ALL_DATABASES';
        $timestamp = date('Ymd_His');
        $isAllDatabases = !$dbConn->db_name;
        $tempFileName = "{$label}_{$targetDb}_{$timestamp}.sql.gz";
        $localTempPath = storage_path("app/backups/{$tempFileName}");
        $dateFolder = date('Ymd');

        if (!file_exists(storage_path('app/backups'))) {
            mkdir(storage_path('app/backups'), 0755, true);
        }

        $hash = substr(md5(uniqid('', true)), 0, 8);
        $remoteFile = "/tmp/envault_{$hash}.sql.gz";
        $remotePid = "/tmp/envault_{$hash}.pid";
        $remoteErr = "/tmp/envault_{$hash}.err";
        $remoteDone = "/tmp/envault_{$hash}.done";

        $jobId = $this->backupJob->id;
        $isFinished = false;

        // Register shutdown function to catch fatal errors (e.g. OOM) and mark job as failed
        register_shutdown_function(function () use (&$isFinished, $jobId, $startTime, $localTempPath) {
            if ($isFinished) {
                return;
            }
            $error = error_get_last();
            if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
                $duration = (int) max(1, (int) ceil(microtime(true) - $startTime));
                $errMsg = "Fatal Error: {$error['message']} in {$error['file']}:{$error['line']}";
                try {
                    BackupJob::where('id', $jobId)->update([
                        'status' => 'failed',
                        'finished_at' => now(),
                        'duration_seconds' => $duration,
                        'error_message' => "Worker Host: " . gethostname() . " | " . $errMsg,
                    ]);
                } catch (\Throwable) {}

                try {
                    if (file_exists($localTempPath)) @unlink($localTempPath);
                } catch (\Throwable) {}
            }
        });

        try {
            $pwd = escapeshellarg($dbConn->db_password);
            $host = escapeshellarg($dbConn->db_host);
            $port = escapeshellarg($dbConn->db_port ?? 3306);
            $user = escapeshellarg($dbConn->db_username);

            if ($isAllDatabases) {
                $dumpCmd = sprintf(
                    "MYSQL_PWD=%s mysqldump --single-transaction --quick --skip-lock-tables -h %s -P %s -u %s --all-databases",
                    $pwd, $host, $port, $user
                );
            } else {
                $dbName = escapeshellarg($dbConn->db_name);
                $dumpCmd = sprintf(
                    "MYSQL_PWD=%s mysqldump --single-transaction --quick --skip-lock-tables -h %s -P %s -u %s %s",
                    $pwd, $host, $port, $user, $dbName
                );
            }

            $remoteFileEsc = escapeshellarg($remoteFile);
            $remoteErrEsc = escapeshellarg($remoteErr);
            $remoteDoneEsc = escapeshellarg($remoteDone);
            $remotePidEsc = escapeshellarg($remotePid);

            $innerCmd = "{$dumpCmd} 2>{$remoteErr} | gzip > {$remoteFile} && echo done > {$remoteDone}";
            $encodedCmd = base64_encode($innerCmd);
            $bgCmd = "nohup bash -c \"\$(echo {$encodedCmd} | base64 -d)\" > {$remoteErr} 2>&1 & echo \$! > {$remotePid}";
            $sshService->executeBackground($server, $bgCmd);

            $sshPolling = $sshService->connect($server);
            $sshPolling->setTimeout(15);
            if (method_exists($sshPolling, 'setKeepAlive')) {
                $sshPolling->setKeepAlive(10);
            }

            $maxWait = 7200;
            $waited = 0;
            $interval = 5;
            while ($waited < $maxWait) {
                sleep($interval);
                $waited += $interval;
                try {
                    $doneCheck = trim($sshPolling->exec("cat {$remoteDoneEsc} 2>/dev/null"));
                    if ($doneCheck === 'done') {
                        break;
                    }
                    $pidVal = trim($sshPolling->exec("cat {$remotePidEsc} 2>/dev/null"));
                    if ($pidVal) {
                        $isAlive = trim($sshPolling->exec("kill -0 {$pidVal} 2>/dev/null; echo \$?"));
                        if ($isAlive !== '0') {
                            $doneCheck = trim($sshPolling->exec("cat {$remoteDoneEsc} 2>/dev/null"));
                            if ($doneCheck === 'done') {
                                break;
                            }
                            $errContent = trim($sshPolling->exec("cat {$remoteErrEsc} 2>/dev/null"));
                            throw new Exception("Dump process died unexpectedly. stderr: {$errContent}");
                        }
                    }
                } catch (Exception $e) {
                    if (str_contains($e->getMessage(), 'Dump process died')) {
                        throw $e;
                    }
                }
            }

            if ($waited >= $maxWait) {
                throw new Exception("Dump timed out after {$maxWait}s.");
            }

            $errContent = trim($sshPolling->exec("cat {$remoteErrEsc} 2>/dev/null"));
            if ($errContent && (stripos($errContent, 'error') !== false || stripos($errContent, 'denied') !== false)) {
                throw new Exception("mysqldump error: {$errContent}");
            }

            $sftp = $sshService->sftp($server);
            $downloaded = $sftp->get($remoteFile, $localTempPath);
            if (!$downloaded) {
                throw new Exception("Failed to download backup file from server via SFTP.");
            }

            $fileSize = filesize($localTempPath);
            $this->backupJob->update([
                'file_name' => $tempFileName,
                'file_size_bytes' => $fileSize,
            ]);

            // Upload to EnStorage
            $userStorage = UserStorage::where('user_id', $this->backupJob->triggered_by_user ?? $server->user_id)
                ->where('provider', 'enstorage')
                ->whereRaw('"is_active" = true')
                ->first();

            if (!$userStorage) {
                throw new Exception("No active EnStorage configuration found for backup.");
            }

            $enStorageService->configure($userStorage);
            $rootFolderId = $enStorageService->getOrCreateFolder($userStorage->folder_name ?: 'EnCenter_Backups');
            if ($rootFolderId !== $userStorage->folder_id) {
                $userStorage->update(['folder_id' => $rootFolderId]);
            }
            $dateFolderId = $enStorageService->getOrCreateSubfolder($dateFolder, $rootFolderId);
            $uploadResult = $enStorageService->uploadFile($localTempPath, $tempFileName, $dateFolderId);

            if (!$uploadResult['file_id']) {
                throw new Exception("EnStorage upload failed (no file ID returned).");
            }

            $duration = (int) max(1, (int) ceil(microtime(true) - $startTime));
            $directDownloadUrl = $uploadResult['download_url'] ?? $uploadResult['file_url'];
            $previewUrl = $uploadResult['preview_url'] ?? $uploadResult['file_url'];

            // Success
            $this->backupJob->update([
                'status' => 'success',
                'finished_at' => now(),
                'duration_seconds' => $duration,
                'storage_file_id' => $uploadResult['file_id'],
                'storage_file_url' => $directDownloadUrl,
                'error_message' => null,
            ]);

            $isFinished = true;

            $user = \App\Models\User::find($this->backupJob->triggered_by_user ?? $server->user_id);
            if ($user) {
                try {
                    $webhookService->send('backup.success', [
                        'backup_job_id' => $this->backupJob->id,
                        'server_label' => $server->label,
                        'database_label' => $dbConn->label,
                        'status' => 'success',
                        'file_name' => $tempFileName,
                        'file_size_bytes' => $fileSize,
                        'download_url' => $directDownloadUrl,
                        'preview_url' => $previewUrl,
                        'storage_file_url' => $directDownloadUrl,
                        'gdrive_file_url' => $directDownloadUrl, // backward compatibility
                        'duration_seconds' => $duration,
                        'duration_human' => $this->formatDuration($duration),
                        'triggered_by' => $this->backupJob->triggered_by,
                    ], $user);
                    $this->backupJob->update([
                        'webhook_sent' => \Illuminate\Support\Facades\DB::raw('true'),
                        'webhook_sent_at' => now(),
                    ]);
                } catch (\Throwable $we) {
                    \Illuminate\Support\Facades\Log::error("Webhook success failed for backup {$this->backupJob->id}: " . $we->getMessage());
                }
            }

            // Cleanup
            try {
                $sftp->delete($remoteFile);
                $sshService->execute($server, "rm -f {$remotePidEsc} {$remoteErrEsc} {$remoteDoneEsc} 2>/dev/null; true");
            } catch (\Throwable $e) {}
            try {
                if (file_exists($localTempPath)) unlink($localTempPath);
            } catch (\Throwable $e) {}

        } catch (Throwable $e) {
            $isFinished = true;
            $duration = (int) max(1, (int) ceil(microtime(true) - $startTime));
            $this->backupJob->update([
                'status' => 'failed',
                'finished_at' => now(),
                'duration_seconds' => $duration,
                'error_message' => "Worker Host: " . gethostname() . " | " . $e->getMessage(),
            ]);

            try {
                $sshService->execute($server, "rm -f {$remoteFile} {$remotePidEsc} {$remoteErrEsc} {$remoteDoneEsc} 2>/dev/null; true");
            } catch (\Throwable $ce) {}

            try {
                if (file_exists($localTempPath)) unlink($localTempPath);
            } catch (\Throwable $ce) {}

            $user = \App\Models\User::find($this->backupJob->triggered_by_user ?? $server->user_id ?? null);
            if ($user) {
                try {
                    $webhookService->send('backup.failed', [
                        'backup_job_id' => $this->backupJob->id,
                        'server_label' => $server->label ?? 'Unknown',
                        'database_label' => $dbConn->label ?? 'Unknown',
                        'status' => 'failed',
                        'error_message' => $e->getMessage(),
                        'duration_seconds' => $duration,
                        'duration_human' => $this->formatDuration($duration),
                        'triggered_by' => $this->backupJob->triggered_by,
                    ], $user);
                    $this->backupJob->update([
                        'webhook_sent' => \Illuminate\Support\Facades\DB::raw('true'),
                        'webhook_sent_at' => now(),
                    ]);
                } catch (\Throwable $we) {
                    \Illuminate\Support\Facades\Log::error("Webhook failed for backup {$this->backupJob->id}: " . $we->getMessage());
                }
            }

            throw $e;
        }
    }
}
