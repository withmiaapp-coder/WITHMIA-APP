<?php

namespace App\Console\Commands;

use App\Services\N8nService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Actualiza los workflows de bot activos para usar el endpoint unificado CalendarHub.
 * 
 * Esto cambia los nodos "Consultar Disponibilidad" y "Agendar Cita" de:
 *   /api/calendar/bot/availability → /api/calendar-hub/bot/availability
 *   /api/calendar/bot/create-event → /api/calendar-hub/bot/create-event
 * 
 * Y actualiza el system prompt con instrucciones multi-proveedor.
 */
class UpdateCalendarWorkflows extends Command
{
    protected $signature = 'workflows:update-calendar';
    protected $description = 'Update active bot workflows to use unified CalendarHub endpoint';

    public function handle(N8nService $n8nService)
    {
        $this->info('Fetching all n8n workflows...');
        
        $result = $n8nService->getWorkflows();
        if (!$result['success']) {
            $this->error('Failed to fetch workflows: ' . ($result['error'] ?? 'unknown'));
            return 1;
        }

        $workflows = $result['data'] ?? [];
        $updated = 0;

        foreach ($workflows as $wf) {
            $name = $wf['name'] ?? '';
            $id = $wf['id'] ?? '';
            
            // Solo procesar workflows de bot de WITHMIA
            if (!str_contains($name, 'WITHMIA Bot')) {
                continue;
            }

            $this->info("Processing: {$name} (ID: {$id})");

            // Obtener el workflow completo
            $details = $n8nService->getWorkflow($id);
            if (!$details['success']) {
                $this->warn("  Could not fetch workflow details, skipping");
                continue;
            }

            $workflow = $details['data'];
            $nodes = $workflow['nodes'] ?? [];
            $changed = false;

            foreach ($nodes as &$node) {
                $params = $node['parameters'] ?? [];

                // Actualizar el nodo "Consultar Disponibilidad"
                if (($node['name'] ?? '') === 'Consultar Disponibilidad' || ($node['id'] ?? '') === 'tool-calendar-availability') {
                    $url = $params['url'] ?? '';
                    if (str_contains($url, '/api/calendar/bot/availability')) {
                        // Reemplazar con el hub URL
                        $newUrl = str_replace('/api/calendar/bot/availability', '/api/calendar-hub/bot/availability', $url);
                        $node['parameters']['url'] = $newUrl;
                        
                        // Actualizar descripción
                        $node['parameters']['description'] = "=Consulta la disponibilidad de TODOS los calendarios conectados del negocio (Google Calendar, Outlook, Calendly, Reservo, AgendaPro). Usa esta herramienta cuando el cliente quiera agendar una cita, reunion o reserva. Devuelve horarios ocupados, eventos, links de agendamiento (Calendly) y servicios disponibles (Reservo/AgendaPro). Tambien indica si puedes agendar directamente o si debes enviar un link. Parametros: date (YYYY-MM-DD), days_ahead (dias a consultar, default 7).";
                        
                        $changed = true;
                        $this->info("  ✓ Updated 'Consultar Disponibilidad' node");
                    }
                }

                // Actualizar el nodo "Agendar Cita"
                if (($node['name'] ?? '') === 'Agendar Cita' || ($node['id'] ?? '') === 'tool-calendar-create-event') {
                    $url = $params['url'] ?? '';
                    if (str_contains($url, '/api/calendar/bot/create-event')) {
                        // Reemplazar URL
                        $node['parameters']['url'] = str_replace('/api/calendar/bot/create-event', '/api/calendar-hub/bot/create-event', $url);
                        
                        // Agregar parámetros adicionales para booking services
                        $existingParams = $params['bodyParameters']['parameters'] ?? [];
                        $existingNames = array_column($existingParams, 'name');
                        
                        $newParams = [
                            ['name' => 'service_id', 'value' => "={{ \$fromAI('service_id', 'ID del servicio para Reservo o AgendaPro, solo si aplica, si no dejar vacio') }}"],
                            ['name' => 'date', 'value' => "={{ \$fromAI('booking_date', 'Fecha de la reserva en formato YYYY-MM-DD, solo para Reservo/AgendaPro') }}"],
                            ['name' => 'time', 'value' => "={{ \$fromAI('booking_time', 'Hora de la reserva en formato HH:MM, solo para Reservo/AgendaPro') }}"],
                            ['name' => 'client_name', 'value' => "={{ \$fromAI('client_name', 'Nombre del cliente, para Reservo/AgendaPro') }}"],
                        ];

                        foreach ($newParams as $p) {
                            if (!in_array($p['name'], $existingNames)) {
                                $existingParams[] = $p;
                            }
                        }

                        $node['parameters']['bodyParameters']['parameters'] = $existingParams;
                        
                        // Actualizar descripción
                        $node['parameters']['description'] = "Crea una cita, evento o reserva en el calendario del negocio. Funciona con Google Calendar, Outlook, Reservo y AgendaPro automaticamente. Para calendarios (Google/Outlook): usa summary, start_time y end_time (ISO 8601). Para sistemas de reservas (Reservo/AgendaPro): usa service_id, date (YYYY-MM-DD), time (HH:MM), client_name. Siempre incluye attendee_name y attendee_phone si los tienes. Usa esta herramienta DESPUES de consultar disponibilidad y confirmar con el cliente.";
                        
                        $changed = true;
                        $this->info("  ✓ Updated 'Agendar Cita' node");
                    }
                }

                // Actualizar el system prompt del AI Agent
                if (($node['name'] ?? '') === 'AI Agent' || ($node['id'] ?? '') === 'ai-agent') {
                    $text = $params['text'] ?? '';
                    if (str_contains($text, 'Si no hay calendario conectado, informa que no hay sistema')) {
                        $oldPrompt = "AGENDAMIENTO DE CITAS:\n- Si el cliente quiere agendar una cita, reunion o reserva, usa la herramienta \"Consultar Disponibilidad\" para ver los horarios disponibles\n- Presenta las opciones de horario disponibles al cliente de forma clara y breve\n- Cuando el cliente confirme fecha y hora, usa la herramienta \"Agendar Cita\" para crear el evento\n- SIEMPRE confirma los datos antes de agendar: fecha, hora y nombre del cliente\n- Si no hay calendario conectado, informa que no hay sistema de agendamiento y ofrece conectar con el equipo";
                        
                        $newPrompt = "AGENDAMIENTO DE CITAS:\n- Si el cliente quiere agendar una cita, reunion o reserva, usa la herramienta \"Consultar Disponibilidad\" para ver los horarios disponibles\n- La herramienta consulta TODOS los calendarios conectados (Google Calendar, Outlook, Calendly, Reservo, AgendaPro) automaticamente\n- Presenta las opciones de horario disponibles al cliente de forma clara y breve\n- Si la respuesta incluye \"scheduling_links\" (Calendly), envia el link correspondiente al cliente para que agende\n- Si la respuesta incluye \"booking_services\" (Reservo/AgendaPro), pregunta al cliente que servicio desea antes de agendar\n- Cuando el cliente confirme fecha y hora, usa la herramienta \"Agendar Cita\" para crear el evento\n- SIEMPRE confirma los datos antes de agendar: fecha, hora y nombre del cliente\n- Si responde que no hay calendarios conectados (has_calendar=false), informa que no hay sistema de agendamiento y ofrece conectar con el equipo\n- Lee el campo \"instructions\" de la respuesta de disponibilidad para saber como proceder con cada proveedor";
                        
                        $node['parameters']['text'] = str_replace($oldPrompt, $newPrompt, $text);
                        $changed = true;
                        $this->info("  ✓ Updated AI Agent system prompt");
                    }
                }
            }

            if ($changed) {
                // Primero desactivar, luego actualizar, luego reactivar
                $isActive = $workflow['active'] ?? false;
                
                if ($isActive) {
                    $n8nService->deactivateWorkflow($id);
                }

                $updateResult = $n8nService->updateWorkflow($id, [
                    'nodes' => $nodes,
                ]);

                if ($updateResult['success']) {
                    if ($isActive) {
                        $n8nService->activateWorkflow($id);
                    }
                    $updated++;
                    $this->info("  ✓ Workflow updated and reactivated successfully");
                } else {
                    $this->error("  ✗ Failed to update: " . ($updateResult['error'] ?? 'unknown'));
                    if ($isActive) {
                        $n8nService->activateWorkflow($id); // Reactivar aunque falle
                    }
                }
            } else {
                $this->info("  - No changes needed");
            }
        }

        $this->info("\nDone! Updated {$updated} workflow(s).");
        return 0;
    }
}
