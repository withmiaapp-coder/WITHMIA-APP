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
        // NOTE: url query is always available, but user() needs lazy eval
        $queryToken = $request->query('auth_token');

        // CRITICAL: share() is called BEFORE route middleware (railway.auth) runs.
        // Use closures so values are evaluated at response time (AFTER all middleware).

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => fn () => [
                'user' => $request->user(),
            ],
            'isSuperAdmin' => fn () => $request->user()?->isSuperAdmin() ?? false,
            'companyTimezone' => function () use ($request) {
                if ($request->user()) {
                    $request->user()->load('company.activeSubscription');
                    return $request->user()->company?->timezone ?? 'UTC';
                }
                return 'UTC';
            },
            'planInfo' => function () use ($request) {
                $default = ['name' => 'Gratis', 'status' => 'free', 'badge_color' => 'gray', 'trial_days' => null];
                if ($request->user()) {
                    $request->user()->load('company.activeSubscription');
                    return $request->user()->company?->plan_info ?? $default;
                }
                return $default;
            },
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'railwayAuthToken' => function () use ($request, $queryToken) {
                return $queryToken ?: $request->user()?->auth_token;
            },
        ];
    }
}
