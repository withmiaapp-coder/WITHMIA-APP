<?php
/**
 * Proxy directo para imágenes de Chatwoot
 * Este archivo NO pasa por el routing de Laravel, evitando problemas de caché
 */

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

// Configurar cURL para seguir redirecciones (Active Storage de Rails las usa)
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER => [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);
curl_close($ch);

// Si hay error de cURL
if ($error) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error de conexión: ' . $error]);
    exit;
}

// Si el servidor devuelve error
if ($httpCode >= 400) {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Archivo no disponible', 'status' => $httpCode]);
    exit;
}

// Si es HTML, probablemente es un error
if (strpos($contentType, 'text/html') !== false) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Archivo no encontrado']);
    exit;
}

// Éxito - devolver la imagen
header('Content-Type: ' . ($contentType ?: 'application/octet-stream'));
header('Cache-Control: public, max-age=86400'); // Cache por 24 horas
header('Access-Control-Allow-Origin: *');
echo $response;
