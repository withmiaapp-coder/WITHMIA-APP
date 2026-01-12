<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class ChatwootProvisioningService
{
    private $chatwootDb;

    public function __construct()
    {
        $this->chatwootDb = DB::connection('chatwoot');
    }

    /**
     * Provisiona una empresa completa en Chatwoot con DATOS REALES en PostgreSQL
     * - Crea Account
     * - Crea User (administrator del account)
     * - Crea Channel API
     * - Crea Inbox
     * - Asocia User al Inbox
     * - Crea Account User (relación)
     */
    public function provisionCompanyAccount(Company $company, User $owner): array
    {
        try {
            Log::info("🚀 Starting COMPLETE Chatwoot provisioning for company: {$company->name}");

            DB::beginTransaction();
            $this->chatwootDb->beginTransaction();

            // 1. Crear Account en Chatwoot
            $accountId = $this->createAccount($company);
            Log::info("✅ Account created: ID={$accountId}");

            // 2. Crear User en Chatwoot (administrator)
            $chatwootUserId = $this->createChatwootUser($owner, $accountId);
            Log::info("✅ User created: ID={$chatwootUserId}");

            // 3. Crear relación Account-User (administrator)
            $this->createAccountUser($accountId, $chatwootUserId, 1); // role=1 (administrator)
            Log::info("✅ Account-User relation created");

            // 4. Crear Channel API (con identifier/token para Evolution API)
            $channelData = $this->createChannelApi($accountId);
            $channelId = $channelData['id'];
            $channelToken = $channelData['identifier'];
            Log::info("✅ Channel API created: ID={$channelId}, Token={$channelToken}");

            // 5. Crear Inbox
            $inboxId = $this->createInbox($accountId, $channelId, $company->name);
            Log::info("✅ Inbox created: ID={$inboxId}");

            // 6. Asociar User al Inbox
            $this->createInboxMember($chatwootUserId, $inboxId);
            Log::info("✅ Inbox member created");

            // 7. Generar token de acceso único para el usuario (para API de Chatwoot)
            $accessToken = $this->generateAccessToken();

            // 8. Actualizar Company en Laravel
            // chatwoot_api_key = token del channel (para Evolution API)
            $company->update([
                'chatwoot_account_id' => $accountId,
                'chatwoot_api_key' => $channelToken, // Token del channel para Evolution API
                'chatwoot_inbox_id' => $inboxId,
                'chatwoot_provisioned' => true,
                'chatwoot_provisioned_at' => now()
            ]);

            // 9. Actualizar User en Laravel
            $owner->update([
                'chatwoot_agent_id' => $chatwootUserId,
                'chatwoot_inbox_id' => $inboxId,
                'chatwoot_agent_token' => $accessToken,
                'chatwoot_agent_role' => 'administrator',
                'onboarding_completed' => true
            ]);

            $this->chatwootDb->commit();
            DB::commit();

            Log::info("🎉 Chatwoot provisioning completed successfully!", [
                'company_id' => $company->id,
                'account_id' => $accountId,
                'user_id' => $chatwootUserId,
                'inbox_id' => $inboxId
            ]);

            return [
                'success' => true,
                'account' => [
                    'id' => $accountId,
                    'name' => $company->name,
                    'status' => 'active'
                ],
                'user' => [
                    'id' => $chatwootUserId,
                    'name' => $owner->name,
                    'email' => $owner->email,
                    'role' => 'administrator',
                    'access_token' => $accessToken
                ],
                'inbox' => [
                    'id' => $inboxId,
                    'name' => 'API Inbox',
                    'channel_type' => 'Channel::Api',
                    'status' => 'active'
                ]
            ];

        } catch (Exception $e) {
            $this->chatwootDb->rollBack();
            DB::rollBack();

            Log::error("❌ Chatwoot provisioning FAILED for company {$company->name}: " . $e->getMessage(), [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Crea un Account en Chatwoot (PostgreSQL)
     */
    private function createAccount(Company $company): int
    {
        $accountId = $this->chatwootDb->table('accounts')->insertGetId([
            'name' => $company->name,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return $accountId;
    }

    /**
     * Crea un User en Chatwoot (PostgreSQL)
     */
    private function createChatwootUser(User $owner, int $accountId): int
    {
        // Generar password hash (bcrypt)
        $password = Str::random(32);
        $hashedPassword = bcrypt($password);

        $userId = $this->chatwootDb->table('users')->insertGetId([
            'name' => $owner->name,
            'email' => $owner->email,
            'encrypted_password' => $hashedPassword,
            'uid' => $owner->email,
            'provider' => 'email',
            'confirmed_at' => now(),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return $userId;
    }

    /**
     * Crea la relación Account-User (PostgreSQL)
     */
    private function createAccountUser(int $accountId, int $userId, int $role): void
    {
        $this->chatwootDb->table('account_users')->insert([
            'account_id' => $accountId,
            'user_id' => $userId,
            'role' => $role, // 1 = administrator, 0 = agent
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Crea un Channel API en Chatwoot (PostgreSQL)
     * Genera un identifier (token) único para la integración con Evolution API
     */
    private function createChannelApi(int $accountId): array
    {
        // Generar identifier único (usado como token por Evolution API)
        $identifier = Str::random(24);
        
        $channelId = $this->chatwootDb->table('channel_api')->insertGetId([
            'account_id' => $accountId,
            'webhook_url' => config('evolution.api_url') . '/chatwoot/webhook',
            'identifier' => $identifier,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return [
            'id' => $channelId,
            'identifier' => $identifier
        ];
    }

    /**
     * Crea un Inbox en Chatwoot (PostgreSQL)
     */
    private function createInbox(int $accountId, int $channelId, string $companyName): int
    {
        $inboxId = $this->chatwootDb->table('inboxes')->insertGetId([
            'account_id' => $accountId,
            'name' => "WhatsApp {$companyName}",
            'channel_id' => $channelId,
            'channel_type' => 'Channel::Api',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return $inboxId;
    }

    /**
     * Asocia un User a un Inbox (PostgreSQL)
     */
    private function createInboxMember(int $userId, int $inboxId): void
    {
        $this->chatwootDb->table('inbox_members')->insert([
            'user_id' => $userId,
            'inbox_id' => $inboxId,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Genera un token de acceso único
     */
    private function generateAccessToken(): string
    {
        return Str::random(24);
    }

    /**
     * Invita un agente/vendedor a una empresa existente
     * El usuario DEBE existir en Laravel primero
     */
    public function inviteAgent(Company $company, User $agent, string $role = 'agent'): array
    {
        try {
            Log::info("👤 Inviting agent to company: {$company->name}", [
                'agent_email' => $agent->email,
                'role' => $role
            ]);

            if (!$company->chatwoot_account_id) {
                throw new Exception("Company doesn't have a Chatwoot account. Provision first.");
            }

            DB::beginTransaction();
            $this->chatwootDb->beginTransaction();

            // 1. Crear User en Chatwoot
            $chatwootUserId = $this->createChatwootUser($agent, $company->chatwoot_account_id);
            Log::info("✅ Agent user created: ID={$chatwootUserId}");

            // 2. Asociar al Account con role de agent (0)
            $agentRole = ($role === 'administrator') ? 1 : 0;
            $this->createAccountUser($company->chatwoot_account_id, $chatwootUserId, $agentRole);
            Log::info("✅ Agent added to account with role={$agentRole}");

            // 3. Asociar al Inbox de la empresa
            $inboxId = $this->chatwootDb->table('inboxes')
                ->where('account_id', $company->chatwoot_account_id)
                ->value('id');

            if ($inboxId) {
                $this->createInboxMember($chatwootUserId, $inboxId);
                Log::info("✅ Agent added to inbox: ID={$inboxId}");
            }

            // 4. Generar token para el agente
            $accessToken = $this->generateAccessToken();

            // 5. Actualizar el agente en Laravel
            $agent->update([
                'chatwoot_agent_id' => $chatwootUserId,
                'chatwoot_inbox_id' => $inboxId,
                'chatwoot_agent_token' => $accessToken,
                'chatwoot_agent_role' => $role,
                'company_slug' => $company->slug
            ]);

            $this->chatwootDb->commit();
            DB::commit();

            Log::info("🎉 Agent invited successfully!", [
                'agent_id' => $chatwootUserId,
                'company_id' => $company->id
            ]);

            return [
                'success' => true,
                'agent' => [
                    'id' => $chatwootUserId,
                    'name' => $agent->name,
                    'email' => $agent->email,
                    'role' => $role,
                    'access_token' => $accessToken
                ]
            ];

        } catch (Exception $e) {
            $this->chatwootDb->rollBack();
            DB::rollBack();

            Log::error("❌ Failed to invite agent: " . $e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Obtiene estadísticas del account de Chatwoot
     */
    public function getAccountStats(int $accountId): array
    {
        try {
            $stats = [
                'total_agents' => $this->chatwootDb->table('account_users')
                    ->where('account_id', $accountId)
                    ->count(),
                'total_inboxes' => $this->chatwootDb->table('inboxes')
                    ->where('account_id', $accountId)
                    ->count(),
                'total_conversations' => $this->chatwootDb->table('conversations')
                    ->where('account_id', $accountId)
                    ->count(),
                'active_conversations' => $this->chatwootDb->table('conversations')
                    ->where('account_id', $accountId)
                    ->where('status', 'open')
                    ->count()
            ];

            return [
                'success' => true,
                'stats' => $stats
            ];

        } catch (Exception $e) {
            Log::error("Failed to get account stats: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
