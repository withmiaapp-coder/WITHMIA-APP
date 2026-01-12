<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    /**
     * Check if user is admin
     */
    private function isAdmin()
    {
        $user = Auth::user();
        return $user && $user->role === 'admin';
    }

    /**
     * Admin Dashboard
     */
    public function dashboard()
    {
        if (!$this->isAdmin()) {
            return redirect('/dashboard')->with('error', 'No tienes permisos de administrador');
        }

        return inertia('admin/Dashboard');
    }

    /**
     * Users Management Page
     */
    public function users()
    {
        if (!$this->isAdmin()) {
            return redirect('/dashboard')->with('error', 'No tienes permisos de administrador');
        }

        return inertia('admin/Users');
    }

    /**
     * Companies Management Page
     */
    public function companies()
    {
        if (!$this->isAdmin()) {
            return redirect('/dashboard')->with('error', 'No tienes permisos de administrador');
        }

        return inertia('admin/Companies');
    }

    /**
     * API: Get all users
     */
    public function apiUsers()
    {
        if (!$this->isAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $users = DB::select("
                SELECT id, name, email, role, company_slug, onboarding_completed, created_at, updated_at
                FROM users
                ORDER BY created_at DESC
            ");

            return response()->json(['users' => $users]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * API: Get all companies
     */
    public function apiCompanies()
    {
        if (!$this->isAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $companies = DB::select("
                SELECT id, name, slug, email, phone, is_active, chatwoot_inbox_id, created_at, updated_at
                FROM companies
                ORDER BY created_at DESC
            ");

            return response()->json(['companies' => $companies]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * API: Update user role
     */
    public function updateUserRole(Request $request, $id)
    {
        if (!$this->isAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'role' => 'required|in:user,manager,admin'
        ]);

        try {
            $affected = DB::table('users')
                ->where('id', $id)
                ->update([
                    'role' => $request->role,
                    'updated_at' => now()
                ]);

            if ($affected === 0) {
                return response()->json(['error' => 'Usuario no encontrado'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Rol actualizado correctamente']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * API: Delete user
     */
    public function deleteUser($id)
    {
        if (!$this->isAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            // Prevent deleting current user
            if (Auth::id() == $id) {
                return response()->json(['error' => 'No puedes eliminarte a ti mismo'], 400);
            }

            $affected = DB::table('users')
                ->where('id', $id)
                ->delete();

            if ($affected === 0) {
                return response()->json(['error' => 'Usuario no encontrado'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Usuario eliminado correctamente']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * API: Get admin stats
     */
    public function stats()
    {
        if (!$this->isAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $users = DB::select("SELECT id, name, email, role, company_slug, onboarding_completed, created_at FROM users ORDER BY created_at DESC LIMIT 50");
            $companies = DB::select("SELECT id, name, slug, is_active, chatwoot_inbox_id, created_at FROM companies ORDER BY created_at DESC LIMIT 50");
            
            $totalUsers = DB::select("SELECT COUNT(*) as count FROM users")[0]->count;
            $totalCompanies = DB::select("SELECT COUNT(*) as count FROM companies")[0]->count;

            return response()->json([
                'total_users' => $totalUsers,
                'total_companies' => $totalCompanies,
                'users' => $users,
                'companies' => $companies
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
