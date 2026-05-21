<?php
declare(strict_types=1);

/**
 * autologin.php - Pre-fill phpMyAdmin login from EnCenter dashboard
 *
 * Flow: dashboard opens pma.domain/autologin.php?params (GET, new tab)
 *       -> autologin.php renders form -> auto-submit to index.php (POST)
 *       -> everything same-origin, no cross-origin cookie issues
 */

$username = $_GET['pma_username'] ?? '';
$password = $_GET['pma_password'] ?? '';
$server   = $_GET['pma_servername'] ?? '';

if (!$username || !$server) {
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
               display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        p { font-size: 14px; }
    </style>
</head>
<body>
    <p>Connecting to database, please wait...</p>
    <form id="f" action="index.php" method="POST">
        <input type="hidden" name="pma_username"   value="<?= htmlspecialchars($username) ?>">
        <input type="hidden" name="pma_password"   value="<?= htmlspecialchars($password) ?>">
        <input type="hidden" name="pma_servername" value="<?= htmlspecialchars($server) ?>">
        <input type="hidden" name="server"         value="1">
    </form>
    <script>document.getElementById('f').submit();</script>
</body>
</html>