<?php
/**
 * WITHMIA REST API - Simplified product endpoint
 *
 * Provides /wp-json/wc/v3/withmia-products
 */

if (!defined('ABSPATH')) {
    exit;
}

class Withmia_API {

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    /**
     * Register REST routes
     */
    public function register_routes() {
        // Products endpoint
        register_rest_route('wc/v3', '/withmia-products', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_products'],
            'permission_callback' => [$this, 'check_permissions'],
            'args' => [
                'page' => ['default' => 1, 'type' => 'integer', 'sanitize_callback' => 'absint'],
                'per_page' => ['default' => 100, 'type' => 'integer', 'sanitize_callback' => 'absint'],
                'search' => ['default' => '', 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field'],
                'category' => ['default' => '', 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field'],
            ],
        ]);

        // Single product
        register_rest_route('wc/v3', '/withmia-products/(?P<id>\d+)', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_product'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);

        // Categories
        register_rest_route('wc/v3', '/withmia-categories', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_categories'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);

        // Stock check
        register_rest_route('wc/v3', '/withmia-stock/(?P<id>\d+)', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_stock'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);

        // Store info
        register_rest_route('wc/v3', '/withmia-store', [
            'methods'  => 'GET',
            'callback' => [$this, 'get_store_info'],
            'permission_callback' => [$this, 'check_permissions'],
        ]);
    }

    /**
     * Check API permissions (WooCommerce keys or WITHMIA API key)
     */
    public function check_permissions($request) {
        // Allow WooCommerce consumer key auth (require manage_woocommerce capability)
        if (is_user_logged_in() && current_user_can('manage_woocommerce')) {
            return true;
        }

        // Allow WITHMIA API key (header only — never accept via query params to avoid log leakage)
        $api_key = $request->get_header('X-Withmia-Key');

        if ($api_key && hash_equals(get_option('withmia_api_key', ''), $api_key)) {
            return true;
        }

        return new WP_Error('rest_forbidden', 'Acceso denegado.', ['status' => 401]);
    }

    /**
     * Get products (simplified)
     */
    public function get_products($request) {
        $page = $request->get_param('page');
        $per_page = min($request->get_param('per_page'), 100);
        $search = $request->get_param('search');
        $category = $request->get_param('category');

        $args = [
            'status'   => 'publish',
            'limit'    => $per_page,
            'page'     => $page,
            'orderby'  => 'title',
            'order'    => 'ASC',
        ];

        if ($search) {
            $args['s'] = $search;
        }

        if ($category) {
            $args['category'] = [$category];
        }

        $products = wc_get_products($args);
        $data = [];

        foreach ($products as $product) {
            $data[] = $this->format_product($product);
        }

        // Get total count
        $count_args = $args;
        $count_args['limit'] = -1;
        $count_args['return'] = 'ids';
        $total = count(wc_get_products($count_args));

        return new WP_REST_Response([
            'products' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page,
            'total_pages' => ceil($total / $per_page),
        ], 200);
    }

    /**
     * Get single product
     */
    public function get_product($request) {
        $product = wc_get_product($request->get_param('id'));

        if (!$product) {
            return new WP_Error('not_found', 'Producto no encontrado.', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_product($product, true), 200);
    }

    /**
     * Get categories
     */
    public function get_categories($request) {
        $terms = get_terms([
            'taxonomy'   => 'product_cat',
            'hide_empty' => true,
            'orderby'    => 'name',
        ]);

        $categories = [];
        foreach ($terms as $term) {
            $categories[] = [
                'id'    => $term->term_id,
                'name'  => $term->name,
                'slug'  => $term->slug,
                'count' => $term->count,
            ];
        }

        return new WP_REST_Response(['categories' => $categories], 200);
    }

    /**
     * Get stock for a product
     */
    public function get_stock($request) {
        $product = wc_get_product($request->get_param('id'));

        if (!$product) {
            return new WP_Error('not_found', 'Producto no encontrado.', ['status' => 404]);
        }

        $stock_data = [
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'sku' => $product->get_sku(),
            'manage_stock' => $product->managing_stock(),
            'stock_quantity' => $product->get_stock_quantity(),
            'stock_status' => $product->get_stock_status(),
            'in_stock' => $product->is_in_stock(),
            'backorders_allowed' => $product->backorders_allowed(),
        ];

        // If variable, include variation stock
        if ($product->is_type('variable')) {
            $stock_data['variations'] = [];
            foreach ($product->get_available_variations() as $variation) {
                $var_product = wc_get_product($variation['variation_id']);
                $stock_data['variations'][] = [
                    'id' => $variation['variation_id'],
                    'attributes' => $variation['attributes'],
                    'stock_quantity' => $var_product ? $var_product->get_stock_quantity() : null,
                    'stock_status' => $var_product ? $var_product->get_stock_status() : 'outofstock',
                    'in_stock' => $var_product ? $var_product->is_in_stock() : false,
                ];
            }
        }

        return new WP_REST_Response($stock_data, 200);
    }

    /**
     * Get store info
     */
    public function get_store_info($request) {
        return new WP_REST_Response([
            'store_name' => get_bloginfo('name'),
            'store_url' => home_url(),
            'currency' => get_woocommerce_currency(),
            'currency_symbol' => get_woocommerce_currency_symbol(),
            'products_count' => (int) wp_count_posts('product')->publish,
            'woocommerce_version' => WC()->version,
            'plugin_version' => WITHMIA_WC_VERSION,
            'timezone' => wp_timezone_string(),
        ], 200);
    }

    /**
     * Format product data (simplified)
     */
    private function format_product($product, $detailed = false) {
        $data = [
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'type' => $product->get_type(),
            'status' => $product->get_status(),
            'sku' => $product->get_sku(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'on_sale' => $product->is_on_sale(),
            'stock_status' => $product->get_stock_status(),
            'stock_quantity' => $product->get_stock_quantity(),
            'in_stock' => $product->is_in_stock(),
            'permalink' => $product->get_permalink(),
            'short_description' => wp_strip_all_tags($product->get_short_description()),
            'weight' => $product->get_weight(),
            'categories' => [],
            'tags' => [],
            'images' => [],
            'add_to_cart_url' => home_url('/?add-withmia-cart=' . $product->get_id() . ':1'),
        ];

        // Categories
        foreach ($product->get_category_ids() as $cat_id) {
            $term = get_term($cat_id, 'product_cat');
            if ($term && !is_wp_error($term)) {
                $data['categories'][] = ['id' => $term->term_id, 'name' => $term->name];
            }
        }

        // Tags
        foreach ($product->get_tag_ids() as $tag_id) {
            $term = get_term($tag_id, 'product_tag');
            if ($term && !is_wp_error($term)) {
                $data['tags'][] = ['id' => $term->term_id, 'name' => $term->name];
            }
        }

        // Images
        $image_id = $product->get_image_id();
        if ($image_id) {
            $data['images'][] = wp_get_attachment_url($image_id);
        }
        foreach ($product->get_gallery_image_ids() as $gal_id) {
            $url = wp_get_attachment_url($gal_id);
            if ($url) {
                $data['images'][] = $url;
            }
        }

        // Attributes
        $data['attributes'] = [];
        foreach ($product->get_attributes() as $attr) {
            if (is_a($attr, 'WC_Product_Attribute')) {
                $data['attributes'][] = [
                    'name' => wc_attribute_label($attr->get_name()),
                    'options' => $attr->get_options(),
                    'visible' => $attr->get_visible(),
                ];
            }
        }

        // Full description only in detail view
        if ($detailed) {
            $data['description'] = wp_strip_all_tags($product->get_description());
        }

        // Variations for variable products
        if ($product->is_type('variable')) {
            $data['variations'] = [];
            foreach ($product->get_available_variations() as $variation) {
                $var_data = [
                    'id' => $variation['variation_id'],
                    'sku' => $variation['sku'] ?? '',
                    'price' => $variation['display_price'] ?? '',
                    'regular_price' => $variation['display_regular_price'] ?? '',
                    'attributes' => $variation['attributes'] ?? [],
                    'in_stock' => $variation['is_in_stock'] ?? false,
                    'stock_quantity' => $variation['max_qty'] ?? null,
                    'image' => $variation['image']['url'] ?? '',
                    'add_to_cart_url' => home_url('/?add-withmia-cart=' . $product->get_id() . '_' . $variation['variation_id'] . ':1'),
                ];
                $data['variations'][] = $var_data;
            }
        }

        return $data;
    }
}
