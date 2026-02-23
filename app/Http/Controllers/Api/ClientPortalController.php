<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ClientPortalController extends Controller
{
    /**
     * Get client portal data by email.
     * Returns: user info, support tickets, subscription info, deep links to app.
     * Public endpoint (rate-limited), authenticated by Google email verification.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email = $validated['email'];

        try {
            // 1. Support tickets
            $tickets = SupportTicket::where('email', $email)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get(['id', 'subject', 'category', 'status', 'created_at', 'updated_at']);

            // 2. User & subscription info
            $user = User::where('email', $email)->first();
            $subscription = null;
            $company = null;
            $account  = null;
            $appLinks = null;

            if ($user) {
                $account = [
                    'name'                 => $user->name,
                    'email'                => $user->email,
                    'role'                 => $user->role,
                    'onboarding_completed' => (bool) $user->onboarding_completed,
                    'created_at'           => $user->created_at?->toIso8601String(),
                    'last_login_at'        => $user->last_login_at?->toIso8601String(),
                ];

                $companyModel = $user->company;
                if ($companyModel) {
                    $company = [
                        'name'           => $companyModel->name,
                        'slug'           => $companyModel->slug,
                        'logo'           => $companyModel->logo_url,
                        'assistant_name' => $companyModel->assistant_name,
                        'timezone'       => $companyModel->timezone,
                        'is_active'      => (bool) $companyModel->is_active,
                    ];

                    // Deep links to the app's real pages
                    $baseUrl = config('app.url', 'https://app.withmia.com');
                    $appLinks = [
                        'dashboard'      => "{$baseUrl}/dashboard/{$companyModel->slug}",
                        'conversations'  => "{$baseUrl}/dashboard/{$companyModel->slug}/conversaciones",
                        'settings'       => "{$baseUrl}/settings/general",
                        'profile'        => "{$baseUrl}/settings/profile",
                        'password'       => "{$baseUrl}/settings/password",
                        'notifications'  => "{$baseUrl}/settings/notifications",
                        'appearance'     => "{$baseUrl}/settings/appearance",
                        'login'          => "{$baseUrl}/login",
                    ];

                    $activeSub = $companyModel->activeSubscription;
                    if ($activeSub) {
                        $subscription = [
                            'plan_name'      => $activeSub->plan_name,
                            'price'          => $activeSub->price,
                            'billing_cycle'  => $activeSub->billing_cycle,
                            'status'         => $activeSub->status,
                            'starts_at'      => $activeSub->starts_at?->toIso8601String(),
                            'ends_at'        => $activeSub->ends_at?->toIso8601String(),
                            'trial_ends_at'  => $activeSub->trial_ends_at?->toIso8601String(),
                            'is_trialing'    => $activeSub->isTrialing(),
                            'trial_days_remaining' => $activeSub->trialDaysRemaining(),
                            'max_agents'     => $activeSub->max_agents,
                            'payment_info'   => [
                                'card_brand'    => $activeSub->payment_info['card_brand'] ?? null,
                                'card_last_four' => $activeSub->payment_info['card_last_four'] ?? null,
                            ],
                        ];
                    }
                }
            }

            return response()->json([
                'success'      => true,
                'tickets'      => $tickets,
                'subscription' => $subscription,
                'company'      => $company,
                'account'      => $account,
                'app_links'    => $appLinks,
                'has_account'  => $user !== null,
            ]);
        } catch (\Exception $e) {
            Log::error('Client portal error', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al cargar los datos.',
            ], 500);
        }
    }
}
