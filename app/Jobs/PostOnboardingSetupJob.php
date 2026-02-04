<?php

namespace App\Jobs;

use App\Models\Company;
use App\Models\User;
use App\Mail\OnboardingCompletedMail;
use App\Mail\OnboardingCompletedNotificationMail;
use App\Services\ChatwootProvisioningService;
use App\Services\N8nService;
use App\Services\QdrantService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PostOnboardingSetupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $userId;
    protected $companyId;
    protected $companySlug;
    protected $userIP;

    public function __construct(int $userId, int $companyId, string $companySlug, string $userIP)
    {
        $this->userId = $userId;
        $this->companyId = $companyId;
        $this->companySlug = $companySlug;
        $this->userIP = $userIP;
    }

    public function handle(N8nService $n8nService, QdrantService $qdrantService, ChatwootProvisioningService $chatwootService)
    {
        $user = User::find($this->userId);
        $company = Company::find($this->companyId);

        if (!$user || !$company) {
            Log::error("PostOnboardingSetupJob: User or Company not found", [
                'user_id' => $this->userId,
                'company_id' => $this->companyId
            ]);
            return;
        }

        Log::info("PostOnboardingSetupJob iniciado para: {$this->companySlug}");

        // 1. Provisionar Chatwoot para la nueva empresa
        try {
            if (!$company->chatwoot_account_id) {
                Log::info("Provisionando Chatwoot para: {$this->companySlug}");
                $chatwootResult = $chatwootService->provisionCompanyAccount($company, $user);
                
                if ($chatwootResult['success'] ?? false) {
                    Log::info("Chatwoot provisionado exitosamente para: {$this->companySlug}", [
                        'account_id' => $chatwootResult['account']['id'] ?? null
                    ]);
                } else {
                    Log::warning("Chatwoot provisioning falló para: {$this->companySlug}", [
                        'error' => $chatwootResult['error'] ?? 'Unknown'
                    ]);
                }
            } else {
                Log::info("Empresa ya tiene Chatwoot configurado: {$this->companySlug}");
            }
        } catch (\Exception $e) {
            Log::error("Error provisionando Chatwoot: " . $e->getMessage());
            // Continuar aunque falle - no bloquea el resto
        }

        // 2. Enviar correos (NO BLOQUEA - si falla, no importa)
        try {
            if (class_exists('App\Mail\OnboardingCompletedNotificationMail')) {
                Mail::to("a.diaz@withmia.com")->send(new OnboardingCompletedNotificationMail($user, $this->userIP, $company));
                Log::info("Correo admin enviado para: {$user->email}");
                
                Mail::to($user->email)->send(new OnboardingCompletedMail($user));
                Log::info("Correo bienvenida enviado a: {$user->email}");
            }
        } catch (\Exception $e) {
            Log::error("Error enviando correos: " . $e->getMessage());
        }

        Log::info("PostOnboardingSetupJob completado para: {$this->companySlug}");
    }
    
    // ⚠️ NOTA: El método createRagWorkflow fue eliminado por ser código muerto.
    // Si se necesita, usar CreateN8nWorkflowsJob en su lugar.
}
