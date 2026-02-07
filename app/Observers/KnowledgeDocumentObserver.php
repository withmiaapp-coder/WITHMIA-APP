<?php

namespace App\Observers;

use App\Models\KnowledgeDocument;
use App\Services\QdrantService;
use Illuminate\Support\Facades\Log;

class KnowledgeDocumentObserver
{
    /**
     * Handle the KnowledgeDocument "deleting" event.
     * Clean up Qdrant vectors associated with this document.
     */
    public function deleting(KnowledgeDocument $document): void
    {
        $vectorIds = $document->qdrant_vector_ids;

        if (empty($vectorIds) || !is_array($vectorIds)) {
            return;
        }

        $collectionName = $document->qdrant_collection;
        if (empty($collectionName)) {
            return;
        }

        try {
            $qdrantService = new QdrantService();
            $qdrantService->deletePoints($collectionName, $vectorIds);

            Log::info('KnowledgeDocumentObserver: Qdrant vectors deleted', [
                'document_id' => $document->id,
                'collection' => $collectionName,
                'vectors_count' => count($vectorIds),
            ]);
        } catch (\Exception $e) {
            Log::error('KnowledgeDocumentObserver: Failed to delete Qdrant vectors', [
                'document_id' => $document->id,
                'collection' => $collectionName,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
