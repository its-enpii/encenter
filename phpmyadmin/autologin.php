<?php
declare(strict_types=1);

$username   = $_POST['pma_username']   ?? $_GET['pma_username']   ?? '';
$password   = $_POST['pma_password']   ?? $_GET['pma_password']   ?? '';
$servername = $_POST['pma_servername'] ?? $_GET['pma_servername'] ?? '';

if (!$username || !$servername) {
    http_response_code(400);
    exit('Missing login parameters. Please access through the EnCenter dashboard.');
}
?>
<!DOCTYPE html>
<html>
<head><title>Connecting to phpMyAdmin...</title>
<style>body{background:#0f172a;color:#94a3b8;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:14px}</style>
</head>
<body>
    <p>Switching credentials...</p>
    <script>
      sessionStorage.setItem('encenter_pma_user', <?= json_encode($username) ?>);
      sessionStorage.setItem('encenter_pma_pass', <?= json_encode($password) ?>);
      sessionStorage.setItem('encenter_pma_server', <?= json_encode($servername) ?>);

      // Step 1: hit logout endpoint to invalidate any existing phpMyAdmin session
      // (HttpOnly cookies cannot be cleared by JS, but the logout route clears them server-side)
      fetch('index.php?route=/logout', {
        method: 'GET',
        credentials: 'include',
        redirect: 'follow'
      }).finally(function() {
        // Step 2: now redirect to index.php — login form will be shown,
        // and the script in form.twig will read sessionStorage and submit
        window.location.replace('index.php');
      });
    </script>
</body>
</html>