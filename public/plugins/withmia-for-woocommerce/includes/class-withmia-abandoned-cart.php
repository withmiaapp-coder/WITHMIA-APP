<?php
/**
 * WITHMIA Abandoned Cart Tracking
 *
 * Tracks cart activity and notifies WITHMIA when carts are abandoned.
 */

if (!defined('ABSPATH')) {
    exit;
}

class Withmia_Abandoned_Cart {

    /** Minutes before a cart is considered abandoned */
    const ABANDON_THRESHOLD = 30;

    public function __construct() {
        // Track cart updates
        add_action('woocommerce_cart_updated', [$this, 'save_cart']);
        add_action('woocommerce_add_to_cart', [$this, 'save_cart']);

        // Track when cart is recovered (order placed)
        add_action('woocommerce_checkout_order_processed', [$this, 'mark_recovered']);
        add_action('woocommerce_thankyou', [$this, 'mark_recovered']);

        // Cron check for abandoned carts
        add_action('withmia_check_abandoned_carts', [$this, 'check_abandoned_carts']);

        // REST API for abandoned cart data
        add_action('rest_api_init', [$this, 'register_routes']);

        // Capture contact info from checkout fields
        add_action('woocommerce_checkout_update_order_review', [$this, 'capture_checkout_fields']);
    }

    /**
     * Register REST routes
     */
    public function register_routes() {
        register_rest_route('wc/v3', '/withmia-abandoned-carts', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_abandoned_carts'],
            'permission_callback' => [$this, 'check_permissions'],
            'args' => [
                'status' => ['default' => 'abandoned'],
                'since' => ['default' => ''],
                'limit' => ['default' => 50, 'sanitize_callback' => 'absint'],
            ],
        ]);

        register_rest_route('wc/v3', '/withmia-abandoned-carts/stats', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_stats'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);

        register_rest_route('wc/v3', '/withmia-abandoned-carts/(?P<id>\d+)/notify', [
            'methods'  => 'POST',
            'callback' => [$this, 'mark_notified'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);
    }

    /**
     * Check API permissions
     */
    public function check_permissions($request) {
        // Allow WITHMIA API key (header only — never accept via query params to avoid log leakage)
        $api_key = $request->get_header('X-Withmia-Key');

        if ($api_key && hash_equals(get_option('withmia_api_key', ''), $api_key)) {
            return true;
        }

        return new WP_Error('rest_forbidden', 'Acceso denegado.', ['status' => 401]);
    }

    /**
     * Save current cart state
     */
    public function save_cart() {
        if (!WC()->cart || WC()->cart->is_empty()) {
            return;
        }

        $session_id = $this->get_session_id();
        if (!$session_id) {
            return;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'withmia_abandoned_carts';

        $cart_contents = [];
        foreach (WC()->cart->get_cart() as $cart_item) {
            $product = $cart_item['data'];
            $cart_contents[] = [
                'product_id' => $cart_item['product_id'],
                'variation_id' => $cart_item['variation_id'] ?? 0,
                'quantity' => $cart_item['quantity'],
                'name' => $product->get_name(),
                'price' => $product->get_price(),
                'image' => wp_get_attachment_url($product->get_image_id()),
                'permalink' => $product->get_permalink(),
            ];
        }

        $cart_total = WC()->cart->get_cart_contents_total();
        $checkout_url = $this->generate_recovery_url($cart_contents);

        // Get user info
        $user_id = get_current_user_id() ?: null;
        $user_email = null;
        $user_phone = null;

        if ($user_id) {
            $user = get_userdata($user_id);
            $user_email = $user ? $user->user_email : null;
            $user_phone = get_user_meta($user_id, 'billing_phone', true) ?: null;
        }

        // Check if we already have this session
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id, status FROM $table WHERE session_id = %s AND status = 'active' ORDER BY created_at DESC LIMIT 1",
            $session_id
        ));

        $data = [
            'session_id' => $session_id,
            'user_id' => $user_id,
            'user_email' => $user_email,
            'user_phone' => $user_phone,
            'cart_contents' => wp_json_encode($cart_contents),
            'cart_total' => $cart_total,
            'currency' => get_woocommerce_currency(),
            'status' => 'active',
            'checkout_url' => $checkout_url,
            'updated_at' => current_time('mysql'),
        ];

        if ($existing) {
            $wpdb->update($table, $data, ['id' => $existing->id]);
        } else {
            $data['created_at'] = current_time('mysql');
            $wpdb->insert($table, $data);
        }
    }

    /**
     * Capture email/phone from checkout fields (AJAX)
     */
    public function capture_checkout_fields($posted_data) {
        parse_str($posted_data, $data);

        $session_id = $this->get_session_id();
        if (!$session_id) {
            return;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'withmia_abandoned_carts';

        $update = [];
        if (!empty($data['billing_email'])) {
            $update['user_email'] = sanitize_email($data['billing_email']);
        }
        if (!empty($data['billing_phone'])) {
            $update['user_phone'] = sanitize_text_field($data['billing_phone']);
        }

        if (!empty($update)) {
            $update['updated_at'] = current_time('mysql');
            $wpdb->update(
                $table,
                $update,
                ['session_id' => $session_id, 'status' => 'active']
            );
        }
    }

    /**
     * Mark cart as recovered when order is placed
     */
    public function mark_recovered($order_id = null) {
        $session_id = $this->get_session_id();
        if (!$session_id) {
            return;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'withmia_abandoned_carts';

        $wpdb->update(
            $table,
            [
                'status' => 'recovered',
                'recovered_at' => current_time('mysql'),
                'updated_at' => current_time('mysql'),
            ],
            ['session_id' => $session_id, 'status' => 'active']
        );

        // Also mark abandoned ones as recovered
        $wpdb->update(
            $table,
            [
                'status' => 'recovered',
                'recovered_at' => current_time('mysql'),
                'updated_at' => current_time('mysql'),
            ],
            ['session_id' => $session_id, 'status' => 'abandoned']
        );

        // Notify WITHMIA
        $this->notify_withmia('cart_recovered', [
            'session_id' => $session_id,
            'order_id' => $order_id,
        ]);
    }

    /**
     * Cron: Check for abandoned carts
     */
    public function check_abandoned_carts() {
        global $wpdb;
        $table = $wpdb->prefix . 'withmia_abandoned_carts';

        $threshold = current_time('Y-m-d H:i:s', strtotime('-' . self::ABANDON_THRESHOLD . ' minutes'));

        // Mark active carts as abandoned if not updated recently
        $abandoned = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE status = 'active' AND updated_at < %s",
            $threshold
        ));

        foreach ($abandoned as $cart) {
            $wpdb->update(
                $table,
                ['status' => 'abandoned', 'updated_at' => current_time('mysql')],
                ['id' => $cart->id]
            );

            // Notify WITHMIA about abandoned cart
            $this->notify_withmia('cart_abandoned', [
                'cart_id' => $cart->id,
                'session_id' => $cart->session_id,
                'user_email' => $cart->user_email,
                'user_phone' => $cart->user_phone,
                'cart_contents' => json_decode($cart->cart_contents, true),
                'cart_total' => $cart->cart_total,
                'currency' => $cart->currency,
                'checkout_url' => $cart->checkout_url,
                'abandoned_at' => current_time('c'),
            ]);
        }

        // Clean up old carts (older than 30 days)
        $wpdb->query($wpdb->prepare(
            "DELETE FROM $table WHERE created_at < %s AND status != 'recovered'",
            current_time('Y-m-d H:i:s', strtotime('-30 days'))
        ));
    }

    /**
     * Get abandoned carts via API
     */
    public function get_abandoned_carts($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'withmia_abandoned_carts';

        $status = sanitize_text_field($request->get_param('status'));
        $since = $request->get_param('since');
        $limit = min($request->get_param('limit'), 200);

        $where = ['1=1'];
        $params = [];

        if ($status && $status !== 'all') {
            $where[] = 'status = %s';
            $params[] = $status;
        }

        if ($since) {
            $where[] = 'created_at >= %s';
            $params[] = sanitize_text_field($since);
        }

        $where_clause = implode(' AND ', $where);
        $query = "SELECT * FROM $table WHERE $where_clause ORDER BY created_at DESC LIMIT %d";
        $params[] = $limit;

        $results = $wpdb->get_results($wpdb->prepare($query, ...$params));

        $carts = [];
        foreach ($results as $row) {
            $carts[] = [
                'id' => (int) $row->id,
                'session_id' => $row->session_id,
                'user_email' => $row->user_email,
                'user_phone' => $row->user_phone,
                'cart_contents' => json_decode($row->cart_contents, true),
                'cart_total' => (float) $row->cart_total,
                'currency' => $row->currency,
                'status' => $row->status,
                'checkout_url' => $row->checkout_url,
                'notification_count' => (int) $row->notification_count,
                'notified_at' => $row->notified_at,
                'recovered_at' => $row->recovered_at,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ];
        }

        return new WP_REST_Response(['carts' => $carts, 'total' => count($carts)], 200);
    }

    /**
     * Get abandoned cart stats
     */
    public function get_stats($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'withmia_abandoned_carts';

        $stats = [
            'total_abandoned' => (int) $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'abandoned'"),
            'total_recovered' => (int) $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'recovered'"),
            'total_active' => (int) $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE status = 'active'"),
            'abandoned_value' => (float) $wpdb->get_var("SELECT COALESCE(SUM(cart_total), 0) FROM $table WHERE status = 'abandoned'"),
            'recovered_value' => (float) $wpdb->get_var("SELECT COALESCE(SUM(cart_total), 0) FROM $table WHERE status = 'recovered'"),
            'recovery_rate' => 0,
            'currency' => get_woocommerce_currency(),
        ];

        $total_trackable = $stats['total_abandoned'] + $stats['total_recovered'];
        if ($total_trackable > 0) {
            $stats['recovery_rate'] = round(($stats['total_recovered'] / $total_trackable) * 100, 1);
        }

        return new WP_REST_Response($stats, 200);
    }

    /**
     * Mark a cart as notified
     */
    public function mark_notified($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'withmia_abandoned_carts';

        $cart_id = $request->get_param('id');

        $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET notified_at = %s, notification_count = notification_count + 1, updated_at = %s WHERE id = %d",
            current_time('mysql'),
            current_time('mysql'),
            $cart_id
        ));

        return new WP_REST_Response(['success' => true], 200);
    }

    /**
     * Generate recovery URL for an abandoned cart
     */
    private function generate_recovery_url($cart_contents) {
        $parts = [];
        foreach ($cart_contents as $item) {
            $id_part = $item['product_id'];
            if (!empty($item['variation_id'])) {
                $id_part .= '_' . $item['variation_id'];
            }
            $parts[] = $id_part . ':' . $item['quantity'];
        }

        $nonce = wp_create_nonce('withmia_clear_cart');
        return home_url('/cart/?add-withmia-cart=' . implode(',', $parts) . '&withmia-clear-cart=1&_wcnonce=' . $nonce);
    }

    /**
     * Notify WITHMIA webhook
     */
    private function notify_withmia($event, $data) {
        $webhook_url = get_option('withmia_webhook_url');
        if (!$webhook_url) {
            return;
        }

        wp_remote_post($webhook_url, [
            'timeout' => 10,
            'blocking' => false,
            'body' => wp_json_encode(array_merge([
                'event' => $event,
                'store_url' => home_url(),
                'timestamp' => current_time('c'),
            ], $data)),
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Withmia-Key' => get_option('withmia_api_key'),
                'X-Withmia-Store' => home_url(),
            ],
        ]);
    }

    /**
     * Get current session ID
     */
    private function get_session_id() {
        if (WC()->session) {
            return WC()->session->get_customer_id();
        }
        return null;
    }
}
