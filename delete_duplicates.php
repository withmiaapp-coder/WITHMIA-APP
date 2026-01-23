<?php
$ch = curl_init('https://qdrant-production-f4e7.up.railway.app/collections/company_withmia-rzmpsq_knowledge/points/delete');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'api-key: qdrant_api_key_withmia_2024_secure']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'points' => [17691942528590000, 17691943259640000]
]));
$response = curl_exec($ch);
echo "Resultado: $response\n";
