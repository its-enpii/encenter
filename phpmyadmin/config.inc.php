<?php
declare(strict_types=1);

// Blowfish secret encrypts the cookie-auth password and MUST be exactly
// 32 characters. Read it from PMA_BLOWFISH_SECRET (set via docker-compose.yml).
// Generate one with:
//   openssl rand -base64 24 | head -c 32
//
// Refusing to boot without a valid secret prevents accidental deployment
// with a deterministic / weak value.
$blowfishSecret = (string) (getenv('PMA_BLOWFISH_SECRET') ?: '');
if (strlen($blowfishSecret) !== 32) {
    http_response_code(500);
    exit(
        "phpMyAdmin misconfiguration: PMA_BLOWFISH_SECRET must be exactly 32 characters."
        . " Set it in the root .env file (see .env.example) and recreate the container."
    );
}
$cfg['blowfish_secret'] = $blowfishSecret;
$cfg['AllowArbitraryServer'] = true;

$cfg['Servers'][1]['auth_type']       = 'cookie';
$cfg['Servers'][1]['host']            = 'localhost';
$cfg['Servers'][1]['compress']        = false;
$cfg['Servers'][1]['AllowNoPassword'] = false;

$cfg['UploadDir'] = '';
$cfg['SaveDir']   = '';