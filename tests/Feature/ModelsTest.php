<?php

use App\Models\User;
use App\Models\Company;
use App\Models\Subscription;

it('creates a user with correct attributes', function () {
    $user = User::factory()->create([
        'name' => 'Test User',
        'email' => 'test@withmia.com',
        'role' => 'admin',
    ]);

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@withmia.com');
    expect($user->role)->toBe('admin');
    expect($user->id)->toBeInt();
});

it('creates a company with required fields', function () {
    $user = User::factory()->create();
    $company = Company::create([
        'user_id' => $user->id,
        'name' => 'WITHMIA Test Co',
        'slug' => 'withmia-test-co',
        'is_active' => true,
    ]);

    expect($company->name)->toBe('WITHMIA Test Co');
    expect($company->slug)->toBe('withmia-test-co');
    expect($company->is_active)->toBeTrue();
    expect($company->user->id)->toBe($user->id);
});

it('creates a subscription linked to a company', function () {
    $user = User::factory()->create();
    $company = Company::create([
        'user_id' => $user->id,
        'name' => 'Sub Test Co',
        'slug' => 'sub-test-co',
    ]);

    $subscription = Subscription::create([
        'company_id' => $company->id,
        'plan_name' => 'Pro',
        'price' => 24990,
        'billing_cycle' => 'monthly',
        'status' => 'active',
        'max_agents' => 1,
        'max_integrations' => 5,
        'max_monthly_requests' => 2000,
        'starts_at' => now(),
        'ends_at' => now()->addMonth(),
    ]);

    expect($subscription->plan_name)->toBe('Pro');
    expect($subscription->price)->toBe(24990);
    expect($subscription->status)->toBe('active');
    expect($subscription->company->id)->toBe($company->id);
});
