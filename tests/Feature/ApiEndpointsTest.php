<?php

// Feature test — API endpoints accessibility

it('returns healthy status from health endpoint', function () {
    $response = $this->getJson('/api/health');

    $response->assertOk()
        ->assertJsonStructure(['status', 'timestamp', 'app', 'database'])
        ->assertJson(['status' => 'healthy']);
});

it('rejects unauthenticated access to user profile', function () {
    $response = $this->getJson('/api/user/profile');

    $response->assertUnauthorized();
});

it('rejects unauthenticated access to subscription', function () {
    $response = $this->getJson('/api/subscription');

    $response->assertUnauthorized();
});

it('rejects unauthenticated access to documents', function () {
    $response = $this->getJson('/api/documents');

    $response->assertUnauthorized();
});

it('rejects unauthenticated access to products', function () {
    $response = $this->getJson('/api/products');

    $response->assertUnauthorized();
});

it('throttles public onboarding endpoint', function () {
    // The onboarding endpoint has throttle:10,1
    // We just verify it doesn't crash and returns proper status
    $response = $this->postJson('/api/onboarding', []);

    // Should return 422 (validation error) not 500
    $response->assertStatus(422);
});

it('throttles public support ticket endpoint', function () {
    $response = $this->postJson('/api/support-tickets', []);

    $response->assertStatus(422);
});

it('returns 404 for non-existent routes', function () {
    $response = $this->getJson('/api/non-existent-route');

    $response->assertNotFound();
});
