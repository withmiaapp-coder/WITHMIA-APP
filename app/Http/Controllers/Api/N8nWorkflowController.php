<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class N8nWorkflowController extends Controller
{
    private $n8nContainer =  ' 51c541c7611a ' ;
    
    public function createWorkflowForCompany(Request $request)
    {
        $request->validate([
             ' company_id '  =>  ' required|integer ' ,
             ' company_name '  =>  ' required|string ' ,
             ' instance_name '  =>  ' required|string ' 
        ]);

        $companyId = $request->company_id;
        $companyName = $request->company_name;
        $instanceName = $request->instance_name;

        try {
            $templateWorkflowId =  ' ZDkQmYvvFrrXRwR9 ' ;
            
            // 1. Exportar workflow template usando CLI
            $exportCmd = docker exec {$this->n8nContainer} n8n export:workflow --id={$templateWorkflowId} --output=/tmp/template_{$companyId}.json 2>&1;
            exec($exportCmd, $exportOutput, $exportCode);
            
            if ($exportCode !== 0) {
                Log::error( ' Error exportando workflow template ' , [
                     ' command '  => $exportCmd,
                     ' output '  => implode(\n, $exportOutput),
                     ' code '  => $exportCode
                ]);
                return response()->json([
                     ' success '  => false,
                     ' message '  =>  ' Error al exportar template de workflow ' 
                ], 500);
            }

            // 2. Leer el JSON exportado
            $readCmd = docker exec {$this->n8nContainer} cat /tmp/template_{$companyId}.json;
            $templateJson = shell_exec($readCmd);
            $templateWorkflow = json_decode($templateJson, true);

            if (!$templateWorkflow) {
                return response()->json([
                     ' success '  => false,
                     ' message '  =>  ' Error al parsear workflow template ' 
                ], 500);
            }

            // 3. Personalizar workflow
            $newWorkflow = $this->customizeWorkflowForCompany(
                $templateWorkflow,
                $companyId,
                $companyName,
                $instanceName
            );

            // 4. Guardar JSON modificado
            $newWorkflowJson = json_encode($newWorkflow, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            $tempFile = /tmp/workflow_company_{$companyId}.json;
            
            $writeCmd = sprintf(
                docker exec {$this->n8nContainer} bash -c %s,
                escapeshellarg(cat > {$tempFile} <<  . escapeshellarg(EOFWF) . \n{$newWorkflowJson}\nEOFWF)
            );
            shell_exec($writeCmd);

            // 5. Importar workflow usando CLI
            $importCmd = docker exec {$this->n8nContainer} n8n import:workflow --input={$tempFile} 2>&1;
            exec($importCmd, $importOutput, $importCode);
            
            $importLog = implode(\n, $importOutput);
            
            if (strpos($importLog,  ' Successfully imported 1 workflow ' ) === false) {
                Log::error( ' Error importando workflow ' , [
                     ' output '  => $importLog,
                     ' code '  => $importCode
                ]);
                return response()->json([
                     ' success '  => false,
                     ' message '  =>  ' Error al importar workflow ' ,
                     ' details '  => $importLog
                ], 500);
            }

            // 6. Extraer ID del workflow creado (está en el nombre del archivo importado o en logs)
            // Por ahora retornamos éxito sin ID exacto
            $webhookUrl = $this->extractWebhookUrl($newWorkflow);

            return response()->json([
                 ' success '  => true,
                 ' message '  =>  ' Workflow creado exitosamente ' ,
                 ' workflow_name '  => $newWorkflow[ ' name ' ],
                 ' webhook_url '  => $webhookUrl
            ]);

        } catch (\Exception $e) {
            Log::error( ' Error al crear workflow para empresa ' , [
                 ' company_id '  => $companyId,
                 ' error '  => $e->getMessage(),
                 ' trace '  => $e->getTraceAsString()
            ]);

            return response()->json([
                 ' success '  => false,
                 ' message '  =>  ' Error al crear workflow:  '  . $e->getMessage()
            ], 500);
        }
    }

    private function customizeWorkflowForCompany($workflow, $companyId, $companyName, $instanceName)
    {
        unset($workflow[ ' id ' ]);
        $workflow[ ' name ' ] = WhatsApp {$companyName} - Bot QR;
        $workflow[ ' versionCounter ' ] = 1;
        $newWebhookId = bin2hex(random_bytes(16));
        
        foreach ($workflow[ ' nodes ' ] as &$node) {
            if ($node[ ' type ' ] ===  ' n8n-nodes-base.webhook ' ) {
                $node[ ' webhookId ' ] = $newWebhookId;
                $node[ ' parameters ' ][ ' path ' ] = whatsapp-{$instanceName};
            }
            
            if ($node[ ' type ' ] ===  ' n8n-nodes-base.httpRequest '  && 
                isset($node[ ' parameters ' ][ ' url ' ]) && 
                strpos($node[ ' parameters ' ][ ' url ' ],  ' message/sendText ' ) !== false) {
                $node[ ' parameters ' ][ ' url ' ] = =http://evolution_api:8080/message/sendText/{{ \$ ' ( ' Normalización 01 ' ).item.json.instance.name }};
            }
            
            if ($node[ ' type ' ] ===  ' n8n-nodes-base.redis '  || 
                $node[ ' type ' ] ===  ' n8n-nodes-base.redisTool ' ) {
                
                if (isset($node[ ' parameters ' ][ ' key ' ])) {
                    $currentKey = $node[ ' parameters ' ][ ' key ' ];
                    if (strpos($currentKey,  ' company_ ' ) === false) {
                        $node[ ' parameters ' ][ ' key ' ] = company_{$companyId}_{$currentKey};
                    }
                }
                
                if (isset($node[ ' parameters ' ][ ' list ' ])) {
                    $currentList = $node[ ' parameters ' ][ ' list ' ];
                    if (strpos($currentList,  ' company_ ' ) === false) {
                        $node[ ' parameters ' ][ ' list ' ] = company_{$companyId}_{$currentList};
                    }
                }
            }
            
            if ($node[ ' type ' ] ===  ' @n8n/n8n-nodes-langchain.memoryBufferWindow ' ) {
                if (isset($node[ ' parameters ' ][ ' sessionKey ' ])) {
                    $node[ ' parameters ' ][ ' sessionKey ' ] = company{$companyId}_{{ \$ ' ( ' Normalización 01 ' ).item.json.message.chat_id }};
                }
            }
        }
        
        return $workflow;
    }

    private function extractWebhookUrl($workflow)
    {
        foreach ($workflow[ ' nodes ' ] as $node) {
            if ($node[ ' type ' ] ===  ' n8n-nodes-base.webhook ' ) {
                $webhookPath = $node[ ' parameters ' ][ ' path ' ] ??  ' unknown ' ;
                return https://n8n-admin.withmia.com/webhook/{$webhookPath};
            }
        }
        return null;
    }

    public function listCompanyWorkflows()
    {
        try {
            $listCmd = docker exec {$this->n8nContainer} n8n list:workflow 2>&1;
            $output = shell_exec($listCmd);
            
            return response()->json([
                 ' success '  => true,
                 ' workflows '  => $output
            ]);

        } catch (\Exception $e) {
            return response()->json([
                 ' success '  => false,
                 ' message '  =>  ' Error:  '  . $e->getMessage()
            ], 500);
        }
    }
}
EOFPHP
echo  N8nWorkflowController CLI version creado
