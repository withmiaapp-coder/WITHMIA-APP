<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('whatsapp_instances')) {
            Schema::create('whatsapp_instances', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('company_id');
                $table->string('instance_name')->unique(); // ej: 'with-mia-cqwp4d'
                $table->string('instance_url')->nullable(); // ej: 'http://evolution_api:8080'
                $table->string('api_key')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                
                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
                $table->index('instance_name');
            });
        }
        
        // Insert default mapping for company 1 only if company exists
        if (DB::table('companies')->where('id', 1)->exists()) {
            DB::table('whatsapp_instances')->insertOrIgnore([
                'company_id' => 1,
                'instance_name' => 'with-mia-cqwp4d',
                'instance_url' => 'http://evolution_api:8080',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_instances');
    }
};
