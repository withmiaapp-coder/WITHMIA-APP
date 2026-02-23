<?php

namespace App\Traits;

use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait HasCompanyAccess
{
    /**
     * Get the authenticated user's company or abort with 404.
     */
    protected function getAuthenticatedCompany(): Company
    {
        $user = Auth::user();
        $company = $user?->company;

        if (!$company) {
            abort(404, 'No company found');
        }

        return $company;
    }

    /**
     * Get company from request (supports auth user, auth_token param, and X-Railway-Auth header).
     */
    protected function getCompanyFromRequest(Request $request): ?Company
    {
        $user = $request->user();
        if (!$user) {
            $authToken = $request->input('auth_token') ?? $request->header('X-Railway-Auth');
            if ($authToken) {
                $user = User::where('remember_token', $authToken)->first();
            }
        }
        return $user?->company;
    }
}
