<?php
declare(strict_types=1);

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
]);

header("Location: index.php?$params");
exit;