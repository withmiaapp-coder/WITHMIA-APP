<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use OpenAI;

class OnboardingApiController extends Controller
{
    // NO AUTH MIDDLEWARE - for API routes

    public function store(Request $request): JsonResponse
    {
        // Log the request for debugging
        Log::info('Onboarding API request received', [
            'data' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        try {
            // For now, just return a success response for debugging
            return response()->json([
                'success' => true,
                'message' => 'Onboarding API endpoint working',
                'received_data' => $request->all()
            ]);

        } catch (\Exception $e) {
            Log::error('Onboarding API error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function improveDescription(Request $request): JsonResponse
    {
        try {
            // Debug logging
            Log::info('Improve description request', [
                'all_input' => $request->all(),
                'json_input' => $request->json()->all(),
                'raw_content' => $request->getContent()
            ]);

            $description = $request->input('description', '');

            if (empty($description)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Descripción no puede estar vacía',
                    'debug' => [
                        'received_description' => $description,
                        'all_input' => $request->all()
                    ]
                ]);
            }

            // Usar OpenAI real para mejorar la descripción
            $improvedDescription = $this->improveWithOpenAI($description);

            Log::info('Description improved with OpenAI', [
                'original' => $description,
                'improved' => $improvedDescription
            ]);

            return response()->json([
                'success' => true,
                'improved_description' => $improvedDescription
            ]);

        } catch (\Exception $e) {
            Log::error('Error improving description:', [
                'error' => $e->getMessage(),
                'description' => $request->input('description'),
                'trace' => $e->getTraceAsString()
            ]);

            // Fallback to simple improvement if OpenAI fails
            $description = $request->input('description', '');
            $fallbackDescription = $this->simpleFallback($description);

            return response()->json([
                'success' => true,
                'improved_description' => $fallbackDescription,
                'note' => 'Used fallback method due to OpenAI error'
            ]);
        }
    }

    /**
     * Mejora la descripción usando OpenAI
     */
    private function improveWithOpenAI($description)
    {
        try {
            // Crear cliente OpenAI con API key desde .env
            $apiKey = env('OPENAI_API_KEY');
            
            if (empty($apiKey)) {
                throw new \Exception('OpenAI API key not configured');
            }

            $client = OpenAI::client($apiKey);

            $result = $client->chat()->create([
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un experto en marketing y redacción comercial. Tu tarea es mejorar descripciones de empresas haciéndolas más profesionales, atractivas y claras. Mantén el mismo sentido pero hazlas más impactantes.'
                    ],
                    [
                        'role' => 'user',
                        'content' => "Mejora esta descripción de empresa: \"$description\". Hazla más profesional y atractiva, pero mantén la esencia. Responde solo con la descripción mejorada, sin explicaciones adicionales."
                    ]
                ],
                'max_tokens' => 250,
                'temperature' => 0.7,
            ]);

            return trim($result->choices[0]->message->content);

        } catch (\Exception $e) {
            Log::error('OpenAI API error', [
                'error' => $e->getMessage(),
                'description' => $description,
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return fallback if OpenAI fails
            return $this->simpleFallback($description);
        }
    }

    /**
     * Fallback simple si OpenAI falla
     */
    private function simpleFallback($description)
    {
        $improved = trim($description);
        $improved = ucfirst($improved);
        
        if (!empty($improved) && !str_ends_with($improved, '.')) {
            $improved .= '.';
        }
        
        return $improved;
    }
}