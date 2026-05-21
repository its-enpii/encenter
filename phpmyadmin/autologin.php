<?php
declare(strict_types=1);

// Tell PHP we are behind a trusted HTTPS reverse proxy so session cookies
// are sent correctly regardless of the internal HTTP transport.
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    || (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
    || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

// Always set Secure flag to match the actual user-facing protocol,
// and SameSite=None so the cross-origin POST from the dashboard works.
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'domain'   => '',
    'secure'   => $isHttps,
    'httponly' => true,
    'samesite' => $isHttps ? 'None' : 'Lax',
]);

session_name('phpMyAdmin');
session_start();

$username = $_POST['pma_username'] ?? '';
$password = $_POST['pma_password'] ?? '';
$server   = $_POST['pma_servername'] ?? '';

if ($username && $server) {
    if (empty($_SESSION[' PMA_token '])) {
        $_SESSION[' PMA_token '] = bin2hex(random_bytes(16));
    }
    $token = $_SESSION[' PMA_token '];
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Connecting to phpMyAdmin...</title>
    </head>
    <body>
        <p>Redirecting to phpMyAdmin, please wait...</p>
        <form id="autologin" action="index.php?route=/" method="POST">
            <input type="hidden" name="set_session" value="<?php echo htmlspecialchars(session_id()); ?>">
            <input type="hidden" name="token"       value="<?php echo htmlspecialchars($token); ?>">
            <input type="hidden" name="pma_username"   value="<?php echo htmlspecialchars($username); ?>">
            <input type="hidden" name="pma_password"   value="<?php echo htmlspecialchars($password); ?>">
            <input type="hidden" name="pma_servername" value="<?php echo htmlspecialchars($server); ?>">
            <input type="hidden" name="server"      value="1">
        </form>
        <script>document.getElementById('autologin').submit();</script>
    </body>
    </html>
    <?php
    exit;
}

echo "Missing login parameters. Please access through the EnCenter dashboard.";