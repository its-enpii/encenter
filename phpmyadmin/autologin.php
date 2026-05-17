<?php
declare(strict_types=1);

// Gunakan session name bawaan phpMyAdmin
session_name('phpMyAdmin');
session_start();

// Ambil data POST dari Next.js dashboard
$username = $_POST['pma_username'] ?? '';
$password = $_POST['pma_password'] ?? '';
$server = $_POST['pma_servername'] ?? '';

if ($username && $server) {
    // phpMyAdmin menggunakan key dengan spasi depan dan belakang ' PMA_token ' untuk mencegah overwrite
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
            <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
            <input type="hidden" name="pma_username" value="<?php echo htmlspecialchars($username); ?>">
            <input type="hidden" name="pma_password" value="<?php echo htmlspecialchars($password); ?>">
            <input type="hidden" name="pma_servername" value="<?php echo htmlspecialchars($server); ?>">
            <input type="hidden" name="server" value="1">
        </form>
        <script>
            document.getElementById('autologin').submit();
        </script>
    </body>
    </html>
    <?php
    exit;
}

echo "Missing login parameters. Please access through the EnCenter dashboard.";
