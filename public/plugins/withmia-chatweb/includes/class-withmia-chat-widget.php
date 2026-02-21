<?php
/**
 * WITHMIA ChatWeb Widget Renderer
 *
 * Injects the Chatwoot SDK widget in the frontend with all configured settings.
 */

if (!defined('ABSPATH')) {
    exit;
}

class Withmia_Chat_Widget {

    public function __construct() {
        add_action('wp_footer', [$this, 'render_widget'], 99);
        add_action('wp_head', [$this, 'render_custom_css'], 99);
    }

    /**
     * Render the chat widget script in frontend
     */
    public function render_widget() {
        // Don't render in admin or if not configured
        if (is_admin()) {
            return;
        }

        $website_token = get_option('withmia_chat_website_token');
        $base_url = get_option('withmia_chat_base_url');

        if (empty($website_token) || empty($base_url)) {
            return;
        }

        // Check mobile visibility
        if (!get_option('withmia_chat_show_on_mobile', true) && wp_is_mobile()) {
            return;
        }

        // Check excluded pages
        $excluded = get_option('withmia_chat_exclude_pages', '');
        if (!empty($excluded)) {
            $excluded_pages = array_map('trim', explode("\n", $excluded));
            $current_path = wp_parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            foreach ($excluded_pages as $pattern) {
                if (empty($pattern)) continue;
                if ($pattern === $current_path) return;
                // Support wildcard: /blog/*
                if (strpos($pattern, '*') !== false) {
                    $regex = str_replace('*', '.*', preg_quote($pattern, '/'));
                    if (preg_match('/^' . $regex . '$/', $current_path)) return;
                }
            }
        }

        // Build settings
        $position = get_option('withmia_chat_position', 'right');
        $dark_theme = get_option('withmia_chat_dark_theme', false);
        $launcher_text = get_option('withmia_chat_launcher_text', 'Chatea con nosotros');
        $language = get_option('withmia_chat_language', 'es');
        $color = get_option('withmia_chat_color', '#6366f1');

        $chatwoot_settings = [
            'position' => $position === 'left' ? 'left' : 'right',
            'type' => 'standard',
            'launcherTitle' => sanitize_text_field($launcher_text),
        ];

        if ($dark_theme) {
            $chatwoot_settings['darkMode'] = 'auto';
        }

        $settings_json = wp_json_encode($chatwoot_settings);
        $base_url_escaped = esc_url($base_url);
        $token_escaped = esc_attr($website_token);
        $language_escaped = esc_attr($language);

        ?>
        <!-- WITHMIA ChatWeb Widget -->
        <script>
          window.chatwootSettings = <?php echo $settings_json; ?>;
          (function(d,t) {
            var BASE_URL="<?php echo $base_url_escaped; ?>";
            var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
            g.src=BASE_URL+"/packs/js/sdk.js";
            g.defer = true;
            g.async = true;
            s.parentNode.insertBefore(g,s);
            g.onload=function(){
              window.chatwootSDK.run({
                websiteToken: '<?php echo $token_escaped; ?>',
                baseUrl: BASE_URL,
                locale: '<?php echo $language_escaped; ?>'
              })
            }
          })(document,"script");
        </script>
        <?php
    }

    /**
     * Add custom CSS for widget color override
     */
    public function render_custom_css() {
        $website_token = get_option('withmia_chat_website_token');
        if (empty($website_token)) {
            return;
        }

        $color = get_option('withmia_chat_color', '#6366f1');
        if ($color && $color !== '#1F93FF') { // Only override if not Chatwoot default
            ?>
            <!-- WITHMIA ChatWeb Custom Styles -->
            <style>
                .woot-widget-bubble { background-color: <?php echo esc_attr($color); ?> !important; }
                .woot-widget-bubble:hover { background-color: <?php echo esc_attr($color); ?> !important; filter: brightness(0.9); }
            </style>
            <?php
        }
    }
}
