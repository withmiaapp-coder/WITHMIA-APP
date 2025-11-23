<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

class OnboardingStepRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
         = ->input('step', 0);
        
        return match() {
            1 => ->step1Rules(),
            2 => ->step2Rules(),
            3 => ->step3Rules(),
            4 => ->step4Rules(),
            5 => ->step5Rules(),
            6 => ->step6Rules(),
            7 => ->step7Rules(),
            default => []
        };
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'El nombre completo es requerido',
            'full_name.max' => 'El nombre no puede tener más de 255 caracteres',
            'phone.required' => 'El número de teléfono es requerido',
            'phone.max' => 'El teléfono no puede tener más de 20 caracteres',
            'phone_country.required' => 'Selecciona el país del teléfono',
            'company_name.required' => 'El nombre de la empresa es requerido',
            'company_name.max' => 'El nombre de la empresa no puede tener más de 255 caracteres',
            'company_description.max' => 'La descripción no puede tener más de 1000 caracteres',
            'website.url' => 'La URL del sitio web no es válida',
            'monthly_conversations.integer' => 'El volumen debe ser un número entero',
            'monthly_conversations.min' => 'El volumen mínimo es 0',
            'monthly_conversations.max' => 'El volumen máximo es 50000',
        ];
    }

    private function step1Rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'phone_country' => ['required', 'string', 'max:5']
        ];
    }

    private function step2Rules(): array
    {
        return [
            'website' => ['nullable', 'url', 'max:255'],
            'has_website' => ['boolean'],
            'found_via_search' => ['boolean'],
            'company_search' => ['nullable', 'string', 'max:255']
        ];
    }

    private function step3Rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'company_description' => ['nullable', 'string', 'max:1000']
        ];
    }

    private function step4Rules(): array
    {
        return [
            'use_cases' => ['required', 'array', 'min:1'],
            'use_cases.*' => ['string', 'in:ventas,agendamiento,atencion_cliente,soporte_tecnico']
        ];
    }

    private function step5Rules(): array
    {
        return [
            'monthly_conversations' => ['required', 'integer', 'min:0', 'max:50000']
        ];
    }

    private function step6Rules(): array
    {
        return [
            'discovered_via' => ['required', 'string', 'in:redes_sociales,recomendacion,google,otro'],
            'discovered_other' => ['nullable', 'string', 'max:255']
        ];
    }

    private function step7Rules(): array
    {
        return [
            'current_tools' => ['required', 'array', 'min:1'],
            'current_tools.*' => ['string', 'in:whatsapp_business,instagram,facebook,gmail,crm_propio,otras'],
            'other_tools' => ['nullable', 'string', 'max:255']
        ];
    }
}
