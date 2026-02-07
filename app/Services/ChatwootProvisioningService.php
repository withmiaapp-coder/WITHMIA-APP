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
            Log::debug("🚀 Starting COMPLETE Chatwoot provisioning for company: {$company->name}");

            DB::beginTransaction();
            $this->chatwootDb->beginTransaction();

            // 1. Crear Account en Chatwoot
            $accountId = $this->createAccount($company);
            Log::debug("✅ Account created: ID={$accountId}");

            // 2. Crear User en Chatwoot (administrator)
            $chatwootUserId = $this->createChatwootUser($owner, $accountId);
            Log::debug("✅ User created: ID={$chatwootUserId}");

            // 3. Crear relación Account-User (administrator)
            $this->createAccountUser($accountId, $chatwootUserId, 1); // role=1 (administrator) - En Chatwoot: 0=agent, 1=administrator
            Log::debug("✅ Account-User relation created");

            // 4. Crear Channel API (con identifier/token para Evolution API)
            $channelData = $this->createChannelApi($accountId);
            $channelId = $channelData['id'];
            $channelToken = $channelData['identifier'];
            Log::debug("✅ Channel API created: ID={$channelId}, Token={$channelToken}");

            // 5. Crear Inbox (usar slug para multi-tenant)
            $inboxName = $company->slug ?? Str::slug($company->name) . '-' . Str::random(6);
            $inboxId = $this->createInbox($accountId, $channelId, $inboxName);
            Log::debug("✅ Inbox created: ID={$inboxId}, Name=WhatsApp {$inboxName}");

            // 6. Asociar User al Inbox
            $this->createInboxMember($chatwootUserId, $inboxId);
            Log::debug("✅ Inbox member created");

            // 7. Crear token de acceso en Chatwoot para el usuario (CRÍTICO para API de Chatwoot)
            $accessToken = $this->createAccessToken($chatwootUserId);

            // 8. Actualizar Company en Laravel
            // chatwoot_api_key = ACCESS TOKEN del usuario (para API de Chatwoot)
            // channel_token se guarda en chatwoot_data para Evolution API
            $company->update([
                'chatwoot_account_id' => $accountId,
                'chatwoot_inbox_id' => $inboxId,
                'chatwoot_provisioned' => true,
                'chatwoot_provisioned_at' => now(),
                'chatwoot_data' => array_merge($company->chatwoot_data ?? [], [
                    'channel_token' => $channelToken, // Token del channel para Evolution API
                    'channel_id' => $channelId,
                ])
            ]);
            // Set chatwoot_api_key via direct assignment (not in $fillable for security)
            $company->chatwoot_api_key = $accessToken;
            $company->save();

            // 9. Actualizar User en Laravel
            $owner->update([
                'chatwoot_agent_id' => $chatwootUserId,
                'chatwoot_inbox_id' => $inboxId,
                'chatwoot_agent_token' => $accessToken,
                'chatwoot_agent_role' => 'administrator',
                'onboarding_completed' => true
            ]);
            $owner->role = 'admin'; // El creador de la empresa siempre es admin
            $owner->save();

            $this->chatwootDb->commit();
            DB::commit();

            Log::debug("🎉 Chatwoot provisioning completed successfully!", [
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
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Provisioning failed'
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
            'type' => 'User', // Tipo de usuario: 'User' o 'SuperAdmin'
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
            'role' => $role, // 0 = agent, 1 = administrator
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
     * Genera un token de acceso único y lo registra en la tabla access_tokens de Chatwoot
     * IMPORTANTE: El token DEBE existir en la tabla access_tokens de Chatwoot
     * para que sea válido en la API de Chatwoot
     */
    private function createAccessToken(int $chatwootUserId): string
    {
        // Generar token único
        $token = Str::random(24);
        
        // Insertar en la tabla access_tokens de Chatwoot
        // Esto es CRÍTICO - sin esto el token no funcionará con la API de Chatwoot
        $this->chatwootDb->table('access_tokens')->insert([
            'owner_type' => 'User',
            'owner_id' => $chatwootUserId,
            'token' => $token,
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        Log::debug('✅ Access token created in Chatwoot', [
            'chatwoot_user_id' => $chatwootUserId,
            'token_prefix' => substr($token, 0, 8) . '...'
        ]);
        
        return $token;
    }

    /**
     * Invita un agente/vendedor a una empresa existente
     * El usuario DEBE existir en Laravel primero
     */
    public function inviteAgent(Company $company, User $agent, string $role = 'agent'): array
    {
        try {
            Log::debug("👤 Inviting agent to company: {$company->name}", [
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
            Log::debug("✅ Agent user created: ID={$chatwootUserId}");

            // 2. Asociar al Account con role correcto (0=agent, 1=administrator)
            $agentRole = ($role === 'administrator') ? 1 : 0;
            $this->createAccountUser($company->chatwoot_account_id, $chatwootUserId, $agentRole);
            Log::debug("✅ Agent added to account with role={$agentRole}");

            // 3. Asociar al Inbox de la empresa
            $inboxId = $this->chatwootDb->table('inboxes')
                ->where('account_id', $company->chatwoot_account_id)
                ->value('id');

            if ($inboxId) {
                $this->createInboxMember($chatwootUserId, $inboxId);
                Log::debug("✅ Agent added to inbox: ID={$inboxId}");
            }

            // 4. Crear token de acceso en Chatwoot para el agente
            $accessToken = $this->createAccessToken($chatwootUserId);

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

            Log::debug("🎉 Agent invited successfully!", [
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
                'error' => 'Failed to invite agent'
            ];
        }
    }

}
