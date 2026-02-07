<?php

namespace App\Traits;

use App\Models\Company;
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
}
