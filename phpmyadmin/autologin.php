<?php
declare(strict_types=1);

$username   = $_POST['pma_username']   ?? $_GET['pma_username']   ?? '';
$password   = $_POST['pma_password']   ?? $_GET['pma_password']   ?? '';
$servername = $_POST['pma_servername'] ?? $_GET['pma_servername'] ?? '';

if (!$username || !$servername) {
    http_response_code(400);
    exit('Missing login parameters. Please access through the EnCenter dashboard.');
}

// Detect HTTPS via reverse proxy headers
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

// Cookie names match phpMyAdmin convention:
// HTTPS -> __Secure-pmaUser-1_https / __Secure-pmaAuth-1_https
// HTTP  -> pmaUser-1 / pmaAuth-1
$prefix = $isHttps ? '__Secure-' : '';
$suffix = $isHttps ? '_https' : '';

$cookies = [
    $prefix . 'pmaUser-1' . $suffix,
    $prefix . 'pmaAuth-1' . $suffix,
    $prefix . 'pmaServer-1' . $suffix,
    $prefix . 'pmaPass-1' . $suffix,
    'phpMyAdmin', // session cookie
];

// Overwrite each cookie with empty value + past expiry, matching the
// exact attributes phpMyAdmin uses so the browser actually replaces them.
foreach ($cookies as $name) {
    setcookie($name, '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
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
      window.location.replace('index.php');
    </script>
</body>
</html>