<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();

        return [
            'name' => $firstName,
            'full_name' => "{$firstName} {$lastName}",
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'phone' => fake()->e164PhoneNumber(),
            'role' => 'agent',
            'company_slug' => null,
            'onboarding_step' => 0,
            'onboarding_completed' => false,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Create as admin role.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }

    /**
     * Create as agent role.
     */
    public function agent(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'agent',
        ]);
    }

    /**
     * Create as superadmin role.
     */
    public function superadmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'superadmin',
        ]);
    }

    /**
     * Assign to a specific company by slug.
     */
    public function withCompany(string $slug): static
    {
        return $this->state(fn (array $attributes) => [
            'company_slug' => $slug,
        ]);
    }

    /**
     * Mark onboarding as completed.
     */
    public function onboarded(): static
    {
        return $this->state(fn (array $attributes) => [
            'onboarding_step' => 5,
            'onboarding_completed' => true,
            'onboarding_completed_at' => now(),
        ]);
    }
}
