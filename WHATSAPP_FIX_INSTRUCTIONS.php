<?php
// Este archivo contiene la versión mejorada del método connect

// INSERTAR ANTES DE getStatus (alrededor línea 211):

    /**
     * Verificar si una instancia existe en Evolution API
     *
     * @param string $instanceName Nombre de la instancia
     * @return bool True si existe, False si no
     */
    private function checkInstanceExists(string $instanceName): bool
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->get("{$this->baseUrl}/instance/fetchInstances", [
                'instanceName' => $instanceName
            ]);

            if (!$response->successful()) {
                Log::warning('Failed to fetch instances', ['status' => $response->status()]);
                return false;
            }

            $data = $response->json();
            $instances = $data ?? [];
            
            // Buscar la instancia específica en la respuesta
            foreach ($instances as $instance) {
                $instName = $instance['instance']['instanceName'] ?? null;
                if ($instName === $instanceName) {
                    Log::info("Instance {$instanceName} found in Evolution API");
                    return true;
                }
            }
            
            Log::info("Instance {$instanceName} not found in Evolution API");
            return false;

        } catch (\Exception $e) {
            Log::error('Error checking instance existence', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }


// REEMPLAZAR EL MÉTODO connect (línea 157-210) CON:

    /**
     * Conectar instancia y obtener código QR
     * AUTO-CREA la instancia si no existe
     *
     * @param string $instanceName Nombre de la instancia
     * @return array
     */
    public function connect(string $instanceName): array
    {
        try {
            // ✨ MEJORA: Verificar si la instancia existe
            $instanceExists = $this->checkInstanceExists($instanceName);
            
            // ✨ MEJORA: Auto-crear si no existe
            if (!$instanceExists) {
                Log::info("🔧 Instance {$instanceName} not found, auto-creating...");
                
                $webhookUrl = config('app.url') . '/api/evolution-whatsapp/webhook';
                $createResult = $this->createInstance($instanceName, $webhookUrl, true);
                
                if (!$createResult['success']) {
                    Log::error("❌ Failed to auto-create instance", [
                        'instance' => $instanceName,
                        'error' => $createResult['error'] ?? 'Unknown error'
                    ]);
                    
                    return [
                        'success' => false,
                        'error' => 'Failed to auto-create instance: ' . ($createResult['error'] ?? 'Unknown error'),
                        'auto_created' => false
                    ];
                }
                
                Log::info("✅ Instance {$instanceName} created successfully");
            }
            
            // Conectar y obtener QR
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->get("{$this->baseUrl}/instance/connect/{$instanceName}");

            if (!$response->successful()) {
                Log::error('Evolution API connect error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return [
                    'success' => false,
                    'error' => $response->json()['message'] ?? 'Failed to connect',
                    'auto_created' => !$instanceExists
                ];
            }

            $data = $response->json();

            // Formatear QR code
            $qrCode = $data['base64'] ?? null;
            if ($qrCode && !str_starts_with($qrCode, 'data:image')) {
                $qrCode = 'data:image/png;base64,' . $qrCode;
            }

            // Invalidar caché
            $this->clearCache($instanceName);

            return [
                'success' => true,
                'qr' => $qrCode,
                'pairingCode' => $data['pairingCode'] ?? null,
                'auto_created' => !$instanceExists,
                'data' => $data
            ];

        } catch (\Exception $e) {
            Log::error('Evolution API connect exception', [
                'message' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

