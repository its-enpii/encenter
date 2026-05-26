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
            $currentStatus = \App\Models\BackupJob::find($this->backupJob->id)->status;
            if ($currentStatus === 'success') {
                $this->delete();
                return;
            }
            
            // If this is a retry attempt, skip - first attempt likely already succeeded
            // but worker timed out before marking complete.
            if ($this->attempts() > 1) {
                $this->delete();
                return;
            }
            
            // 1. Prepare mysqldump command (stream-based, no remote /tmp needed)
            $pwd = escapeshellarg($dbConn->db_password);
            $host = escapeshellarg($dbConn->db_host);
            $port = escapeshellarg($dbConn->db_port ?? 3306);
            $user = escapeshellarg($dbConn->db_username);

            if ($isAllDatabases) {
                // Stream all databases as separate dumps concatenated
                $dumpCommand = sprintf(
                    "DBS=\$(MYSQL_PWD=%s mysql -h %s -P %s -u %s -N -B -e \"SHOW DATABASES;\" | grep -Ev " . escapeshellarg('^(information_schema|performance_schema|sys)$') . "); " .
                    "if [ -z \"\$DBS\" ]; then echo 'ERROR: No databases accessible' 1>&2; exit 1; fi; " .
                    "(for DB in \$DBS; do " .
                    "echo \"-- Database: \$DB\"; " .
                    "MYSQL_PWD=%s mysqldump --single-transaction --quick --skip-lock-tables -h %s -P %s -u %s --databases \"\$DB\"; " .
                    "done) | gzip",
                    $pwd, $host, $port, $user,
                    $pwd, $host, $port, $user
                );
                // Override extension since this is now a single .sql.gz, not tar.gz
                $tempFileName = "{$label}_{$targetDb}_{$timestamp}.sql.gz";
                $localTempPath = storage_path("app/backups/{$tempFileName}");
            } else {
                $dbNameParam = escapeshellarg($dbConn->db_name);
                $dumpCommand = sprintf(
                    "MYSQL_PWD=%s mysqldump --single-transaction --quick --skip-lock-tables -h %s -P %s -u %s %s | gzip",
                    $pwd, $host, $port, $user, $dbNameParam
                );
            }
            
            // 2. Execute on remote server, streaming output directly to local file
            try {
                set_time_limit(0);
                $sshService->streamToFile($server, $dumpCommand, $localTempPath);
            } catch (Exception $e) {
                throw new Exception($e->getMessage());
            }

            // 3. Validate file size
            $fileSize = file_exists($localTempPath) ? filesize($localTempPath) : 0;
            if ($fileSize < 100) {
                throw new Exception("Backup failed resulting in an empty file (size: {$fileSize} bytes).");
            }

            // 4. Record size and mark progress
            $durationSoFar = (int) ceil(microtime(true) - $startTime);
            $this->backupJob->update([
                'file_name' => $tempFileName,
                'file_size_bytes' => $fileSize,
                'duration_seconds' => max(1, $durationSoFar)
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
            
            $rootFolderId = $googleDriveService->getOrCreateFolderByName($userStorage->folder_name ?: 'Backup');
            if ($rootFolderId !== $userStorage->folder_id) {
                $userStorage->update(['folder_id' => $rootFolderId]);
            }

            $dateFolderId = $googleDriveService->getOrCreateSubfolder($dateFolder, $rootFolderId);

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

            // 7. Cleanup local file only (no remote files were ever created)
            try {
                if (file_exists($localTempPath)) {
                    unlink($localTempPath);
                }
            } catch (\Throwable $e) {}

            // Explicitly delete from queue to prevent any retry
            $this->delete();

        } catch (Throwable $e) {
            $duration = (int) ceil(microtime(true) - $startTime);
            $this->backupJob->update([
                'status' => 'failed',
                'finished_at' => now(),
                'duration_seconds' => max(1, $duration),
                'error_message' => $e->getMessage(),
            ]);

            // Cleanup local if exists
            try {
                if (file_exists($localTempPath)) {
                    unlink($localTempPath);
                }
            } catch (\Throwable $e) {}

            throw $e;
        }
    }

    /**
     * Called by Laravel only when all retries are exhausted (final failure).
     */
    public function failed(Throwable $exception): void
    {
        $webhookService = app(\App\Services\WebhookService::class);
        $dbConn = $this->backupJob->databaseConnection;
        $server = $dbConn->server ?? null;

        $user = \App\Models\User::find($this->backupJob->triggered_by_user ?? $server->user_id ?? null);
        if ($user) {
            try {
                $webhookService->send('backup.failed', [
                    'backup_job_id' => $this->backupJob->id,
                    'server_label' => $server->label ?? 'Unknown',
                    'database_label' => $dbConn->label ?? 'Unknown',
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                    'duration_seconds' => $this->backupJob->duration_seconds ?? 0,
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
    }
}