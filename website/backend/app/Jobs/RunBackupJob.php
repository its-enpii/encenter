<?php

namespace App\Jobs;

use App\Models\BackupJob;
use App\Models\UserStorage;
use App\Services\GoogleDriveService;
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

    public function handle(SshService $sshService, GoogleDriveService $googleDriveService, \App\Services\WebhookService $webhookService): void
    {
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

        try {
            set_time_limit(0);

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

            // Encode the inner command in base64 to avoid quote escaping issues
            $innerCmd = "{$dumpCmd} 2>{$remoteErr} | gzip > {$remoteFile} && echo done > {$remoteDone}";
            $encodedCmd = base64_encode($innerCmd);
            $bgCmd = "nohup bash -c \"\$(echo {$encodedCmd} | base64 -d)\" > {$remoteErr} 2>&1 & echo \$! > {$remotePid}";
            $sshService->executeBackground($server, $bgCmd);

            // Keep a single SSH connection for polling to avoid connection drops
            $sshPolling = $sshService->connect($server);
            $sshPolling->setTimeout(15);
            if (method_exists($sshPolling, 'setKeepAlive')) {
                $sshPolling->setKeepAlive(10);
            }

            // Poll until done or timeout (2 hours)
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
                    // Check if process still running
                    $pidVal = trim($sshPolling->exec("cat {$remotePidEsc} 2>/dev/null"));
                    if ($pidVal) {
                        $isAlive = trim($sshPolling->exec("kill -0 {$pidVal} 2>/dev/null; echo \$?"));
                        if ($isAlive !== '0') {
                            // Process is dead. Let's double check if .done was created at the very last millisecond
                            $doneCheck = trim($sshPolling->exec("cat {$remoteDoneEsc} 2>/dev/null"));
                            if ($doneCheck === 'done') {
                                break;
                            }
                            // Process died without done file
                            $errMsg = trim($sshPolling->exec("cat {$remoteErrEsc} 2>/dev/null"));
                            $logCheck = trim($sshPolling->exec("ls -la {$remoteErrEsc} {$remoteFileEsc} 2>/dev/null"));
                            
                            // If err is empty and gz file has data, assume it finished successfully but failed to write .done
                            $errSize = trim($sshPolling->exec("stat -c %s {$remoteErrEsc} 2>/dev/null || echo 1"));
                            $gzSize = trim($sshPolling->exec("stat -c %s {$remoteFileEsc} 2>/dev/null || echo 0"));
                            if ($errSize === '0' && (int)$gzSize > 100) {
                                break; // Assume success
                            }
                            
                            throw new Exception("Dump process died unexpectedly. Pid: {$pidVal}. Error: {$errMsg}. Files: {$logCheck}");
                        }
                    }
                } catch (Exception $e) {
                    if (str_contains($e->getMessage(), 'Dump process died')) {
                        throw $e;
                    }
                    // Transient SSH error (e.g. connection dropped) - attempt to reconnect
                    try {
                        $sshPolling = $sshService->connect($server);
                    } catch (\Throwable $reconE) {
                        // Reconnect failed completely, fail the job
                        throw new Exception("SSH Connection lost and cannot reconnect: " . $reconE->getMessage());
                    }
                }
            }

            if ($waited >= $maxWait) {
                throw new Exception("Backup timed out after {$maxWait} seconds.");
            }

            // Check error log
            $errContent = trim($sshPolling->exec("cat {$remoteErrEsc} 2>/dev/null"));
            if (!empty($errContent) && stripos($errContent, 'error') !== false) {
                throw new Exception("Dump error: " . $errContent);
            }

            // Download via SFTP
            $sftp = $sshService->sftp($server);
            $sftp->setTimeout(7200);
            $sftp->get($remoteFile, $localTempPath);

            // Validate
            $fileSize = file_exists($localTempPath) ? filesize($localTempPath) : 0;
            if ($fileSize < 100) {
                throw new Exception("Backup file is empty or too small ({$fileSize} bytes).");
            }

            // Update progress
            $this->backupJob->update([
                'file_name' => $tempFileName,
                'file_size_bytes' => $fileSize,
                'duration_seconds' => max(1, (int) ceil(microtime(true) - $startTime)),
            ]);

            // Upload to Google Drive
            $userStorage = UserStorage::where('user_id', $this->backupJob->triggered_by_user ?? $server->user_id)
                ->where('provider', 'google_drive')
                ->whereRaw('"is_active" = true')
                ->first();

            if (!$userStorage) {
                throw new Exception("No active Google Drive storage found for backup.");
            }

            $googleDriveService->setAccessToken($userStorage);
            $rootFolderId = $googleDriveService->getOrCreateFolderByName($userStorage->folder_name ?: 'Backup');
            if ($rootFolderId !== $userStorage->folder_id) {
                $userStorage->update(['folder_id' => $rootFolderId]);
            }
            $dateFolderId = $googleDriveService->getOrCreateSubfolder($dateFolder, $rootFolderId);
            $driveFileId = $googleDriveService->uploadFile($localTempPath, $tempFileName, $dateFolderId);

            if (!$driveFileId) {
                throw new Exception("Google Drive upload failed (no file ID returned).");
            }

            // Success
            $duration = (int) ceil(microtime(true) - $startTime);
            $this->backupJob->update([
                'status' => 'success',
                'finished_at' => now(),
                'duration_seconds' => max(1, $duration),
                'gdrive_file_id' => $driveFileId,
                'gdrive_file_url' => "https://drive.google.com/open?id={$dateFolderId}",
                'error_message' => null,
            ]);

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
                        'gdrive_file_url' => "https://drive.google.com/open?id={$dateFolderId}",
                        'duration_seconds' => $this->formatDuration(max(1, $duration)),
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
            $duration = (int) ceil(microtime(true) - $startTime);
            $this->backupJob->update([
                'status' => 'failed',
                'finished_at' => now(),
                'duration_seconds' => max(1, $duration),
                'error_message' => "Worker Host: " . gethostname() . " | " . $e->getMessage(),
            ]);

            // Cleanup remote
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
                        'duration_seconds' => $this->formatDuration(max(1, $duration)),
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
