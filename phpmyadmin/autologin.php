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
<head><title>Connecting...</title></head>
<body>
    <pre id="log">[autologin.php] starting...
</pre>
    <script>
      var log = document.getElementById('log');
      function add(msg) { log.textContent += msg + '\n'; }
      try {
        sessionStorage.setItem('encenter_pma_user', <?= json_encode($username) ?>);
        sessionStorage.setItem('encenter_pma_pass', <?= json_encode($password) ?>);
        sessionStorage.setItem('encenter_pma_server', <?= json_encode($servername) ?>);
        add('[autologin] sessionStorage set OK');
        add('[autologin] verify user: ' + sessionStorage.getItem('encenter_pma_user'));
        add('[autologin] redirecting in 3s...');
        setTimeout(function() {
          window.location.replace('index.php');
        }, 3000);
      } catch (e) {
        add('[autologin] ERROR: ' + e.message);
      }
    </script>
</body>
</html>