<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddPartitionedCookie
{
    /**
     * Handle an incoming request.
     *
     * Add Partitioned attribute to session cookies for Railway Edge/Cloudflare compatibility
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Get Set-Cookie headers
        $cookies = $response->headers->getCookies();
        
        if (empty($cookies)) {
            return $response;
        }

        // Clear existing Set-Cookie headers
        $response->headers->remove('Set-Cookie');

        // Re-add cookies with Partitioned attribute
        foreach ($cookies as $cookie) {
            $cookieString = $cookie->getName() . '=' . $cookie->getValue();
            
            if ($cookie->getExpiresTime()) {
                $cookieString .= '; expires=' . gmdate('D, d-M-Y H:i:s T', $cookie->getExpiresTime());
            }
            
            if ($cookie->getMaxAge()) {
                $cookieString .= '; max-age=' . $cookie->getMaxAge();
            }
            
            if ($cookie->getPath()) {
                $cookieString .= '; path=' . $cookie->getPath();
            }
            
            if ($cookie->getDomain()) {
                $cookieString .= '; domain=' . $cookie->getDomain();
            }
            
            if ($cookie->isSecure()) {
                $cookieString .= '; Secure';
            }
            
            if ($cookie->isHttpOnly()) {
                $cookieString .= '; HttpOnly';
            }
            
            $sameSite = $cookie->getSameSite();
            if ($sameSite) {
                $cookieString .= '; SameSite=' . $sameSite;
                
                // Add Partitioned attribute when SameSite=None and Secure
                if (strtolower($sameSite) === 'none' && $cookie->isSecure()) {
                    $cookieString .= '; Partitioned';
                }
            }
            
            $response->headers->set('Set-Cookie', $cookieString, false);
        }

        return $response;
    }
}
