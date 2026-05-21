<?php
declare(strict_types=1);

/**
 * phpMyAdmin user config - loaded after main config.inc.php
 * Mounted at: /var/www/html/config.user.inc.php
 *
 * Fix: "Failed to set session cookie" when behind HTTPS reverse proxy.
 * phpMyAdmin reads X-Forwarded-Proto and sets Secure cookie flag,
 * but the session cookie itself must NOT use Secure flag because
 * the internal transport between proxy and container is plain HTTP.
 *
 * Solution: explicitly disable Secure cookie flag in phpMyAdmin config.
 */

// Detect if user is actually on HTTPS via reverse proxy
$isHttps = (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    || (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
    || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

// CRITICAL: Set to false so phpMyAdmin does NOT add Secure flag to the
// session cookie. The reverse proxy handles HTTPS termination - the cookie
// travels over HTTP internally which means Secure flag would block it.
$cfg['CookieSecure'] = false;

// Do not force SSL redirect internally
$cfg['ForceSSL'] = false;

// Allow any server to be specified dynamically
$cfg['AllowArbitraryServer'] = true;

// Blowfish secret for cookie encryption (required, 32+ chars)
if (empty($cfg['blowfish_secret'])) {
    $cfg['blowfish_secret'] = 'encenter-pma-secret-key-32chars!!';
}