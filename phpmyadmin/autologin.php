<?php
declare(strict_types=1);

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
    <style>body{background:#1e293b;color:#94a3b8;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
</head>
<body>
    <p>Connecting...</p>
    <script>
      sessionStorage.setItem('encenter_pma_user', <?= json_encode($username) ?>);
      sessionStorage.setItem('encenter_pma_pass', <?= json_encode($password) ?>);
      sessionStorage.setItem('encenter_pma_server', <?= json_encode($servername) ?>);
      window.location.replace('index.php');
    </script>
</body>
</html>