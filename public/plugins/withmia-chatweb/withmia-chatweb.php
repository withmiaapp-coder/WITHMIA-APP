<?php
/**
 * Plugin Name: WITHMIA ChatWeb
 * Plugin URI: https://withmia.com
 * Description: Agrega el chat en vivo de WITHMIA a tu sitio WordPress. Asistente de IA que responde dudas, captura leads y vende por ti — 24/7.
 * Version: 1.0.0
 * Author: WITHMIA
 * Author URI: https://withmia.com
 * License: GPLv3 or later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: withmia-chatweb
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.7
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('WITHMIA_CHAT_VERSION', '1.0.0');
define('WITHMIA_CHAT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WITHMIA_CHAT_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WITHMIA_CHAT_APP_URL', 'https://app.withmia.com');
define('WITHMIA_CHAT_SIGNUP_URL', 'https://app.withmia.com/onboarding?utm_source=wordpress&utm_medium=plugin&utm_campaign=chatweb');
define('WITHMIA_CHAT_PRICING_URL', 'https://withmia.com/precios?utm_source=wordpress&utm_medium=plugin&utm_campaign=chatweb');

/**
 * Initialize the plugin
 */
function withmia_chat_init() {
    require_once WITHMIA_CHAT_PLUGIN_DIR . 'includes/class-withmia-chat-admin.php';
    require_once WITHMIA_CHAT_PLUGIN_DIR . 'includes/class-withmia-chat-widget.php';

    new Withmia_Chat_Admin();
    new Withmia_Chat_Widget();
}
add_action('plugins_loaded', 'withmia_chat_init');

/**
 * Activation hook
 */
function withmia_chat_activate() {
    // Set defaults
    if (!get_option('withmia_chat_configured')) {
        update_option('withmia_chat_configured', false);
        update_option('withmia_chat_position', 'right');
        update_option('withmia_chat_color', '#6366f1');
        update_option('withmia_chat_dark_theme', false);
        update_option('withmia_chat_launcher_text', 'Chatea con nosotros');
        update_option('withmia_chat_language', 'es');
        update_option('withmia_chat_show_on_mobile', true);
        update_option('withmia_chat_exclude_pages', '');
    }

    // Redirect to setup page after activation
    set_transient('withmia_chat_activation_redirect', true, 30);
}
register_activation_hook(__FILE__, 'withmia_chat_activate');

/**
 * Uninstall hook - clean up all plugin data on deletion
 */
function withmia_chat_uninstall() {
    $options = [
        'withmia_chat_website_token',
        'withmia_chat_base_url',
        'withmia_chat_position',
        'withmia_chat_dark_theme',
        'withmia_chat_launcher_text',
        'withmia_chat_language',
        'withmia_chat_show_on_mobile',
        'withmia_chat_exclude_pages',
    ];
    foreach ($options as $option) {
        delete_option($option);
    }
}
register_uninstall_hook(__FILE__, 'withmia_chat_uninstall');

/**
 * Redirect to settings page on activation
 */
function withmia_chat_activation_redirect() {
    if (get_transient('withmia_chat_activation_redirect')) {
        delete_transient('withmia_chat_activation_redirect');
        if (!isset($_GET['activate-multi'])) {
            wp_redirect(admin_url('admin.php?page=withmia-chat'));
            exit;
        }
    }
}
add_action('admin_init', 'withmia_chat_activation_redirect');

/**
 * Show notice if not configured
 */
function withmia_chat_admin_notice() {
    $screen = get_current_screen();
    if ($screen && $screen->id === 'toplevel_page_withmia-chat') {
        return; // Don't show on our own page
    }

    $token = get_option('withmia_chat_website_token');
    if (empty($token)) {
        echo '<div class="notice notice-warning is-dismissible">';
        echo '<p><strong>WITHMIA ChatWeb</strong> está instalado pero no configurado. ';
        echo '<a href="' . esc_url(admin_url('admin.php?page=withmia-chat')) . '">Configúralo ahora</a> ';
        echo 'o <a href="' . esc_url(WITHMIA_CHAT_SIGNUP_URL) . '" target="_blank">crea tu cuenta de WITHMIA</a>.</p>';
        echo '</div>';
    }
}
add_action('admin_notices', 'withmia_chat_admin_notice');

/**
 * Settings link on plugins page
 */
function withmia_chat_settings_link($links) {
    $settings = '<a href="' . admin_url('admin.php?page=withmia-chat') . '">Configurar</a>';
    array_unshift($links, $settings);

    // Add subscription CTA if not configured
    $token = get_option('withmia_chat_website_token');
    if (empty($token)) {
        $links[] = '<a href="' . esc_url(WITHMIA_CHAT_SIGNUP_URL) . '" target="_blank" style="color:#6366f1;font-weight:bold;">Obtener suscripción</a>';
    }

    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'withmia_chat_settings_link');
