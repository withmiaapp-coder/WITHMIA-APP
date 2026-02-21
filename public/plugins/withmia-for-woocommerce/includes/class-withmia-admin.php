<?php
/**
 * WITHMIA Admin Settings Page
 *
 * Provides a settings page under WooCommerce menu for configuring
 * the WITHMIA integration.
 */

if (!defined('ABSPATH')) {
    exit;
}

class Withmia_Admin {

    public function __construct() {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_styles']);

        // Add settings link to plugins page
        add_filter('plugin_action_links_withmia-for-woocommerce/withmia-for-woocommerce.php', [$this, 'settings_link']);

        // AJAX handlers
        add_action('wp_ajax_withmia_test_connection', [$this, 'test_connection']);
        add_action('wp_ajax_withmia_regenerate_key', [$this, 'regenerate_key']);
    }

    /**
     * Add submenu page under WooCommerce
     */
    public function add_menu() {
        add_submenu_page(
            'woocommerce',
            'WITHMIA',
            'WITHMIA',
            'manage_woocommerce',
            'withmia-settings',
            [$this, 'render_page']
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('withmia_settings', 'withmia_webhook_url', [
            'sanitize_callback' => 'esc_url_raw',
        ]);
        register_setting('withmia_settings', 'withmia_enabled_events', [
            'default' => [
                'order_created', 'order_status_changed', 'cart_abandoned',
                'stock_changed', 'low_stock', 'customer_created',
            ],
        ]);
    }

    /**
     * Settings link on plugins page
     */
    public function settings_link($links) {
        $link = '<a href="' . admin_url('admin.php?page=withmia-settings') . '">' . __('Configurar', 'withmia-woo') . '</a>';
        array_unshift($links, $link);
        return $links;
    }

    /**
     * Enqueue admin styles
     */
    public function enqueue_styles($hook) {
        if ($hook !== 'woocommerce_page_withmia-settings') {
            return;
        }

        wp_enqueue_style('withmia-admin', plugins_url('assets/admin.css', dirname(__FILE__)), [], WITHMIA_WC_VERSION);
    }

    /**
     * Test connection to WITHMIA
     */
    public function test_connection() {
        check_ajax_referer('withmia_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Sin permisos.');
        }

        $webhook_url = get_option('withmia_webhook_url');
        if (empty($webhook_url)) {
            wp_send_json_error('URL del webhook no configurada.');
        }

        $response = wp_remote_post($webhook_url, [
            'timeout' => 10,
            'body' => wp_json_encode([
                'event' => 'connection.test',
                'store_url' => home_url(),
                'store_name' => get_bloginfo('name'),
                'timestamp' => current_time('c'),
            ]),
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Withmia-Key' => get_option('withmia_api_key'),
            ],
        ]);

        if (is_wp_error($response)) {
            wp_send_json_error('Error: ' . $response->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code >= 200 && $code < 300) {
            wp_send_json_success('Conexión exitosa (' . $code . ')');
        } else {
            wp_send_json_error('Error: HTTP ' . $code);
        }
    }

    /**
     * Regenerate API key
     */
    public function regenerate_key() {
        check_ajax_referer('withmia_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error('Sin permisos.');
        }

        $new_key = 'wmia_' . wp_generate_password(32, false);
        update_option('withmia_api_key', $new_key);

        wp_send_json_success(['key' => $new_key]);
    }

    /**
     * Render the settings page
     */
    public function render_page() {
        $api_key = get_option('withmia_api_key', '');
        $webhook_url = get_option('withmia_webhook_url', '');
        $enabled_events = get_option('withmia_enabled_events', []);
        $nonce = wp_create_nonce('withmia_admin');

        // Store info for display
        $store_url = home_url();
        $rest_url = rest_url('wc/v3/');
        $wc_version = defined('WC_VERSION') ? WC_VERSION : 'N/A';

        ?>
        <div class="wrap withmia-settings-wrap">
            <div class="withmia-header">
                <div class="withmia-logo-area">
                    <img src="<?php echo esc_url(plugins_url('assets/withmia-logo.svg', dirname(__FILE__))); ?>" alt="WITHMIA" class="withmia-logo" onerror="this.style.display='none'">
                    <h1>WITHMIA para WooCommerce</h1>
                </div>
                <p class="withmia-version">v<?php echo esc_html(WITHMIA_WC_VERSION); ?></p>
            </div>

            <!-- Connection Status -->
            <div class="withmia-card withmia-status-card">
                <h2>Estado de Conexión</h2>
                <table class="form-table withmia-info-table">
                    <tr>
                        <th>URL de la tienda</th>
                        <td><code><?php echo esc_html($store_url); ?></code></td>
                    </tr>
                    <tr>
                        <th>API REST Base</th>
                        <td><code><?php echo esc_html($rest_url); ?></code></td>
                    </tr>
                    <tr>
                        <th>WooCommerce</th>
                        <td><code><?php echo esc_html($wc_version); ?></code></td>
                    </tr>
                    <tr>
                        <th>WordPress</th>
                        <td><code><?php echo esc_html(get_bloginfo('version')); ?></code></td>
                    </tr>
                </table>
            </div>

            <form method="post" action="options.php" class="withmia-form">
                <?php settings_fields('withmia_settings'); ?>

                <!-- API Key -->
                <div class="withmia-card">
                    <h2>Clave API</h2>
                    <p class="description">Esta clave se usa para autenticar las solicitudes desde WITHMIA a tu tienda.</p>

                    <table class="form-table">
                        <tr>
                            <th>API Key</th>
                            <td>
                                <div class="withmia-api-key-group">
                                    <input type="text" id="withmia_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" readonly>
                                    <button type="button" class="button" onclick="withmiaAdmin.copyKey()">📋 Copiar</button>
                                    <button type="button" class="button" onclick="withmiaAdmin.regenerateKey()">🔄 Regenerar</button>
                                </div>
                                <p class="description">Copia esta clave y pégala en la configuración de WooCommerce en tu panel de WITHMIA.</p>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Webhook URL -->
                <div class="withmia-card">
                    <h2>Webhook de WITHMIA</h2>
                    <p class="description">URL donde se enviarán las notificaciones de eventos (pedidos, carritos abandonados, etc.)</p>

                    <table class="form-table">
                        <tr>
                            <th>URL del Webhook</th>
                            <td>
                                <input type="url" name="withmia_webhook_url" value="<?php echo esc_attr($webhook_url); ?>" class="large-text" placeholder="https://app.withmia.com/api/woocommerce/webhook">
                                <p class="description">Se obtiene desde tu panel de WITHMIA → Integraciones → WooCommerce.</p>
                            </td>
                        </tr>
                        <tr>
                            <th></th>
                            <td>
                                <button type="button" class="button button-secondary" onclick="withmiaAdmin.testConnection()">
                                    🔌 Probar Conexión
                                </button>
                                <span id="withmia-test-result"></span>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Events -->
                <div class="withmia-card">
                    <h2>Eventos</h2>
                    <p class="description">Selecciona qué eventos se enviarán a WITHMIA.</p>

                    <table class="form-table">
                        <?php
                        $events = [
                            'order_created' => ['Nuevo pedido', 'Se notifica cuando se crea un nuevo pedido.'],
                            'order_status_changed' => ['Cambio de estado', 'Se notifica cuando un pedido cambia de estado.'],
                            'cart_abandoned' => ['Carrito abandonado', 'Se notifica cuando un carrito es abandonado (30 min sin actividad).'],
                            'stock_changed' => ['Cambio de stock', 'Se notifica cuando cambia el stock de un producto.'],
                            'low_stock' => ['Stock bajo', 'Se notifica cuando un producto tiene stock bajo o se agota.'],
                            'customer_created' => ['Nuevo cliente', 'Se notifica cuando se registra un nuevo cliente.'],
                            'refund_created' => ['Reembolso', 'Se notifica cuando se procesa un reembolso.'],
                        ];

                        foreach ($events as $key => $info) :
                            $checked = in_array($key, (array) $enabled_events);
                        ?>
                        <tr>
                            <th>
                                <label for="event_<?php echo esc_attr($key); ?>">
                                    <?php echo esc_html($info[0]); ?>
                                </label>
                            </th>
                            <td>
                                <label>
                                    <input type="checkbox" name="withmia_enabled_events[]" id="event_<?php echo esc_attr($key); ?>" value="<?php echo esc_attr($key); ?>" <?php checked($checked); ?>>
                                    <?php echo esc_html($info[1]); ?>
                                </label>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                </div>

                <!-- Quick Setup -->
                <div class="withmia-card withmia-setup-card">
                    <h2>Configuración Rápida</h2>
                    <p>Para conectar tu tienda con WITHMIA:</p>
                    <ol>
                        <li>Inicia sesión en <a href="https://app.withmia.com" target="_blank">app.withmia.com</a></li>
                        <li>Ve a <strong>Integraciones → WooCommerce</strong></li>
                        <li>Ingresa la URL de tu tienda: <code><?php echo esc_html($store_url); ?></code></li>
                        <li>Pega la <strong>API Key</strong> que aparece arriba</li>
                        <li>Copia la <strong>URL del Webhook</strong> que te proporcione WITHMIA y pégala arriba</li>
                        <li>Haz clic en <strong>Guardar cambios</strong></li>
                    </ol>
                </div>

                <?php submit_button('Guardar cambios'); ?>
            </form>

            <!-- API Endpoints Reference -->
            <div class="withmia-card">
                <h2>Endpoints API Disponibles</h2>
                <p class="description">Estos endpoints están disponibles para WITHMIA una vez que la integración esté activa.</p>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Método</th>
                            <th>Endpoint</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>GET</code></td>
                            <td><code>/wc/v3/withmia-products</code></td>
                            <td>Listar productos con búsqueda, paginación y filtros</td>
                        </tr>
                        <tr>
                            <td><code>GET</code></td>
                            <td><code>/wc/v3/withmia-products/{id}</code></td>
                            <td>Detalle de un producto específico</td>
                        </tr>
                        <tr>
                            <td><code>GET</code></td>
                            <td><code>/wc/v3/withmia-categories</code></td>
                            <td>Listar categorías de productos</td>
                        </tr>
                        <tr>
                            <td><code>GET</code></td>
                            <td><code>/wc/v3/withmia-stock/{id}</code></td>
                            <td>Consultar stock de un producto</td>
                        </tr>
                        <tr>
                            <td><code>GET</code></td>
                            <td><code>/wc/v3/withmia-store</code></td>
                            <td>Información general de la tienda</td>
                        </tr>
                        <tr>
                            <td><code>POST</code></td>
                            <td><code>/wc/v3/withmia-cart/generate</code></td>
                            <td>Generar URL de carrito pre-cargado</td>
                        </tr>
                        <tr>
                            <td><code>GET</code></td>
                            <td><code>/wc/v3/withmia-abandoned-carts</code></td>
                            <td>Listar carritos abandonados</td>
                        </tr>
                        <tr>
                            <td><code>GET</code></td>
                            <td><code>/wc/v3/withmia-abandoned-carts/stats</code></td>
                            <td>Estadísticas de carritos abandonados</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <script>
        var withmiaAdmin = {
            nonce: '<?php echo esc_js($nonce); ?>',

            copyKey: function() {
                var keyField = document.getElementById('withmia_api_key');
                keyField.select();
                document.execCommand('copy');

                // Visual feedback
                var btn = event.target;
                var original = btn.textContent;
                btn.textContent = '✅ Copiado';
                setTimeout(function() { btn.textContent = original; }, 2000);
            },

            regenerateKey: function() {
                if (!confirm('¿Estás seguro? Deberás actualizar la clave en tu panel de WITHMIA.')) {
                    return;
                }

                jQuery.post(ajaxurl, {
                    action: 'withmia_regenerate_key',
                    nonce: this.nonce
                }, function(response) {
                    if (response.success) {
                        document.getElementById('withmia_api_key').value = response.data.key;
                        alert('Clave regenerada. Recuerda actualizarla en WITHMIA.');
                    } else {
                        alert('Error: ' + response.data);
                    }
                });
            },

            testConnection: function() {
                var resultEl = document.getElementById('withmia-test-result');
                resultEl.textContent = '⏳ Probando...';
                resultEl.style.color = '#666';

                jQuery.post(ajaxurl, {
                    action: 'withmia_test_connection',
                    nonce: this.nonce
                }, function(response) {
                    if (response.success) {
                        resultEl.textContent = '✅ ' + response.data;
                        resultEl.style.color = '#00a32a';
                    } else {
                        resultEl.textContent = '❌ ' + response.data;
                        resultEl.style.color = '#d63638';
                    }
                });
            }
        };
        </script>
        <?php
    }
}
