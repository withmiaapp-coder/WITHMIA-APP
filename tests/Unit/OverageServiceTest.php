<?php

use App\Services\OverageService;

it('calculates overage price correctly', function () {
    $service = new OverageService();

    expect($service->pricePerPack())->toBe(5990);
    expect($service->isEnabled())->toBeTrue();
    expect($service->maxOverageMessages())->toBe(5000);
});

it('calculates overage cost for given message count', function () {
    $service = new OverageService();

    // 1,000 extra messages = 1 pack = $5,990
    $cost = $service->calculateOverageCost(1000);
    expect($cost)->toBe(5990);

    // 2,500 extra messages = 3 packs (rounds up) = $17,970
    $cost = $service->calculateOverageCost(2500);
    expect($cost)->toBe(17970);
});
