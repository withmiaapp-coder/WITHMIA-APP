<?php
/**
 * Plugin Name: WITHMIA for WooCommerce
 * Plugin URI: https://app.withmia.com
 * Description: Conecta tu tienda WooCommerce con WITHMIA para sincronizar productos, generar carritos por URL, rastrear carritos abandonados y vender por WhatsApp con IA.
 * Version: 1.0.0
 * Author: WITHMIA
 * Author URI: https://withmia.com
 * License: GPLv3 or later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: withmia-for-woocommerce
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.7.1
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 9.5
 */

if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('WITHMIA_WC_VERSION', '1.0.0');
define('WITHMIA_WC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WITHMIA_WC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WITHMIA_WC_API_BASE', 'https://app.withmia.com');

/**
 * Check if WooCommerce is active
 */
function withmia_wc_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function () {
            echo '<div class="notice notice-error"><p>';
            echo '<strong>WITHMIA for WooCommerce</strong> requiere que WooCommerce esté instalado y activado.';
            echo '</p></div>';
        });
        return false;
    }
    return true;
}

/**
 * Initialize the plugin
 */
function withmia_wc_init() {
    if (!withmia_wc_check_woocommerce()) {
        return;
    }

    // Load includes
    require_once WITHMIA_WC_PLUGIN_DIR . 'includes/class-withmia-api.php';
    require_once WITHMIA_WC_PLUGIN_DIR . 'includes/class-withmia-cart.php';
    require_once WITHMIA_WC_PLUGIN_DIR . 'includes/class-withmia-abandoned-cart.php';
    require_once WITHMIA_WC_PLUGIN_DIR . 'includes/class-withmia-admin.php';
    require_once WITHMIA_WC_PLUGIN_DIR . 'includes/class-withmia-webhook.php';

    // Init components
    new Withmia_API();
    new Withmia_Cart();
    new Withmia_Abandoned_Cart();
    new Withmia_Admin();
    new Withmia_Webhook();
}
add_action('plugins_loaded', 'withmia_wc_init');

/**
 * Activation hook - create tables and schedule events
 */
function withmia_wc_activate() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'withmia_abandoned_carts';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        session_id varchar(255) NOT NULL,
        user_id bigint(20) DEFAULT NULL,
        user_email varchar(255) DEFAULT NULL,
        user_phone varchar(50) DEFAULT NULL,
        cart_contents longtext NOT NULL,
        cart_total decimal(10,2) NOT NULL DEFAULT 0,
        currency varchar(10) NOT NULL DEFAULT 'CLP',
        status varchar(20) NOT NULL DEFAULT 'abandoned',
        checkout_url text DEFAULT NULL,
        recovered_at datetime DEFAULT NULL,
        notified_at datetime DEFAULT NULL,
        notification_count int(11) NOT NULL DEFAULT 0,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY session_id (session_id),
        KEY user_id (user_id),
        KEY status (status),
        KEY created_at (created_at)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);

    // Schedule abandoned cart check
    if (!wp_next_scheduled('withmia_check_abandoned_carts')) {
        wp_schedule_event(time(), 'hourly', 'withmia_check_abandoned_carts');
    }

    // Generate API keys on activation if not exists
    if (!get_option('withmia_api_key')) {
        update_option('withmia_api_key', wp_generate_password(32, false));
    }
}
register_activation_hook(__FILE__, 'withmia_wc_activate');

/**
 * Deactivation hook - clear scheduled events
 */
function withmia_wc_deactivate() {
    wp_clear_scheduled_hook('withmia_check_abandoned_carts');
}
register_deactivation_hook(__FILE__, 'withmia_wc_deactivate');

/**
 * Add settings link on plugin page
 */
function withmia_wc_settings_link($links) {
    $settings_link = '<a href="admin.php?page=withmia-settings">Configuración</a>';
    array_unshift($links, $settings_link);
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'withmia_wc_settings_link');
