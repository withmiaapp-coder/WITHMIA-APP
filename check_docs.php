<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Documentos Recientes ===\n";
$docs = DB::table('knowledge_documents')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

foreach($docs as $doc) {
    echo "ID: {$doc->id}\n";
    echo "  User: {$doc->user_id}\n";
    echo "  Category: {$doc->category}\n";
    echo "  File: {$doc->original_filename}\n";
    echo "  Status: {$doc->status}\n";
    echo "  Chunks: {$doc->chunks_count}\n";
    echo "  Created: {$doc->created_at}\n";
    if($doc->error_message) {
        echo "  ERROR: {$doc->error_message}\n";
    }
    echo "---\n";
}

if($docs->isEmpty()) {
    echo "No hay documentos en la tabla.\n";
}
