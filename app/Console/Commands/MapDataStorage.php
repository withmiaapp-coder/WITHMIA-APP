<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Company;
use Illuminate\Support\Facades\DB;

class MapDataStorage extends Command
{
    protected $signature = 'data:map';
    protected $description = 'Mapear exactamente dónde se guarda cada paso y dato del sistema';

    public function handle()
    {
        $this->info('🗺️  MAPEANDO UBICACIÓN DE DATOS EN WITHMIA');
        $this->line('═══════════════════════════════════════════════════════');
        $this->newLine();

        // 1. ANÁLISIS DE TABLA USERS
        $this->info('👤 TABLA USERS - Columnas y datos:');
        $userColumns = DB::select("SHOW COLUMNS FROM users");
        $users = User::all();
        
        foreach ($userColumns as $column) {
            $this->line("   📊 {$column->Field} ({$column->Type})");
            
            // Mostrar datos reales para cada columna
            foreach ($users as $user) {
                $value = $user->{$column->Field};
                if ($value !== null) {
                    $displayValue = is_string($value) ? 
                        (strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value) : 
                        $value;
                    $this->line("      🔹 {$user->name}: {$displayValue}");
                }
            }
            $this->newLine();
        }

        // 2. ANÁLISIS DE TABLA COMPANIES
        $this->info('🏢 TABLA COMPANIES - Columnas y datos:');
        $companyColumns = DB::select("SHOW COLUMNS FROM companies");
        $companies = Company::all();
        
        foreach ($companyColumns as $column) {
            $this->line("   📊 {$column->Field} ({$column->Type})");
            
            foreach ($companies as $company) {
                $value = $company->{$column->Field};
                if ($value !== null) {
                    if ($column->Field === 'settings' && is_array($value)) {
                        $this->line("      🔹 ID {$company->id}: " . json_encode($value, JSON_PRETTY_PRINT));
                    } else {
                        $displayValue = is_string($value) ? 
                            (strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value) : 
                            $value;
                        $this->line("      🔹 ID {$company->id}: {$displayValue}");
                    }
                }
            }
            $this->newLine();
        }

        // 3. MAPEO DE PASOS DE ONBOARDING
        $this->info('📋 MAPEO DE PASOS DE ONBOARDING:');
        $this->newLine();
        
        $onboardingMap = [
            'Paso 1' => [
                'descripcion' => 'Registro inicial',
                'tabla' => 'users',
                'campos' => ['name', 'email', 'password', 'email_verified_at'],
                'estado' => 'onboarding_step = 1'
            ],
            'Paso 2' => [
                'descripcion' => 'Datos personales básicos',
                'tabla' => 'users', 
                'campos' => ['full_name', 'phone'],
                'estado' => 'onboarding_step = 2'
            ],
            'Paso 3' => [
                'descripcion' => 'Información de empresa',
                'tabla' => 'users',
                'campos' => ['company_name', 'company_website', 'company_description'],
                'estado' => 'onboarding_step = 3'
            ],
            'Paso 4' => [
                'descripcion' => 'Caso de uso y volumen',
                'tabla' => 'users',
                'campos' => ['use_case', 'monthly_volume'],
                'estado' => 'onboarding_step = 4'
            ],
            'Paso 5' => [
                'descripcion' => 'Descubrimiento y herramientas',
                'tabla' => 'users',
                'campos' => ['discovery_method', 'current_tools'],
                'estado' => 'onboarding_step = 5'
            ],
            'Paso 6' => [
                'descripcion' => 'Configuración detallada en companies',
                'tabla' => 'companies',
                'campos' => ['settings->onboarding'],
                'estado' => 'onboarding_step = 6'
            ],
            'Paso 7' => [
                'descripcion' => 'Finalización',
                'tabla' => 'users',
                'campos' => ['onboarding_completed_at'],
                'estado' => 'onboarding_step = 7 o onboarding_completed_at != null'
            ]
        ];

        foreach ($onboardingMap as $paso => $info) {
            $this->info("🔢 {$paso}: {$info['descripcion']}");
            $this->line("   📍 Tabla: {$info['tabla']}");
            $this->line("   📋 Campos: " . implode(', ', $info['campos']));
            $this->line("   ⚡ Estado: {$info['estado']}");
            $this->newLine();
        }

        // 4. ANÁLISIS DE DATOS ESPECÍFICOS DE ONBOARDING
        $this->info('🎯 DATOS ESPECÍFICOS DE ONBOARDING POR USUARIO:');
        $this->newLine();

        foreach ($users as $user) {
            $this->info("👤 {$user->name} (ID: {$user->id}):");
            $this->line("   🚀 Paso actual: " . ($user->onboarding_step ?? 'No definido'));
            $this->line("   ✅ Completado: " . ($user->onboarding_completed_at ? 'Sí (' . $user->onboarding_completed_at . ')' : 'No'));
            
            // Datos en tabla users
            $userOnboardingFields = [
                'company_name' => 'Nombre empresa',
                'company_website' => 'Sitio web',
                'company_description' => 'Descripción empresa',
                'use_case' => 'Caso de uso',
                'monthly_volume' => 'Volumen mensual',
                'discovery_method' => 'Método descubrimiento',
                'current_tools' => 'Herramientas actuales'
            ];

            $this->line("   📊 Datos en tabla USERS:");
            foreach ($userOnboardingFields as $field => $label) {
                $value = $user->{$field} ?? 'No especificado';
                $this->line("      🔹 {$label}: {$value}");
            }

            // Datos en tabla companies
            $company = Company::where('user_id', $user->id)->first();
            if ($company && $company->settings) {
                $this->line("   🏢 Datos en tabla COMPANIES (settings):");
                if (isset($company->settings['onboarding'])) {
                    $onboarding = $company->settings['onboarding'];
                    foreach ($onboarding as $key => $value) {
                        if (is_array($value)) {
                            $this->line("      🔹 {$key}: " . implode(', ', $value));
                        } else {
                            $this->line("      🔹 {$key}: {$value}");
                        }
                    }
                }
            } else {
                $this->line("   🏢 Sin datos adicionales en companies");
            }
            $this->newLine();
        }

        // 5. ESQUEMA COMPLETO DE ALMACENAMIENTO
        $this->info('📁 ESQUEMA COMPLETO DE ALMACENAMIENTO:');
        $this->line("═══════════════════════════════════════");
        $this->line("🗃️  USERS TABLE:");
        $this->line("   ├── Datos básicos: name, email, password");
        $this->line("   ├── Perfil: full_name, phone, avatar");
        $this->line("   ├── Empresa básica: company_name, company_website, company_description");
        $this->line("   ├── Negocio: use_case, monthly_volume");
        $this->line("   ├── Descubrimiento: discovery_method, current_tools");
        $this->line("   ├── Control: onboarding_step, onboarding_completed_at");
        $this->line("   ├── Sesión: log_in, log_out, login_ip, last_login_at");
        $this->line("   └── Roles: role (columna legacy) + Spatie Permission");
        $this->newLine();
        
        $this->line("🗃️  COMPANIES TABLE:");
        $this->line("   ├── Relación: user_id (FK)");
        $this->line("   ├── Identidad: name, slug, description");
        $this->line("   ├── Negocio: industry/page, website, logo_url");
        $this->line("   ├── Configuración: settings (JSON)");
        $this->line("   ├── Personalización: branding (JSON)");
        $this->line("   └── Control: timezone, is_active, timestamps");
        $this->newLine();

        $this->line("🗃️  COMPANIES.SETTINGS (JSON):");
        $this->line("   └── onboarding:");
        $this->line("       ├── tools: [array de herramientas]");
        $this->line("       ├── completed: boolean");
        $this->line("       ├── client_type: 'externo'/'interno'");
        $this->line("       ├── has_website: boolean");
        $this->line("       ├── discovered_via: [array de fuentes]");
        $this->line("       ├── monthly_conversations: string");
        $this->line("       └── completed_at: timestamp");

        $this->newLine();
        $this->info('✅ Mapeo completo de datos terminado!');
        
        return 0;
    }
}