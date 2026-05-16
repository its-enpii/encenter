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
    public function connect(Server $server, int $timeout = 10): SSH2
    {
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
        $result = $ssh->exec($command);
        
        if ($ssh->getExitStatus() !== 0) {
            throw new Exception("Command failed with exit status {$ssh->getExitStatus()}: " . $result);
        }

        return $result;
    }
}
