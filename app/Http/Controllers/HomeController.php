<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        // Forzar verificación de sesión
        $request->session()->start();
        
        // Log para debug
        \Log::info('HomeController accessed', [
            'authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'session_id' => session()->getId(),
            'cookies' => $request->cookies->all()
        ]);
        
        // Si el usuario está autenticado, redirigir a onboarding con transición
        if (Auth::check()) {
            return view('transition', ['redirect' => '/onboarding']);
        }
        
        // Si no está autenticado, mostrar login directamente
        return response()->file(public_path('login.html'));
    }
}
