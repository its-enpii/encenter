<?php
declare(strict_types=1);

/**
 * phpMyAdmin config for EnCenter
 *
 * Auth flow: dashboard -> autologin.php -> redirect to index.php with credentials
 * in query string -> JS in login form template auto-fills and submits.
 */

$cfg['blowfish_secret'] = 'encenter-pma-32char-secret-key!!';
$cfg['AllowArbitraryServer'] = true;

$cfg['Servers'][1]['auth_type']       = 'cookie';
$cfg['Servers'][1]['host']            = 'localhost';
$cfg['Servers'][1]['compress']        = false;
$cfg['Servers'][1]['AllowNoPassword'] = false;

$cfg['UploadDir'] = '';
$cfg['SaveDir']   = '';