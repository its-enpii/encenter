<?php
declare(strict_types=1);

ini_set('session.cookie_secure', '0');
ini_set('session.cookie_samesite', 'Lax');

$cfg['is_https'] = false;
$cfg['ForceSSL'] = false;
$cfg['CookieSecure'] = false;
$cfg['AllowArbitraryServer'] = true;

if (empty($cfg['blowfish_secret'])) {
    $cfg['blowfish_secret'] = 'encenter-pma-secret-key-32chars!!';
}