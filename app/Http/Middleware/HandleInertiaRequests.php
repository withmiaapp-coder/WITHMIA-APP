<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        
        // Get auth token from query or authenticated user
        $railwayAuthToken = $request->query('auth_token');
        if (!$railwayAuthToken && $request->user()) {
            $railwayAuthToken = $request->user()->auth_token;
        }

        // Get company timezone — eager load company for serialization to frontend
        $companyTimezone = 'UTC';
        $planInfo = ['name' => 'Gratis', 'status' => 'free', 'badge_color' => 'gray', 'trial_days' => null];
        if ($request->user()) {
            $request->user()->load('company.activeSubscription');
            $companyTimezone = $request->user()->company?->timezone ?? 'UTC';
            $planInfo = $request->user()->company?->plan_info ?? $planInfo;
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'isSuperAdmin' => $request->user()?->isSuperAdmin() ?? false,
            'companyTimezone' => $companyTimezone,
            'planInfo' => $planInfo,
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'railwayAuthToken' => $railwayAuthToken,
        ];
    }
}
