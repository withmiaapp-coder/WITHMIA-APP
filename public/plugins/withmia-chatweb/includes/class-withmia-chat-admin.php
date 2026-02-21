<?php
/**
 * WITHMIA ChatWeb Admin Settings
 *
 * Settings page with subscription-first flow. If the user doesn't have
 * a WITHMIA account, they're guided to create one and subscribe.
 */

if (!defined('ABSPATH')) {
    exit;
}

class Withmia_Chat_Admin {

    public function __construct() {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    /**
     * Add top-level menu (with WITHMIA icon)
     */
    public function add_menu() {
        add_menu_page(
            'WITHMIA ChatWeb',
            'WITHMIA Chat',
            'manage_options',
            'withmia-chat',
            [$this, 'render_page'],
            'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>'),
            58
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        // Connection settings
        register_setting('withmia_chat_settings', 'withmia_chat_website_token', ['sanitize_callback' => 'sanitize_text_field']);
        register_setting('withmia_chat_settings', 'withmia_chat_base_url', ['sanitize_callback' => 'esc_url_raw']);

        // Appearance settings
        register_setting('withmia_chat_settings', 'withmia_chat_position');
        register_setting('withmia_chat_settings', 'withmia_chat_color', ['sanitize_callback' => 'sanitize_hex_color']);
        register_setting('withmia_chat_settings', 'withmia_chat_dark_theme');
        register_setting('withmia_chat_settings', 'withmia_chat_launcher_text', ['sanitize_callback' => 'sanitize_text_field']);
        register_setting('withmia_chat_settings', 'withmia_chat_language');

        // Behavior settings
        register_setting('withmia_chat_settings', 'withmia_chat_show_on_mobile');
        register_setting('withmia_chat_settings', 'withmia_chat_exclude_pages', ['sanitize_callback' => 'sanitize_textarea_field']);
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_assets($hook) {
        if ($hook !== 'toplevel_page_withmia-chat') {
            return;
        }
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
        wp_enqueue_style('withmia-chat-admin', plugins_url('assets/admin.css', dirname(__FILE__)), [], WITHMIA_CHAT_VERSION);
    }

    /**
     * Render settings page
     */
    public function render_page() {
        $token = get_option('withmia_chat_website_token', '');
        $base_url = get_option('withmia_chat_base_url', '');
        $is_connected = !empty($token) && !empty($base_url);

        ?>
        <div class="wrap withmia-chat-wrap">

            <!-- Header -->
            <div class="withmia-chat-header">
                <div class="withmia-chat-header-left">
                    <div class="withmia-chat-icon">💬</div>
                    <div>
                        <h1>WITHMIA ChatWeb</h1>
                        <p class="withmia-chat-subtitle">Asistente de IA para tu sitio web</p>
                    </div>
                </div>
                <span class="withmia-chat-version">v<?php echo esc_html(WITHMIA_CHAT_VERSION); ?></span>
            </div>

            <?php if (!$is_connected): ?>
            <!-- ============================================================ -->
            <!-- NOT CONNECTED: Subscription-first flow                       -->
            <!-- ============================================================ -->
            <div class="withmia-chat-cta-section">
                <div class="withmia-chat-cta-card">
                    <div class="withmia-chat-cta-icon">🤖</div>
                    <h2>Conecta tu asistente de IA</h2>
                    <p>WITHMIA ChatWeb agrega un asistente de inteligencia artificial a tu sitio web que:</p>
                    <ul class="withmia-chat-features">
                        <li>✅ Responde preguntas de tus clientes 24/7</li>
                        <li>✅ Captura datos de contacto automáticamente</li>
                        <li>✅ Conoce tus productos y servicios</li>
                        <li>✅ Agenda reuniones y envía cotizaciones</li>
                        <li>✅ Se conecta con WhatsApp, Instagram y más</li>
                    </ul>

                    <div class="withmia-chat-cta-steps">
                        <div class="withmia-chat-step">
                            <div class="withmia-chat-step-number">1</div>
                            <div>
                                <strong>Crea tu cuenta en WITHMIA</strong>
                                <p>Regístrate y elige tu plan. El chat web está incluido en todos los planes.</p>
                            </div>
                        </div>
                        <div class="withmia-chat-step">
                            <div class="withmia-chat-step-number">2</div>
                            <div>
                                <strong>Configura tu asistente</strong>
                                <p>Entrena a tu IA con la información de tu negocio desde el panel de WITHMIA.</p>
                            </div>
                        </div>
                        <div class="withmia-chat-step">
                            <div class="withmia-chat-step-number">3</div>
                            <div>
                                <strong>Conecta el widget</strong>
                                <p>Copia el Website Token desde Integraciones → Chat Web y pégalo abajo.</p>
                            </div>
                        </div>
                    </div>

                    <div class="withmia-chat-cta-buttons">
                        <a href="<?php echo esc_url(WITHMIA_CHAT_SIGNUP_URL); ?>" target="_blank" class="button button-primary button-hero withmia-chat-btn-primary">
                            🚀 Crear cuenta en WITHMIA
                        </a>
                        <a href="<?php echo esc_url(WITHMIA_CHAT_PRICING_URL); ?>" target="_blank" class="button button-hero withmia-chat-btn-secondary">
                            💰 Ver planes y precios
                        </a>
                    </div>
                </div>

                <!-- Connection form (below CTA) -->
                <div class="withmia-chat-card">
                    <h2>¿Ya tienes tu cuenta? Conecta aquí</h2>
                    <p class="description">Si ya tienes tu suscripción de WITHMIA activa, ingresa los datos de tu widget:</p>

                    <form method="post" action="options.php">
                        <?php settings_fields('withmia_chat_settings'); ?>
                        <table class="form-table">
                            <tr>
                                <th><label for="withmia_chat_base_url">URL del servidor</label></th>
                                <td>
                                    <input type="url" id="withmia_chat_base_url" name="withmia_chat_base_url"
                                           value="<?php echo esc_attr($base_url); ?>"
                                           class="regular-text"
                                           placeholder="https://chat.withmia.com">
                                    <p class="description">Se encuentra en Integraciones → Chat Web → Datos de conexión.</p>
                                </td>
                            </tr>
                            <tr>
                                <th><label for="withmia_chat_website_token">Website Token</label></th>
                                <td>
                                    <input type="text" id="withmia_chat_website_token" name="withmia_chat_website_token"
                                           value="<?php echo esc_attr($token); ?>"
                                           class="regular-text"
                                           placeholder="ej: xDhKz4kqnRm...">
                                    <p class="description">Token único de tu widget. Lo encuentras en Integraciones → Chat Web.</p>
                                </td>
                            </tr>
                        </table>
                        <?php submit_button('Conectar widget'); ?>
                    </form>
                </div>
            </div>

            <?php else: ?>
            <!-- ============================================================ -->
            <!-- CONNECTED: Full settings panel                               -->
            <!-- ============================================================ -->
            <div class="withmia-chat-connected-banner">
                <span class="withmia-chat-status-dot"></span>
                <strong>Widget conectado</strong> — Tu asistente de IA está activo en tu sitio web.
            </div>

            <form method="post" action="options.php">
                <?php settings_fields('withmia_chat_settings'); ?>

                <!-- Connection -->
                <div class="withmia-chat-card">
                    <h2>Conexión</h2>
                    <table class="form-table">
                        <tr>
                            <th>URL del servidor</th>
                            <td>
                                <input type="url" name="withmia_chat_base_url"
                                       value="<?php echo esc_attr($base_url); ?>" class="regular-text">
                            </td>
                        </tr>
                        <tr>
                            <th>Website Token</th>
                            <td>
                                <input type="text" name="withmia_chat_website_token"
                                       value="<?php echo esc_attr($token); ?>" class="regular-text"
                                       style="font-family:monospace;">
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Appearance -->
                <div class="withmia-chat-card">
                    <h2>Apariencia</h2>
                    <table class="form-table">
                        <tr>
                            <th>Posición del widget</th>
                            <td>
                                <?php $pos = get_option('withmia_chat_position', 'right'); ?>
                                <label>
                                    <input type="radio" name="withmia_chat_position" value="right" <?php checked($pos, 'right'); ?>>
                                    Derecha
                                </label>
                                &nbsp;&nbsp;
                                <label>
                                    <input type="radio" name="withmia_chat_position" value="left" <?php checked($pos, 'left'); ?>>
                                    Izquierda
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="withmia_chat_color">Color del widget</label></th>
                            <td>
                                <input type="text" name="withmia_chat_color" id="withmia_chat_color"
                                       value="<?php echo esc_attr(get_option('withmia_chat_color', '#6366f1')); ?>"
                                       class="withmia-color-picker">
                            </td>
                        </tr>
                        <tr>
                            <th>Tema oscuro</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="withmia_chat_dark_theme" value="1"
                                           <?php checked(get_option('withmia_chat_dark_theme'), '1'); ?>>
                                    Activar tema oscuro automático
                                </label>
                                <p class="description">Se adapta al modo oscuro del navegador del visitante.</p>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="withmia_chat_launcher_text">Texto del botón</label></th>
                            <td>
                                <input type="text" name="withmia_chat_launcher_text" id="withmia_chat_launcher_text"
                                       value="<?php echo esc_attr(get_option('withmia_chat_launcher_text', 'Chatea con nosotros')); ?>"
                                       class="regular-text">
                                <p class="description">Tooltip que aparece al pasar el mouse sobre el botón flotante.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Idioma</th>
                            <td>
                                <?php $lang = get_option('withmia_chat_language', 'es'); ?>
                                <select name="withmia_chat_language">
                                    <option value="es" <?php selected($lang, 'es'); ?>>Español</option>
                                    <option value="en" <?php selected($lang, 'en'); ?>>English</option>
                                    <option value="pt" <?php selected($lang, 'pt'); ?>>Português</option>
                                    <option value="fr" <?php selected($lang, 'fr'); ?>>Français</option>
                                    <option value="de" <?php selected($lang, 'de'); ?>>Deutsch</option>
                                </select>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Behavior -->
                <div class="withmia-chat-card">
                    <h2>Comportamiento</h2>
                    <table class="form-table">
                        <tr>
                            <th>Móviles</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="withmia_chat_show_on_mobile" value="1"
                                           <?php checked(get_option('withmia_chat_show_on_mobile', true), '1'); ?>>
                                    Mostrar widget en dispositivos móviles
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="withmia_chat_exclude_pages">Excluir páginas</label></th>
                            <td>
                                <textarea name="withmia_chat_exclude_pages" id="withmia_chat_exclude_pages"
                                          rows="4" class="large-text code"
                                          placeholder="/checkout&#10;/mi-cuenta/*&#10;/carrito"><?php echo esc_textarea(get_option('withmia_chat_exclude_pages', '')); ?></textarea>
                                <p class="description">Una ruta por línea. Usa * como comodín. Ej: <code>/checkout</code>, <code>/blog/*</code></p>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Disconnect -->
                <div class="withmia-chat-card">
                    <h2>Administrar</h2>
                    <table class="form-table">
                        <tr>
                            <th>Panel de WITHMIA</th>
                            <td>
                                <a href="<?php echo esc_url(WITHMIA_CHAT_APP_URL); ?>" target="_blank" class="button">
                                    Abrir panel de WITHMIA ↗
                                </a>
                                <p class="description">Configura tu asistente de IA, entrénalo y revisa conversaciones.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Desconectar</th>
                            <td>
                                <label>
                                    <input type="checkbox" id="withmia_disconnect_check">
                                    Quiero desconectar el widget (puedo volver a conectarlo después)
                                </label>
                                <br><br>
                                <button type="button" class="button button-link-delete" id="withmia_disconnect_btn" disabled
                                        onclick="if(confirm('¿Estás seguro? El chat desaparecerá de tu sitio.')){document.getElementById('withmia_chat_website_token').value='';document.getElementById('withmia_chat_base_url').value='';this.form.submit();}">
                                    Desconectar widget
                                </button>
                                <input type="hidden" name="withmia_chat_website_token" id="withmia_chat_website_token_hidden" value="<?php echo esc_attr($token); ?>">
                                <input type="hidden" name="withmia_chat_base_url" id="withmia_chat_base_url_hidden" value="<?php echo esc_attr($base_url); ?>">
                            </td>
                        </tr>
                    </table>
                </div>

                <?php submit_button('Guardar cambios'); ?>
            </form>

            <?php endif; ?>
        </div>

        <script>
        jQuery(document).ready(function($) {
            // Color picker
            if ($.fn.wpColorPicker) {
                $('.withmia-color-picker').wpColorPicker();
            }
            // Disconnect checkbox
            $('#withmia_disconnect_check').on('change', function() {
                $('#withmia_disconnect_btn').prop('disabled', !this.checked);
            });
        });
        </script>
        <?php
    }
}
