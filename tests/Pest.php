<?php

// Pest test configuration for WITHMIA
// https://pestphp.com/docs/configuring-tests

use Illuminate\Foundation\Testing\RefreshDatabase;

pest()
    ->extend(Tests\TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()
    ->extend(Tests\TestCase::class)
    ->in('Unit');
