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
      // Clear ALL phpMyAdmin cookies on this domain first.
      // Server-side setcookie() is unreliable because cookie attributes
      // (Secure, __Secure- prefix, SameSite) must match exactly to overwrite.
      document.cookie.split(';').forEach(function(c) {
        var name = c.split('=')[0].trim();
        // Try clearing with all common attribute combinations
        var paths = ['/', '/index.php'];
        var domains = ['', location.hostname, '.' + location.hostname];
        paths.forEach(function(p) {
          domains.forEach(function(d) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + p + (d ? '; domain=' + d : '');
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + p + (d ? '; domain=' + d : '') + '; secure; samesite=lax';
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + p + (d ? '; domain=' + d : '') + '; secure; samesite=none';
          });
        });
      });

      // Pass credentials via sessionStorage to the login form template
      sessionStorage.setItem('encenter_pma_user', <?= json_encode($username) ?>);
      sessionStorage.setItem('encenter_pma_pass', <?= json_encode($password) ?>);
      sessionStorage.setItem('encenter_pma_server', <?= json_encode($servername) ?>);

      // Force a fresh phpMyAdmin session by hitting logout route first
      window.location.replace('index.php?route=/logout');
    </script>
</body>
</html>