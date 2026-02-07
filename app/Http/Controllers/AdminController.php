<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\User;
use App\Services\UserDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            $user = $request->user();
            if (!$user || $user->role !== 'admin') {
                if ($request->expectsJson()) {
                    return response()->json(['error' => 'Unauthorized'], 403);
                }
                return redirect('/dashboard')->with('error', 'No tienes permisos de administrador');
            }

            // Global admin panel requires super-admin — regular admins manage via their company dashboard
            $superAdminEmails = array_filter(explode(',', config('app.super_admin_emails', '')));
            if (!empty($superAdminEmails) && !in_array($user->email, $superAdminEmails)) {
                if ($request->expectsJson()) {
                    return response()->json(['error' => 'Unauthorized — super admin required'], 403);
                }
                return redirect('/dashboard')->with('error', 'Acceso restringido a super administradores');
            }

            return $next($request);
        });
    }

    /**
     * Admin Dashboard
     */
    public function dashboard()
    {
        return inertia('admin/AdminDashboard');
    }

    /**
     * Users Management Page
     */
    public function users()
    {
        return inertia('admin/Users');
    }

    /**
     * Companies Management Page
     */
    public function companies()
    {
        return inertia('admin/Companies');
    }

    /**
     * API: Get all users
     */
    public function apiUsers()
    {
        $users = User::select('id', 'name', 'email', 'role', 'company_slug', 'onboarding_completed', 'created_at', 'updated_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * API: Get all companies
     */
    public function apiCompanies()
    {
        $companies = Company::select('id', 'name', 'slug', 'is_active', 'chatwoot_inbox_id', 'created_at', 'updated_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['companies' => $companies]);
    }

    /**
     * API: Update user role
     */
    public function updateUserRole(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|in:agent,admin'
        ]);

        $user = User::findOrFail($id);
        $user->role = $request->role;
        $user->save();

        return response()->json(['success' => true, 'message' => 'Rol actualizado correctamente']);
    }

    /**
     * API: Delete user.
     * Usa UserDeletionService para limpieza completa de datos.
     */
    public function deleteUser($id, UserDeletionService $deletionService)
    {
        if (Auth::id() == $id) {
            return response()->json(['error' => 'No puedes eliminarte a ti mismo'], 400);
        }

        $user = User::findOrFail($id);
        $result = $deletionService->delete($user, force: false, deletedBy: Auth::id());

        if (!$result['success']) {
            return response()->json(['error' => $result['message']], 500);
        }

        return response()->json(['success' => true, 'message' => 'Usuario eliminado correctamente']);
    }

    /**
     * API: Get admin stats
     */
    public function stats()
    {
        $users = User::select('id', 'name', 'email', 'role', 'company_slug', 'onboarding_completed', 'created_at')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $companies = Company::select('id', 'name', 'slug', 'is_active', 'chatwoot_inbox_id', 'created_at')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'total_users' => User::count(),
            'total_companies' => Company::count(),
            'users' => $users,
            'companies' => $companies,
        ]);
    }
}
