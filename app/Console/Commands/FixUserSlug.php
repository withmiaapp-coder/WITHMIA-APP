<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class FixUserSlug extends Command
{
    protected $signature = 'user:fix-slug {email}';
    protected $description = 'Fix company slug for a specific user';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("Usuario no encontrado: {$email}");
            return;
        }
        
        $this->info("Usuario encontrado: {$user->name} ({$user->email})");
        $this->info("Company slug actual: " . ($user->company_slug ?? 'NULL'));
        $this->info("Onboarding step: " . ($user->onboarding_step ?? 'NULL'));
        
        if (!$user->company_slug && $user->onboarding_step >= 7) {
            // Generar slug basado en el nombre
            $baseSlug = \Illuminate\Support\Str::slug($user->name ?? 'empresa');
            $randomCode = strtolower(\Illuminate\Support\Str::random(6));
            $uniqueSlug = $baseSlug . '-' . $randomCode;
            
            $user->update(['company_slug' => $uniqueSlug]);
            
            $this->info("✅ Company slug actualizado: {$uniqueSlug}");
        } else {
            $this->info("No necesita actualización");
        }
    }
}