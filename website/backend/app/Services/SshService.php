<?php

namespace App\Services;

use App\Models\Server;
use phpseclib3\Net\SSH2;
use phpseclib3\Net\SFTP;
use phpseclib3\Crypt\PublicKeyLoader;
use Exception;

class SshService
{
    /**
     * Establish an SSH connection to a server.
     */
    public function connect(Server $server, int $timeout = 30): SSH2
    {
        try {
            $ssh = new SSH2($server->host, $server->port ?? 22, $timeout);

            if ($server->auth_type === 'password') {
                if (!$ssh->login($server->username, $server->password)) {
                    throw new Exception('SSH Login failed: Invalid password.');
                }
            } else {
                try {
                    $key = PublicKeyLoader::load($server->private_key, $server->passphrase ?? false);
                    if (!$ssh->login($server->username, $key)) {
                        throw new Exception('SSH Login failed: Invalid private key.');
                    }
                } catch (Exception $e) {
                    throw new Exception('Failed to load private key: ' . $e->getMessage());
                }
            }

            return $ssh;
        } catch (Exception $e) {
            throw new Exception("SSH Connection failed to {$server->host}: " . $e->getMessage());
        }
    }

    /**
     * Establish an SFTP connection to a server.
     */
    public function sftp(Server $server, int $timeout = 10): SFTP
    {
        $sftp = new SFTP($server->host, $server->port ?? 22, $timeout);

        if ($server->auth_type === 'password') {
            if (!$sftp->login($server->username, $server->password)) {
                throw new Exception('SFTP Login failed: Invalid password.');
            }
        } else {
            try {
                $key = PublicKeyLoader::load($server->private_key, $server->passphrase ?? false);
                if (!$sftp->login($server->username, $key)) {
                    throw new Exception('SFTP Login failed: Invalid private key.');
                }
            } catch (Exception $e) {
                throw new Exception('Failed to load private key for SFTP: ' . $e->getMessage());
            }
        }

        return $sftp;
    }

    /**
     * Execute a command on the remote server.
     */
    public function execute(Server $server, string $command): string
    {
        $ssh = $this->connect($server);
        $ssh->setTimeout(7200);
        if (method_exists($ssh, 'setKeepAlive')) {
            $ssh->setKeepAlive(10);
        }
        
        $result = $ssh->exec($command);
        $exitStatus = $ssh->getExitStatus();
        
        if ($exitStatus !== 0) {
            $statusStr = $exitStatus === false ? 'unknown/timeout/dropped' : (string)$exitStatus;
            \Illuminate\Support\Facades\Log::error("SSH Exec Failed", ['command' => $command, 'exit' => $statusStr, 'output' => $result]);
            throw new Exception("SSH Command failed [{$statusStr}] cmd: {$command}");
        }

        return (string) $result;
    }

    /**
     * Fire-and-forget: send command and disconnect without waiting for exit.
     * Use for starting background processes (nohup) where exit status is irrelevant.
     */
    public function executeBackground(Server $server, string $command): void
    {
        $ssh = $this->connect($server);
        $ssh->setTimeout(30);
        $ssh->exec($command);
        // Do not check exit status - background process may outlive the shell
    }
}
