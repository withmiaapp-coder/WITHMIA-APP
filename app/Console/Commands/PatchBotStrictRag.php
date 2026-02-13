<?php

namespace App\Console\Commands;

use App\Services\N8nService;
use Illuminate\Console\Command;

/**
 * Patch all running WITHMIA Bot workflows in n8n to enforce strict RAG-only responses.
 * 
 * Changes:
 * - System prompt: forces ALWAYS searching knowledge base before answering
 * - Tool description: makes Qdrant search MANDATORY for every question
 * - topK: increased from 5 to 10 for better coverage
 */
class PatchBotStrictRag extends Command
{
    protected $signature = 'bot:strict-rag';
    protected $description = 'Patch all WITHMIA Bot workflows to enforce strict RAG-only responses (no hallucinations)';

    public function handle(): int
    {
        $n8nService = app(N8nService::class);

        $this->info('Fetching n8n workflows...');
        $workflows = $n8nService->getWorkflows();

        if (!$workflows['success']) {
            $this->error('Failed to list n8n workflows');
            return 1;
        }

        $botWorkflows = collect($workflows['data'])
            ->filter(fn($wf) => str_starts_with($wf['name'] ?? '', 'WITHMIA Bot'));

        $this->info("Found {$botWorkflows->count()} WITHMIA Bot workflow(s)");

        if ($botWorkflows->isEmpty()) {
            $this->warn('No WITHMIA Bot workflows found');
            return 0;
        }

        // New strict system prompt
        $newPromptText = "=Eres {{ \$('Normalize Data').item.json.config.assistant_name }}, el asistente virtual de {{ \$('Normalize Data').item.json.config.company_name }}.\n\n"
            . "TU IDENTIDAD:\n"
            . "- Tu nombre es {{ \$('Normalize Data').item.json.config.assistant_name }}\n"
            . "- Cuando te pregunten como te llamas, responde que te llamas {{ \$('Normalize Data').item.json.config.assistant_name }}\n"
            . "- Eres el asistente de {{ \$('Normalize Data').item.json.config.company_name }}\n\n"
            . "REGLA FUNDAMENTAL (OBLIGATORIO):\n"
            . "- SIEMPRE debes usar la herramienta \"Buscar en Base de Conocimientos\" ANTES de responder CUALQUIER pregunta del usuario, sin excepcion\n"
            . "- UNICAMENTE puedes responder con informacion que encuentres en los resultados de esa busqueda\n"
            . "- JAMAS inventes, supongas, improvises o uses conocimiento general de tu entrenamiento\n"
            . "- Si la busqueda NO devuelve informacion relevante sobre lo que pregunta el usuario, responde EXACTAMENTE: \"No tengo esa informacion disponible. Te gustaria que te conecte con alguien del equipo para ayudarte?\"\n"
            . "- No mezcles informacion de la base de conocimientos con informacion que imagines o sepas por entrenamiento general\n"
            . "- Cada respuesta tuya DEBE estar respaldada por informacion encontrada en la busqueda\n\n"
            . "ESTILO DE RESPUESTA:\n"
            . "- Respondes como si respondieras por redes sociales: natural, cercano y directo\n"
            . "- Maximo 2-3 oraciones por respuesta\n"
            . "- Amigable y profesional\n\n"
            . "PROHIBICIONES ABSOLUTAS:\n"
            . "- PROHIBIDO responder con informacion que NO provenga de tu base de conocimientos\n"
            . "- PROHIBIDO inventar datos sobre la empresa, productos, servicios, precios, horarios o cualquier otro dato\n"
            . "- NO te presentes dos veces en la conversacion\n"
            . "- NO uses markdown ni formato especial\n"
            . "- NO respondas en bloques largos\n"
            . "- NO uses puntos suspensivos (...)\n"
            . "- NO uses asteriscos ni negritas\n\n"
            . "Fecha: {{ \$now.format('dd MMM. yyyy', 'es') }}\n"
            . "Nombre del usuario: {{ \$('Normalize Data').item.json.user.name }}\n"
            . "Numero: {{ \$('Normalize Data').item.json.message.chat_id }}\n"
            . "Tipo de mensaje: {{ \$('Normalize Data').item.json.message.content_type }}\n\n"
            . "Mensaje:\n={{ \$json.chat_input }}";

        // New mandatory tool description
        $newToolDesc = "=HERRAMIENTA OBLIGATORIA. Debes usar esta herramienta SIEMPRE para CADA pregunta del usuario, ANTES de formular tu respuesta. "
            . "Busca informacion en la base de conocimientos de {{ \$('Normalize Data').item.json.config.company_name }}. "
            . "Contiene TODA la informacion oficial sobre productos, servicios, horarios, precios y datos de la empresa. "
            . "Si esta herramienta no devuelve resultados relevantes, indica que no tienes esa informacion disponible. "
            . "NUNCA respondas sin consultar esta herramienta primero.";

        foreach ($botWorkflows as $wf) {
            $workflowId = $wf['id'];
            $workflowName = $wf['name'];
            $patches = [];

            $this->info("Processing: {$workflowName} (ID: {$workflowId})");

            try {
                $detail = $n8nService->getWorkflow($workflowId);
                if (!$detail['success']) {
                    $this->error("  Could not fetch workflow {$workflowName}");
                    continue;
                }

                $workflow = $detail['data'];
                $modified = false;

                foreach ($workflow['nodes'] as &$node) {
                    // Patch 1: AI Agent — update system prompt
                    if ($node['name'] === 'AI Agent' && ($node['type'] ?? '') === '@n8n/n8n-nodes-langchain.agent') {
                        $oldPrompt = substr($node['parameters']['text'] ?? '', 0, 80);
                        $node['parameters']['text'] = $newPromptText;
                        $patches[] = 'AI Agent: strict RAG-only prompt';
                        $modified = true;
                        $this->line("  [PATCH] AI Agent prompt updated (was: {$oldPrompt}...)");
                    }

                    // Patch 2: Qdrant tool — update description + topK
                    if ($node['name'] === 'Buscar en Base de Conocimientos' && ($node['type'] ?? '') === '@n8n/n8n-nodes-langchain.vectorStoreQdrant') {
                        $oldTopK = $node['parameters']['topK'] ?? '?';
                        $node['parameters']['toolDescription'] = $newToolDesc;
                        $node['parameters']['topK'] = 10;
                        $patches[] = "Qdrant tool: mandatory description + topK={$oldTopK}→10";
                        $modified = true;
                        $this->line("  [PATCH] Qdrant tool: mandatory description, topK {$oldTopK}→10");
                    }
                }

                if ($modified) {
                    $cleanNodes = [];
                    foreach ($workflow['nodes'] as $n) {
                        if (!isset($n['parameters']) || $n['parameters'] === null ||
                            (is_array($n['parameters']) && empty($n['parameters']))) {
                            $n['parameters'] = new \stdClass();
                        }
                        $cleanNodes[] = $n;
                    }

                    $updatePayload = [
                        'name' => $workflow['name'],
                        'nodes' => $cleanNodes,
                        'connections' => $workflow['connections'],
                        'settings' => $workflow['settings'] ?? new \stdClass(),
                    ];

                    $result = $n8nService->updateWorkflow($workflowId, $updatePayload);

                    if ($result['success']) {
                        if ($wf['active'] ?? false) {
                            $n8nService->activateWorkflow($workflowId);
                            $this->line("  [OK] Re-activated workflow");
                        }
                        $this->info("  SUCCESS: " . implode(', ', $patches));
                    } else {
                        $this->error("  FAILED: " . ($result['error'] ?? 'Update failed'));
                    }
                } else {
                    $this->warn("  No AI Agent / Qdrant nodes found — skipped");
                }
            } catch (\Exception $e) {
                $this->error("  Exception: " . $e->getMessage());
            }
        }

        $this->newLine();
        $this->info('Done! All WITHMIA Bot workflows have been patched for strict RAG-only responses.');
        return 0;
    }
}
