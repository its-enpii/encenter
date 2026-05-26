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
use Illuminate\Support\Facades\Storage;
use Exception;
use Throwable;

class RunBackupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $backupJob;
    public $timeout = 0; // Unlimited timeout for massive databases
    public $tries = 3;
    public $backoff = [30, 60]; // wait 30s, then 60s before retrying

    /**
     * Create a new job instance.
     */
    public function __construct(BackupJob $backupJob)
    {
        $this->backupJob = $backupJob;
        // Revert queue separation. The running worker listens to default queue.
        // We will enforce sequential running by relying on the single worker.
    }

    /**
     * Execute the job.
     */
    public function handle(SshService $sshService, GoogleDriveService $googleDriveService, \App\Services\WebhookService $webhookService): void
    {
        $startTime = microtime(true);
        
        $this->backupJob->update([
            'status' => 'running',
            'started_at' => now(),
        ]);

        $dbConn = $this->backupJob->databaseConnection;
        $server = $dbConn->server;

        // Build descriptive file name: Label_TargetDB_YYYYMMDD_HHmmss.sql.gz
        $label = preg_replace('/[^A-Za-z0-9_\-]/', '_', $dbConn->label);
        $targetDb = $dbConn->db_name ? preg_replace('/[^A-Za-z0-9_\-]/', '_', $dbConn->db_name) : 'ALL_DATABASES';
        $timestamp = date('Ymd_His');
        $isAllDatabases = !$dbConn->db_name;
        $extension = $isAllDatabases ? "tar.gz" : "sql.gz";
        $tempFileName = "{$label}_{$targetDb}_{$timestamp}.{$extension}";
        $remoteTempPath = "/tmp/{$tempFileName}";
        $localTempPath = storage_path("app/backups/{$tempFileName}");

        // Date folder name (e.g., 20260516)
        $dateFolder = date('Ymd');

        // Ensure local backup directory exists
        if (!file_exists(storage_path('app/backups'))) {
            mkdir(storage_path('app/backups'), 0755, true);
        }

        try {
            // Prevent Zombie processes and state overlap during retries
            // Get fresh data from DB to ensure state is accurate
            $currentStatus = \App\Models\BackupJob::find($this->backupJob->id)->status;
            if ($currentStatus === 'success') {
                return; // Already successful from a previous attempt
            }
            
            // 1. Prepare mysqldump command
            $pwd = escapeshellarg($dbConn->db_password);
            $host = escapeshellarg($dbConn->db_host);
            $port = escapeshellarg($dbConn->db_port ?? 3306);
            $user = escapeshellarg($dbConn->db_username);
            
            // Fix: Wait to make sure unique random hash is truly unique per queue worker
            usleep(random_int(100000, 500000));
            $randomHash = substr(md5(uniqid(mt_rand(), true) . microtime(true)), 0, 13);
            
            $remoteTmpDir = "/tmp/encenter_dump_{$randomHash}";
            $errLog = "/tmp/dump_err_{$randomHash}.log";
            $remoteTempPath = "/tmp/{$tempFileName}";

            // Cleanup leftover files from previous failed backups before starting
            try {
                $sshService->execute($server, "rm -rf /tmp/encenter_dump_* /tmp/dump_err_* 2>/dev/null; true");
            } catch (\Throwable $e) {}

            if ($isAllDatabases) {
                $dumpCommand = sprintf(
                    "set -e; mkdir -p %s; " .
                    "DBS=\$(MYSQL_PWD=%s mysql -h %s -P %s -u %s -N -B -e \"SHOW DATABASES;\" 2> %s | grep -Ev " . escapeshellarg('^(information_schema|performance_schema|sys)$') . "); " .
                    "if [ -z \"\$DBS\" ]; then echo 'No databases found' >> %s; exit 1; fi; " .
                    "for DB in \$DBS; do MYSQL_PWD=%s mysqldump --single-transaction --quick --skip-lock-tables -h %s -P %s -u %s \"\$DB\" 2>> %s | gzip > %s/\${DB}.sql.gz; done; " .
                    "tar -czf %s -C %s . && rm -rf %s",
                    escapeshellarg($remoteTmpDir),
                    $pwd, $host, $port, $user, escapeshellarg($errLog),
                    escapeshellarg($errLog),
                    $pwd, $host, $port, $user, escapeshellarg($errLog), escapeshellarg($remoteTmpDir),
                    escapeshellarg($remoteTempPath), escapeshellarg($remoteTmpDir), escapeshellarg($remoteTmpDir)
                );
            } else {
                $dbNameParam = escapeshellarg($dbConn->db_name);
                $dumpCommand = sprintf(
                    "MYSQL_PWD=%s mysqldump --single-transaction --quick --skip-lock-tables -h %s -P %s -u %s %s 2> %s | gzip > %s",
                    $pwd, $host, $port, $user, $dbNameParam,
                    escapeshellarg($errLog), escapeshellarg($remoteTempPath)
                );
            }
            // 2. Execute on remote server
            try {
                // Remove execution timeout limit for PHP Worker
                set_time_limit(0);
                $sshService->execute($server, $dumpCommand);
            } catch (Exception $e) {
                // Read exact mysql error log if it exists
                $detailedError = '';
                try {
                    // Try to reconnect if the session died
                    $freshSsh = new SshService();
                    $errorLogStr = $freshSsh->execute($server, "cat " . escapeshellarg($errLog) . " 2>/dev/null");
                    if (trim($errorLogStr) !== '') {
                        $detailedError = " MySQL Error Log: " . trim($errorLogStr);
                    }
                } catch (\Throwable $catE) {}
                
                throw new Exception($e->getMessage() . $detailedError);
            }

            // 3. Download via SFTP
            $sftp = $sshService->sftp($server);
            $sftp->get($remoteTempPath, $localTempPath);

            // 4. Get file metadata and validate
            $fileSize = filesize($localTempPath);
            
            // An empty gzip file is 20 bytes. A database dump < 100 bytes is essentially empty/failed.
            if ($fileSize < 100) {
                $errorLogStr = '';
                try {
                    $errorLogStr = $sshService->execute($server, "cat " . escapeshellarg($errLog));
                } catch (\Throwable $e) {}
                
                throw new Exception("Backup failed resulting in an empty file. MySQL Error: " . trim($errorLogStr));
            }

            // Immediately record size and mark upload start
            $durationSoFar = (int) ceil(microtime(true) - $startTime);
            $this->backupJob->update([
                'file_name' => $tempFileName,
                'file_size_bytes' => $fileSize,
                'duration_seconds' => max(1, $durationSoFar) // Temporary update to show UI it's alive
            ]);

            // 5. Upload to Google Drive
            $userStorage = UserStorage::where('user_id', $this->backupJob->triggered_by_user ?? $server->user_id)
                ->where('provider', 'google_drive')
                ->where('is_active', \Illuminate\Support\Facades\DB::raw('true'))
                ->first();

            if (!$userStorage) {
                throw new Exception("No active Google Drive storage found for backup.");
            }

            $googleDriveService->setAccessToken($userStorage);
            
            // Get or create root folder (e.g., "Backup")
            $rootFolderId = $googleDriveService->getOrCreateFolderByName($userStorage->folder_name ?: 'Backup');
            if ($rootFolderId !== $userStorage->folder_id) {
                $userStorage->update(['folder_id' => $rootFolderId]);
            }

            // Get or create date subfolder (e.g., "20260516") inside root folder
            $dateFolderId = $googleDriveService->getOrCreateSubfolder($dateFolder, $rootFolderId);

            // Set specific timeout for GDrive upload based on file size (e.g. max 1 hr)
            set_time_limit(3600);

            $driveFileId = $googleDriveService->uploadFile(
                $localTempPath, 
                $tempFileName, 
                $dateFolderId
            );

            if (!$driveFileId) {
                throw new Exception("Google Drive upload failed silently (no file ID returned).");
            }

            // 6. Success!
            $duration = (int) ceil(microtime(true) - $startTime);
            $this->backupJob->update([
                'status' => 'success',
                'finished_at' => now(),
                'duration_seconds' => max(1, $duration),
                'gdrive_file_id' => $driveFileId,
                'gdrive_file_url' => "https://drive.google.com/open?id={$dateFolderId}"
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
                        'file_size_bytes' => $fileSize ?? 0,
                        'gdrive_file_url' => "https://drive.google.com/open?id={$dateFolderId}",
                        'duration_seconds' => max(1, $duration),
                        'triggered_by' => $this->backupJob->triggered_by,
                    ], $user);

                    $this->backupJob->update([
                        'webhook_sent' => \Illuminate\Support\Facades\DB::raw('true'),
                        'webhook_sent_at' => now(),
                    ]);
                } catch (\Throwable $we) {
                    \Illuminate\Support\Facades\Log::error("Failed to send success webhook for backup {$this->backupJob->id}: " . $we->getMessage());
                }
            }

            // 7. Cleanup
            try {
                // If sftp variable hasn't been defined yet (e.g. error before sftp), this would fail.
                if (isset($sftp)) {
                    // Re-connect SFTP if it timed out during Google Drive Upload
                    try {
                        $sftp->delete($remoteTempPath);
                    } catch (\Throwable $e) {
                        $sftp = $sshService->sftp($server);
                        $sftp->delete($remoteTempPath);
                    }
                }
                $sshService->execute($server, "rm -rf " . escapeshellarg(dirname($errLog)) . " " . escapeshellarg($errLog) . " " . escapeshellarg($remoteTempPath) . " " . escapeshellarg($remoteTmpDir) . " 2>/dev/null");
            } catch (\Throwable $e) {
                // Ignore cleanup errors so they don't trigger the main catch block
                // which would mark a successful backup as failed.
            }
            try {
                if (file_exists($localTempPath)) {
                    unlink($localTempPath);
                }
            } catch (\Throwable $e) {}

        } catch (Throwable $e) {
            $duration = (int) ceil(microtime(true) - $startTime);
            $this->backupJob->update([
                'status' => 'failed',
                'finished_at' => now(),
                'duration_seconds' => max(1, $duration),
                'error_message' => $e->getMessage(),
            ]);

            $user = \App\Models\User::find($this->backupJob->triggered_by_user ?? $server->user_id ?? null);
            if ($user) {
                try {
                    $webhookService->send('backup.failed', [
                        'backup_job_id' => $this->backupJob->id,
                        'server_label' => $server->label ?? 'Unknown',
                        'database_label' => $dbConn->label ?? 'Unknown',
                        'status' => 'failed',
                        'error_message' => $e->getMessage(),
                        'duration_seconds' => max(1, $duration),
                        'triggered_by' => $this->backupJob->triggered_by,
                    ], $user);

                    $this->backupJob->update([
                        'webhook_sent' => \Illuminate\Support\Facades\DB::raw('true'),
                        'webhook_sent_at' => now(),
                    ]);
                } catch (\Throwable $we) {
                    \Illuminate\Support\Facades\Log::error("Failed to send error webhook for backup {$this->backupJob->id}: " . $we->getMessage());
                }
            }

            // Cleanup local if exists
            try {
                if (file_exists($localTempPath)) {
                    unlink($localTempPath);
                }
            } catch (\Throwable $e) {}

            throw $e;
        }
    }
}