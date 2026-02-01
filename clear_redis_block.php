<?php
require_once __DIR__ . '/vendor/autoload.php';

use Predis\Client;

$redis = new Client([
    'scheme' => 'tcp',
    'host' => 'switchyard.proxy.rlwy.net',
    'port' => 50785,
    'password' => 'QxamHcGFsrNuzCDiylXjamVnLgbKvNAt'
]);

$phone = '56956333446';

echo "Valor actual: " . $redis->get($phone) . PHP_EOL;
echo "TTL: " . $redis->ttl($phone) . " segundos" . PHP_EOL;

$redis->del($phone);
echo "Bloqueo eliminado para $phone!" . PHP_EOL;
