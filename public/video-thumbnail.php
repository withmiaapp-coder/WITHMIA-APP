<?php
/**
 * Genera thumbnail de video usando ffmpeg
 * Endpoint: /video-thumbnail.php?url=VIDEO_URL
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'URL requerida']);
    exit;
}

$url = urldecode($url);

// Validate URL scheme — only allow https
$scheme = parse_url($url, PHP_URL_SCHEME);
if (!in_array($scheme, ['https', 'http'], true)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Solo se permiten URLs HTTP/HTTPS']);
    exit;
}

// Validar que sea una URL de Chatwoot (host must contain 'chatwoot')
$host = parse_url($url, PHP_URL_HOST);
if (!$host || strpos($host, 'chatwoot') === false) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'URL no autorizada']);
    exit;
}

// SSRF protection: block private/reserved IP ranges
$ip = gethostbyname($host);
if ($ip === $host) {
    // DNS resolution failed
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'No se pudo resolver el host']);
    exit;
}
if (
    filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false
) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'URL apunta a una dirección IP privada/reservada']);
    exit;
}

// Generar nombre único para cache
$cacheKey = md5($url);
$cacheDir = sys_get_temp_dir() . '/video-thumbnails';
$cachePath = $cacheDir . '/' . $cacheKey . '.jpg';

// Crear directorio de cache si no existe
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Si ya existe en cache, devolverlo
if (file_exists($cachePath) && (time() - filemtime($cachePath)) < 86400) {
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: HIT');
    readfile($cachePath);
    exit;
}

// Descargar el video a un archivo temporal
$tempVideo = tempnam(sys_get_temp_dir(), 'video_');

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range: bytes=0-5000000' // Solo descargar primeros 5MB para el thumbnail
    ]
]);

$videoData = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error || ($httpCode >= 400 && $httpCode !== 206)) {
    @unlink($tempVideo);
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'No se pudo descargar el video', 'details' => $error]);
    exit;
}

file_put_contents($tempVideo, $videoData);

// Intentar extraer frame con ffmpeg
$ffmpegPath = trim(shell_exec('which ffmpeg 2>/dev/null') ?? '');
if (empty($ffmpegPath)) {
    $ffmpegPath = '/usr/bin/ffmpeg'; // Path común en Linux
}

$tempThumb = tempnam(sys_get_temp_dir(), 'thumb_') . '.jpg';

// Comando ffmpeg para extraer frame del segundo 0.5
$cmd = sprintf(
    '%s -ss 0.5 -i %s -vframes 1 -q:v 2 -vf "scale=320:-1" %s 2>&1',
    escapeshellcmd($ffmpegPath),
    escapeshellarg($tempVideo),
    escapeshellarg($tempThumb)
);

$output = shell_exec($cmd);

// Limpiar video temporal
@unlink($tempVideo);

// Verificar si se generó el thumbnail
if (file_exists($tempThumb) && filesize($tempThumb) > 0) {
    // Mover a cache
    rename($tempThumb, $cachePath);
    
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: MISS');
    readfile($cachePath);
    exit;
}

// Si ffmpeg falló, intentar con GD (para algunos formatos)
@unlink($tempThumb);

// Fallback: devolver una imagen placeholder generada
$width = 320;
$height = 180;
$img = imagecreatetruecolor($width, $height);

// Gradient de fondo
$color1 = imagecolorallocate($img, 102, 126, 234); // #667eea
$color2 = imagecolorallocate($img, 118, 75, 162);  // #764ba2

for ($y = 0; $y < $height; $y++) {
    $ratio = $y / $height;
    $r = (int)(102 + ($ratio * (118 - 102)));
    $g = (int)(126 + ($ratio * (75 - 126)));
    $b = (int)(234 + ($ratio * (162 - 234)));
    $color = imagecolorallocate($img, $r, $g, $b);
    imageline($img, 0, $y, $width, $y, $color);
}

// Círculo de play
$white = imagecolorallocate($img, 255, 255, 255);
$centerX = $width / 2;
$centerY = $height / 2;
imagefilledellipse($img, $centerX, $centerY, 60, 60, $white);

// Triángulo de play
$purple = imagecolorallocate($img, 102, 126, 234);
$points = [
    $centerX - 8, $centerY - 15,
    $centerX - 8, $centerY + 15,
    $centerX + 15, $centerY
];
imagefilledpolygon($img, $points, 3, $purple);

// Guardar en cache
imagejpeg($img, $cachePath, 90);
imagedestroy($img);

header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=86400');
header('X-Cache: GENERATED');
readfile($cachePath);
