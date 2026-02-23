<?php

namespace App\Traits;

/**
 * Trait compartido para renderizar la ventana popup de cierre OAuth.
 * Usado por: CalendarController, CalendlyController.
 */
trait RendersOAuthPopup
{
    /**
     * Override in the controller to set provider name and postMessage type.
     * Example: protected string $oauthProvider = 'Google Calendar';
     *          protected string $oauthMessageType = 'gcal_oauth_result';
     */

    /**
     * Render HTML popup that closes itself and notifies opener via postMessage.
     */
    private function renderPopupClose(bool $success, string $message): \Illuminate\Http\Response
    {
        $status = $success ? 'success' : 'error';
        $emoji = $success ? '✅' : '❌';
        $provider = $this->oauthProvider ?? 'WITHMIA';
        $messageType = $this->oauthMessageType ?? 'oauth_result';
        $escapedMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head><title>{$provider} - WITHMIA</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#f9fafb;">
<div style="text-align:center;padding:2rem;">
<div style="font-size:3rem;margin-bottom:1rem;">{$emoji}</div>
<h2 style="color:#1f2937;margin-bottom:0.5rem;">{$escapedMessage}</h2>
<p style="color:#6b7280;font-size:0.875rem;">Esta ventana se cerrará automáticamente...</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: '{$messageType}', status: '{$status}', message: '{$escapedMessage}' }, '*');
  }
  setTimeout(function() { window.close(); }, 2000);
</script>
</body>
</html>
HTML;
        return response($html, 200)->header('Content-Type', 'text/html');
    }
}
