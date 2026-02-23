<?php
/**
 * WITHMIA Cart - Add multiple products to cart via URL
 *
 * URL format: ?add-withmia-cart=product_id:quantity,product_id:quantity
 * For variable products: ?add-withmia-cart=product_id_variation_id:quantity
 */

if (!defined('ABSPATH')) {
    exit;
}

class Withmia_Cart {

    public function __construct() {
        add_action('wp_loaded', [$this, 'handle_cart_url'], 20);
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    /**
     * Register cart REST routes
     */
    public function register_routes() {
        // Generate cart URL from product list
        register_rest_route('wc/v3', '/withmia-cart/generate', [
            'methods'  => 'POST',
            'callback' => [$this, 'generate_cart_url'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);
    }

    /**
     * Check permissions
     */
    public function check_permissions($request) {
        // Allow WITHMIA API key (header only — never accept via query params to avoid log leakage)
        $api_key = $request->get_header('X-Withmia-Key');

        if ($api_key && hash_equals(get_option('withmia_api_key', ''), $api_key)) {
            return true;
        }

        if (is_user_logged_in() && current_user_can('manage_woocommerce')) {
            return true;
        }

        return new WP_Error('rest_forbidden', 'Acceso denegado.', ['status' => 401]);
    }

    /**
     * Handle ?add-withmia-cart= URL parameter
     */
    public function handle_cart_url() {
        if (!isset($_GET['add-withmia-cart']) || empty($_GET['add-withmia-cart'])) {
            return;
        }

        $cart_string = sanitize_text_field(wp_unslash($_GET['add-withmia-cart']));
        $items = explode(',', $cart_string);
        $added = 0;
        $errors = [];

        // Clear cart first if requested (requires valid nonce to prevent CSRF)
        if (isset($_GET['withmia-clear-cart']) && $_GET['withmia-clear-cart'] === '1') {
            if (isset($_GET['_wcnonce']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wcnonce'])), 'withmia_clear_cart')) {
                WC()->cart->empty_cart();
            }
        }

        foreach ($items as $item) {
            $item = trim($item);
            if (empty($item)) {
                continue;
            }

            // Parse product_id:quantity or product_id_variation_id:quantity
            $parts = explode(':', $item);
            $product_part = $parts[0];
            $quantity = isset($parts[1]) ? max(1, intval($parts[1])) : 1;

            // Check for variation (product_id_variation_id)
            $product_id = 0;
            $variation_id = 0;

            if (strpos($product_part, '_') !== false) {
                $ids = explode('_', $product_part);
                $product_id = intval($ids[0]);
                $variation_id = intval($ids[1]);
            } else {
                $product_id = intval($product_part);
            }

            if ($product_id <= 0) {
                continue;
            }

            $product = wc_get_product($product_id);
            if (!$product) {
                $errors[] = "Producto #{$product_id} no encontrado";
                continue;
            }

            try {
                if ($variation_id > 0) {
                    // Variable product
                    $variation = wc_get_product($variation_id);
                    if ($variation && $variation->is_type('variation')) {
                        $variation_attributes = $variation->get_variation_attributes();
                        WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $variation_attributes);
                        $added++;
                    } else {
                        $errors[] = "Variación #{$variation_id} no encontrada para producto #{$product_id}";
                    }
                } else {
                    // Simple product
                    WC()->cart->add_to_cart($product_id, $quantity);
                    $added++;
                }
            } catch (\Exception $e) {
                $errors[] = "Error al agregar producto #{$product_id}: " . $e->getMessage();
            }
        }

        // Track this as a WITHMIA-generated cart for metrics
        if ($added > 0) {
            WC()->session->set('withmia_cart_source', 'withmia_url');
            WC()->session->set('withmia_cart_created', current_time('mysql'));

            // Record sale event
            $this->record_cart_event($cart_string, $added);
        }

        // Redirect to cart or checkout
        $redirect = isset($_GET['withmia-redirect']) ? sanitize_text_field($_GET['withmia-redirect']) : 'cart';
        if ($redirect === 'checkout') {
            wp_safe_redirect(wc_get_checkout_url());
        } else {
            wp_safe_redirect(wc_get_cart_url());
        }
        exit;
    }

    /**
     * Generate a cart URL from a list of products
     */
    public function generate_cart_url($request) {
        $items = $request->get_param('items');
        $redirect = $request->get_param('redirect') ?? 'cart';
        $clear_cart = $request->get_param('clear_cart') ?? false;

        if (!$items || !is_array($items)) {
            return new WP_Error('invalid_items', 'Se requiere un array de items.', ['status' => 400]);
        }

        $cart_parts = [];
        $total = 0;
        $product_details = [];

        foreach ($items as $item) {
            $product_id = intval($item['product_id'] ?? 0);
            $variation_id = intval($item['variation_id'] ?? 0);
            $quantity = max(1, intval($item['quantity'] ?? 1));

            if ($product_id <= 0) {
                continue;
            }

            $product = wc_get_product($product_id);
            if (!$product) {
                continue;
            }

            if ($variation_id > 0) {
                $cart_parts[] = "{$product_id}_{$variation_id}:{$quantity}";
                $var_product = wc_get_product($variation_id);
                $price = $var_product ? $var_product->get_price() : $product->get_price();
            } else {
                $cart_parts[] = "{$product_id}:{$quantity}";
                $price = $product->get_price();
            }

            $total += floatval($price) * $quantity;
            $product_details[] = [
                'id' => $product_id,
                'name' => $product->get_name(),
                'quantity' => $quantity,
                'price' => $price,
                'subtotal' => floatval($price) * $quantity,
            ];
        }

        if (empty($cart_parts)) {
            return new WP_Error('no_valid_items', 'No se encontraron productos válidos.', ['status' => 400]);
        }

        $cart_string = implode(',', $cart_parts);
        $url = home_url('/cart/?add-withmia-cart=' . $cart_string);

        if ($redirect === 'checkout') {
            $url .= '&withmia-redirect=checkout';
        }
        if ($clear_cart) {
            $url .= '&withmia-clear-cart=1';
        }

        return new WP_REST_Response([
            'url' => $url,
            'short_url' => $url,
            'cart_string' => $cart_string,
            'items' => $product_details,
            'total' => $total,
            'currency' => get_woocommerce_currency(),
        ], 200);
    }

    /**
     * Record cart creation event for WITHMIA metrics
     */
    private function record_cart_event($cart_string, $items_added) {
        $webhook_url = get_option('withmia_webhook_url');
        if (!$webhook_url) {
            return;
        }

        wp_remote_post($webhook_url, [
            'timeout' => 5,
            'blocking' => false,
            'body' => wp_json_encode([
                'event' => 'cart_created',
                'source' => 'withmia_url',
                'cart_string' => $cart_string,
                'items_added' => $items_added,
                'store_url' => home_url(),
                'timestamp' => current_time('c'),
            ]),
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Withmia-Store' => home_url(),
            ],
        ]);
    }
}
