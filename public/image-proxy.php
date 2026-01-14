<?php
/**
 * Proxy para archivos multimedia de Chatwoot (imágenes, videos, audio)
 * Soporta Range requests para streaming de video
 */

// Headers CORS permisivos
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Range, Accept-Ranges, Content-Range');
header('Access-Control-Expose-Headers: Content-Range, Accept-Ranges, Content-Length');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Obtener la URL del parámetro
$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'URL requerida']);
    exit;
}

// Decodificar la URL
$url = urldecode($url);

// Validar que sea una URL de Chatwoot Railway
$host = parse_url($url, PHP_URL_HOST);
if (!$host || strpos($host, 'chatwoot') === false || strpos($host, 'railway.app') === false) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'URL no autorizada']);
    exit;
}

// Headers adicionales para la petición
$headers = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
];

// Si hay Range header, pasarlo al servidor origen (importante para videos)
if (isset($_SERVER['HTTP_RANGE'])) {
    $headers[] = 'Range: ' . $_SERVER['HTTP_RANGE'];
}

// Configurar cURL para seguir redirecciones
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30, // Más tiempo para videos
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_HEADER => true // Incluir headers en respuesta
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$error = curl_error($ch);
curl_close($ch);

// Si hay error de cURL
if ($error) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error de conexión: ' . $error]);
    exit;
}

// Separar headers del body
$responseHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

// Si el servidor devuelve error (excepto 206 Partial Content)
if ($httpCode >= 400) {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Archivo no disponible', 'status' => $httpCode]);
    exit;
}

// Parsear headers de respuesta importantes
$contentType = 'application/octet-stream';
$contentLength = null;
$contentRange = null;
$acceptRanges = null;

foreach (explode("\r\n", $responseHeaders) as $line) {
    if (stripos($line, 'Content-Type:') === 0) {
        $contentType = trim(substr($line, 13));
    } elseif (stripos($line, 'Content-Length:') === 0) {
        $contentLength = trim(substr($line, 15));
    } elseif (stripos($line, 'Content-Range:') === 0) {
        $contentRange = trim(substr($line, 14));
    } elseif (stripos($line, 'Accept-Ranges:') === 0) {
        $acceptRanges = trim(substr($line, 14));
    }
}

// Si es HTML, probablemente es un error
if (strpos($contentType, 'text/html') !== false) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Archivo no encontrado']);
    exit;
}

// Establecer código de respuesta (206 para partial content)
http_response_code($httpCode);

// Headers de respuesta
header('Content-Type: ' . $contentType);
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=86400');

if ($contentLength) {
    header('Content-Length: ' . $contentLength);
}
if ($contentRange) {
    header('Content-Range: ' . $contentRange);
}

echo $body;
