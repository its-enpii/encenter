<?php
declare(strict_types=1);

/**
 * autologin.php - Redirect to phpMyAdmin index.php with credentials via GET
 *
 * Since AuthenticationCookie::readCredentials() now reads from $_REQUEST
 * (which includes $_GET), we just redirect with credentials in query string.
 * No CSRF token, no session sharing, no POST - phpMyAdmin will handle it.
 */

$username   = $_GET['pma_username'] ?? '';
$password   = $_GET['pma_password'] ?? '';
$servername = $_GET['pma_servername'] ?? '';

if (!$username || !$servername) {
    http_response_code(400);
    exit('Missing login parameters. Please access through the EnCenter dashboard.');
}

$params = http_build_query([
    'pma_username'   => $username,
    'pma_password'   => $password,
    'pma_servername' => $servername,
    'server'         => 1,
]);

header("Location: index.php?$params");
exit;