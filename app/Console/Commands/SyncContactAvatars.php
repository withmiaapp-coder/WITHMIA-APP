<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncContactAvatars extends Command
{
    protected $signature = 'contacts:sync-avatars {--instance=} {--limit=50} {--force : Forzar actualización de todos los avatares, incluso los existentes}';
    protected $description = 'Sincroniza los avatares de contactos desde Evolution API a Chatwoot';

    private ?string $evolutionApiUrl = null;
    private ?string $evolutionApiKey = null;
    private ?string $chatwootUrl = null;
    private ?string $chatwootApiKey = null;
    private int $chatwootAccountId = 1;

    private function initConfig(): void
    {
        // Usar env() directamente ya que config() puede no tener las claves correctas
        $this->evolutionApiUrl = rtrim(env('EVOLUTION_API_URL', ''), '/');
        $this->evolutionApiKey = env('EVOLUTION_API_KEY', '');
        $this->chatwootUrl = rtrim(env('CHATWOOT_BASE_URL', env('CHATWOOT_URL', '')), '/');
        $this->chatwootApiKey = env('CHATWOOT_API_KEY', env('CHATWOOT_PLATFORM_API_TOKEN', ''));
        $this->chatwootAccountId = (int) env('CHATWOOT_ACCOUNT_ID', 1);
    }

    public function handle()
    {
        // Inicializar configuración al ejecutar (no en constructor para evitar errores en build)
        $this->initConfig();
        
        $this->info('=== Sincronización de Avatares ===');
        $this->newLine();

        // Verificar configuración
        if (empty($this->evolutionApiUrl) || empty($this->evolutionApiKey)) {
            $this->error('Configuración de Evolution API no encontrada');
            return 1;
        }
        if (empty($this->chatwootUrl) || empty($this->chatwootApiKey)) {
            $this->error('Configuración de Chatwoot no encontrada');
            return 1;
        }

        // 1. Obtener instancia
        $instanceName = $this->option('instance');
        if (!$instanceName) {
            $instanceName = $this->getActiveInstance();
        }

        if (!$instanceName) {
            $this->error('No se encontró una instancia activa de Evolution API');
            return 1;
        }

        $this->info("Usando instancia: {$instanceName}");

        // 2. Obtener contactos de Chatwoot
        $this->info('Obteniendo contactos de Chatwoot...');
        $contacts = $this->getChatwootContacts();
        
        if (empty($contacts)) {
            $this->warn('No se encontraron contactos en Chatwoot');
            return 0;
        }

        $this->info("Encontrados " . count($contacts) . " contactos");

        // Filtrar contactos que ya tienen avatar (a menos que sea --force)
        $forceUpdate = $this->option('force');
        if (!$forceUpdate) {
            $originalCount = count($contacts);
            $contacts = array_filter($contacts, function($contact) {
                return empty($contact['thumbnail']);
            });
            $filtered = $originalCount - count($contacts);
            if ($filtered > 0) {
                $this->info("Omitidos {$filtered} contactos con avatar existente (usa --force para actualizar)");
            }
        } else {
            $this->warn("Modo FORCE activado - se actualizarán TODOS los avatares");
        }

        // 3. Para cada contacto, obtener foto de perfil de Evolution API
        $limit = (int) $this->option('limit');
        $processed = 0;
        $updated = 0;
        $errors = 0;

        $progressBar = $this->output->createProgressBar(min(count($contacts), $limit));
        $progressBar->start();

        foreach ($contacts as $contact) {
            if ($processed >= $limit) break;

            $phone = $this->extractPhoneNumber($contact);
            if (!$phone) {
                $progressBar->advance();
                $processed++;
                continue;
            }

            try {
                // Obtener foto de perfil desde Evolution API
                $profilePic = $this->getProfilePicture($instanceName, $phone);
                
                if ($profilePic) {
                    // Actualizar avatar en Chatwoot
                    $success = $this->updateChatwootAvatar($contact['id'], $profilePic);
                    if ($success) {
                        $updated++;
                    }
                }
            } catch (\Exception $e) {
                $errors++;
                Log::error("Error actualizando avatar para contacto {$contact['id']}", [
                    'error' => $e->getMessage()
                ]);
            }

            $progressBar->advance();
            $processed++;
            
            // Rate limiting
            usleep(200000); // 200ms entre requests
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->info("=== Resumen ===");
        $this->info("Procesados: {$processed}");
        $this->info("Actualizados: {$updated}");
        $this->info("Errores: {$errors}");

        return 0;
    }

    private function getActiveInstance(): ?string
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->evolutionApiKey
            ])->get("{$this->evolutionApiUrl}/instance/fetchInstances");

            if ($response->successful()) {
                $instances = $response->json();
                foreach ($instances as $instance) {
                    if (isset($instance['instance']['state']) && $instance['instance']['state'] === 'open') {
                        return $instance['instance']['instanceName'] ?? null;
                    }
                }
            }
        } catch (\Exception $e) {
            $this->error("Error obteniendo instancias: " . $e->getMessage());
        }
        return null;
    }

    private function getChatwootContacts(): array
    {
        try {
            $allContacts = [];
            $page = 1;
            
            do {
                $response = Http::withHeaders([
                    'api_access_token' => $this->chatwootApiKey
                ])->get("{$this->chatwootUrl}/api/v1/accounts/{$this->chatwootAccountId}/contacts", [
                    'page' => $page,
                    'per_page' => 100
                ]);

                if (!$response->successful()) {
                    break;
                }

                $data = $response->json();
                $contacts = $data['payload'] ?? $data ?? [];
                
                if (empty($contacts)) break;
                
                $allContacts = array_merge($allContacts, $contacts);
                $page++;
                
            } while (count($contacts) === 100 && $page <= 10); // Max 1000 contactos

            return $allContacts;
        } catch (\Exception $e) {
            $this->error("Error obteniendo contactos: " . $e->getMessage());
            return [];
        }
    }

    private function extractPhoneNumber(array $contact): ?string
    {
        // Buscar el número de teléfono en varios campos
        $phone = $contact['phone_number'] ?? null;
        
        if (!$phone && isset($contact['identifier'])) {
            // El identifier suele ser el número de WhatsApp
            $phone = preg_replace('/[^0-9]/', '', $contact['identifier']);
        }

        if (!$phone && isset($contact['custom_attributes']['phone'])) {
            $phone = $contact['custom_attributes']['phone'];
        }

        if (!$phone) return null;

        // Limpiar el número
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Debe tener al menos 8 dígitos
        if (strlen($phone) < 8) return null;

        return $phone;
    }

    private function getProfilePicture(string $instanceName, string $phone): ?string
    {
        try {
            // Formato WhatsApp: número@s.whatsapp.net
            $jid = "{$phone}@s.whatsapp.net";
            
            $response = Http::withHeaders([
                'apikey' => $this->evolutionApiKey
            ])->post("{$this->evolutionApiUrl}/chat/fetchProfilePictureUrl/{$instanceName}", [
                'number' => $jid
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['profilePictureUrl'] ?? $data['url'] ?? null;
            }
        } catch (\Exception $e) {
            // Silently fail - muchos contactos no tienen foto de perfil pública
        }
        return null;
    }

    private function updateChatwootAvatar(int $contactId, string $avatarUrl): bool
    {
        try {
            // Descargar la imagen
            $imageResponse = Http::timeout(10)->get($avatarUrl);
            
            if (!$imageResponse->successful()) {
                return false;
            }

            $imageContent = $imageResponse->body();
            $contentType = $imageResponse->header('Content-Type') ?? 'image/jpeg';
            
            // Determinar extensión
            $extension = 'jpg';
            if (str_contains($contentType, 'png')) $extension = 'png';
            if (str_contains($contentType, 'webp')) $extension = 'webp';

            // Subir a Chatwoot usando multipart
            $response = Http::withHeaders([
                'api_access_token' => $this->chatwootApiKey
            ])->attach(
                'avatar',
                $imageContent,
                "avatar.{$extension}"
            )->put("{$this->chatwootUrl}/api/v1/accounts/{$this->chatwootAccountId}/contacts/{$contactId}");

            return $response->successful();
        } catch (\Exception $e) {
            Log::warning("Error subiendo avatar a Chatwoot", [
                'contact_id' => $contactId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}
