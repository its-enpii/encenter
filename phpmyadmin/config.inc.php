<?php
declare(strict_types=1);

/**
 * phpMyAdmin configuration override for production behind HTTPS reverse proxy.
 *
 * Mounted into container at: /etc/phpmyadmin/conf.d/encenter.php
 *
 * Key settings:
 * - ForceSSL = false        : do not redirect HTTP -> HTTPS internally
 * - CookieSecure = false    : allow session cookie over HTTP internal transport
 *                             (the browser-facing connection IS HTTPS via proxy)
 * - CookieSameSite = 'Lax' : works for same-site POST from dashboard
 */

$cfg['ForceSSL'] = false;

// Override the cookie secure flag so phpMyAdmin does NOT enforce Secure,
// letting the session cookie be set even when internal transport is HTTP.
$cfg['CookieSecure'] = false;

// SameSite=Lax allows the redirect from autologin.php -> index.php
$cfg['CookieSameSite'] = 'Lax';

// Allow any server to be entered (same as PMA_ARBITRARY=1 via env)
$cfg['AllowArbitraryServer'] = true;