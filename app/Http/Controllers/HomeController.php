<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HomeController extends Controller
{
    public function index(Request )
    {
        // Forzar verificación de sesión
        ->session()->start();
        
        // Log para debug
        \Log::info('HomeController accessed', [
            'authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'session_id' => session()->getId(),
            'cookies' => ->cookies->all()
        ]);
        
        // Si el usuario está autenticado, redirigir a onboarding
        if (Auth::check()) {
            return redirect()->route('onboarding');
        }
        
        // Si no está autenticado, redirigir a login
        return redirect()->route('login');
    }
}
