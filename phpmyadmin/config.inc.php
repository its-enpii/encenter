<?php
declare(strict_types=1);

/**
 * phpMyAdmin configuration for EnCenter
 * Served as part of the project - no cross-origin issues
 */

// Required: blowfish secret for cookie encryption (change in production)
$cfg['blowfish_secret'] = 'encenter-pma-32char-secret-key!!';

// Allow connecting to any MySQL server (needed for Credential Vault)
$cfg['AllowArbitraryServer'] = true;

// Default server entry (required but user can override via autologin)
$cfg['Servers'][1]['auth_type'] = 'cookie';
$cfg['Servers'][1]['host'] = 'localhost';
$cfg['Servers'][1]['compress'] = false;
$cfg['Servers'][1]['AllowNoPassword'] = false;

// Upload/save dirs
$cfg['UploadDir'] = '';
$cfg['SaveDir'] = '';