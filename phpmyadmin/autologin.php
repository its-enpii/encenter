<?php
declare(strict_types=1);

/**
 * autologin.php - Pre-fill phpMyAdmin login from EnCenter dashboard
 *
 * Simpler approach: manual session start with correct session cookie params
 * so we do not depend on phpMyAdmin's internal API classes.
 */

// Start session manually using the exact same session name phpMyAdmin uses
session_name('phpMyAdmin');
session_start();

// Generate token manually if not exists
if (empty($_SESSION[' PMA_token '])) {
    $_SESSION[' PMA_token '] = bin2hex(random_bytes(16));
}
$token = $_SESSION[' PMA_token '];

$username   = $_GET['pma_username'] ?? '';
$password   = $_GET['pma_password'] ?? '';
$servername = $_GET['pma_servername'] ?? '';

if (!$username || !$servername) {
    http_response_code(400);
    exit('Missing login parameters. Please access through the EnCenter dashboard.');
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Connecting to phpMyAdmin...</title>
    <style>
        body { background: #1e293b; color: #94a3b8; font-family: monospace;
               display: flex; align-items: center; justify-content: center;
               height: 100vh; margin: 0; }
    </style>
</head>
<body>
    <p>Connecting to database, please wait...</p>
    <form id="f" action="index.php" method="POST">
        <input type="hidden" name="set_session"    value="<?= htmlspecialchars(session_id()) ?>">
        <input type="hidden" name="token"          value="<?= htmlspecialchars($token) ?>">
        <input type="hidden" name="pma_username"   value="<?= htmlspecialchars($username) ?>">
        <input type="hidden" name="pma_password"   value="<?= htmlspecialchars($password) ?>">
        <input type="hidden" name="pma_servername" value="<?= htmlspecialchars($servername) ?>">
        <input type="hidden" name="server"         value="1">
    </form>
    <script>document.getElementById('f').submit();</script>
</body>
</html>