<?php
declare(strict_types=1);

// Override PHP session INI so phpMyAdmin never sets Secure flag on cookies.
// Required when running behind HTTPS reverse proxy — internal transport is HTTP
// so Secure flag prevents the cookie from being sent/received correctly.
ini_set('session.cookie_secure', '0');
ini_set('session.cookie_samesite', 'Lax');

$cfg['ForceSSL'] = false;
$cfg['CookieSecure'] = false;
$cfg['AllowArbitraryServer'] = true;

if (empty($cfg['blowfish_secret'])) {
    $cfg['blowfish_secret'] = 'encenter-pma-secret-key-32chars!!';
}