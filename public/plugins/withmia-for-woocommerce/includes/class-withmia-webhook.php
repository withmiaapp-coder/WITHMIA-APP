<?php
/**
 * WITHMIA Webhook Notifications
 *
 * Sends events to the WITHMIA platform (orders, stock, etc.)
 */

if (!defined('ABSPATH')) {
    exit;
}

class Withmia_Webhook {

    /** @var string */
    private $webhook_url;

    /** @var string */
    private $api_key;

    /** @var string HMAC signing secret for outbound webhooks */
    private $webhook_secret;

    public function __construct() {
        $this->webhook_url = get_option('withmia_webhook_url', '');
        $this->api_key = get_option('withmia_api_key', '');
        $this->webhook_secret = get_option('withmia_webhook_secret', '');

        // Order events
        add_action('woocommerce_new_order', [$this, 'on_new_order'], 10, 2);
        add_action('woocommerce_order_status_changed', [$this, 'on_order_status_changed'], 10, 4);

        // Product events
        add_action('woocommerce_update_product', [$this, 'on_product_updated'], 10, 2);
        add_action('woocommerce_product_set_stock', [$this, 'on_stock_changed']);
        add_action('woocommerce_variation_set_stock', [$this, 'on_stock_changed']);

        // Low stock alert
        add_action('woocommerce_low_stock', [$this, 'on_low_stock']);
        add_action('woocommerce_no_stock', [$this, 'on_out_of_stock']);

        // Customer events
        add_action('woocommerce_created_customer', [$this, 'on_new_customer'], 10, 3);

        // Refund events
        add_action('woocommerce_refund_created', [$this, 'on_refund_created'], 10, 2);
    }

    /**
     * Send webhook event
     */
    public function send($event, $data = []) {
        if (empty($this->webhook_url)) {
            return false;
        }

        // Respect enabled_events configuration
        $enabled_events = get_option('withmia_enabled_events', []);
        if (!empty($enabled_events) && is_array($enabled_events) && !in_array($event, $enabled_events, true)) {
            return false;
        }

        $payload = array_merge([
            'event' => $event,
            'store_url' => home_url(),
            'store_name' => get_bloginfo('name'),
            'timestamp' => current_time('c'),
            'plugin_version' => WITHMIA_WC_VERSION,
        ], $data);

        $body = wp_json_encode($payload);

        $headers = [
            'Content-Type' => 'application/json',
            'X-Withmia-Key' => $this->api_key,
            'X-Withmia-Store' => home_url(),
            'X-Withmia-Event' => $event,
        ];

        // Sign payload with HMAC-SHA256 using the webhook secret
        if (!empty($this->webhook_secret)) {
            $signature = hash_hmac('sha256', $body, $this->webhook_secret);
            $headers['X-Hub-Signature-256'] = 'sha256=' . $signature;
        }

        $response = wp_remote_post($this->webhook_url, [
            'timeout' => 15,
            'blocking' => false,
            'body' => $body,
            'headers' => $headers,
        ]);

        // Log errors
        if (is_wp_error($response)) {
            error_log('[WITHMIA Webhook] Error sending ' . $event . ': ' . $response->get_error_message());
            return false;
        }

        return true;
    }

    /**
     * New order placed
     */
    public function on_new_order($order_id, $order = null) {
        if (!$order) {
            $order = wc_get_order($order_id);
        }
        if (!$order) {
            return;
        }

        $items = [];
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            $items[] = [
                'product_id' => $item->get_product_id(),
                'variation_id' => $item->get_variation_id(),
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'total' => (float) $item->get_total(),
                'sku' => $product ? $product->get_sku() : '',
            ];
        }

        $this->send('order.created', [
            'order' => [
                'id' => $order_id,
                'number' => $order->get_order_number(),
                'status' => $order->get_status(),
                'total' => (float) $order->get_total(),
                'subtotal' => (float) $order->get_subtotal(),
                'shipping_total' => (float) $order->get_shipping_total(),
                'discount_total' => (float) $order->get_discount_total(),
                'currency' => $order->get_currency(),
                'payment_method' => $order->get_payment_method_title(),
                'customer_email' => $order->get_billing_email(),
                'customer_phone' => $order->get_billing_phone(),
                'customer_name' => $order->get_formatted_billing_full_name(),
                'billing_address' => $this->format_address($order, 'billing'),
                'shipping_address' => $this->format_address($order, 'shipping'),
                'items' => $items,
                'order_url' => $order->get_edit_order_url(),
                'customer_order_url' => $order->get_view_order_url(),
                'created_at' => $order->get_date_created() ? $order->get_date_created()->format('c') : null,
            ],
        ]);
    }

    /**
     * Order status changed
     */
    public function on_order_status_changed($order_id, $old_status, $new_status, $order) {
        $this->send('order.status_changed', [
            'order' => [
                'id' => $order_id,
                'number' => $order->get_order_number(),
                'old_status' => $old_status,
                'new_status' => $new_status,
                'total' => (float) $order->get_total(),
                'currency' => $order->get_currency(),
                'customer_email' => $order->get_billing_email(),
                'customer_phone' => $order->get_billing_phone(),
                'customer_name' => $order->get_formatted_billing_full_name(),
                'tracking_info' => $this->get_tracking_info($order),
            ],
        ]);
    }

    /**
     * Product updated
     */
    public function on_product_updated($product_id, $product = null) {
        if (!$product) {
            $product = wc_get_product($product_id);
        }
        if (!$product) {
            return;
        }

        $this->send('product.updated', [
            'product' => [
                'id' => $product_id,
                'name' => $product->get_name(),
                'sku' => $product->get_sku(),
                'price' => (float) $product->get_price(),
                'regular_price' => (float) $product->get_regular_price(),
                'sale_price' => $product->get_sale_price() ? (float) $product->get_sale_price() : null,
                'stock_status' => $product->get_stock_status(),
                'stock_quantity' => $product->get_stock_quantity(),
                'status' => $product->get_status(),
                'permalink' => $product->get_permalink(),
            ],
        ]);
    }

    /**
     * Stock level changed
     */
    public function on_stock_changed($product) {
        $this->send('product.stock_changed', [
            'product' => [
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'sku' => $product->get_sku(),
                'stock_status' => $product->get_stock_status(),
                'stock_quantity' => $product->get_stock_quantity(),
                'type' => $product->get_type(),
                'parent_id' => $product->get_parent_id(),
            ],
        ]);
    }

    /**
     * Low stock notification
     */
    public function on_low_stock($product) {
        $this->send('product.low_stock', [
            'product' => [
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'sku' => $product->get_sku(),
                'stock_quantity' => $product->get_stock_quantity(),
                'low_stock_threshold' => $product->get_low_stock_amount() ?: get_option('woocommerce_notify_low_stock_amount', 2),
            ],
        ]);
    }

    /**
     * Out of stock notification
     */
    public function on_out_of_stock($product) {
        $this->send('product.out_of_stock', [
            'product' => [
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'sku' => $product->get_sku(),
            ],
        ]);
    }

    /**
     * New customer registered
     */
    public function on_new_customer($customer_id, $customer_data, $password_generated) {
        $customer = new WC_Customer($customer_id);

        $this->send('customer.created', [
            'customer' => [
                'id' => $customer_id,
                'email' => $customer->get_email(),
                'first_name' => $customer->get_first_name(),
                'last_name' => $customer->get_last_name(),
                'phone' => $customer->get_billing_phone(),
            ],
        ]);
    }

    /**
     * Refund created
     */
    public function on_refund_created($refund_id, $args) {
        $refund = wc_get_order($refund_id);
        if (!$refund) {
            return;
        }

        $parent = wc_get_order($refund->get_parent_id());

        $this->send('order.refunded', [
            'refund' => [
                'id' => $refund_id,
                'order_id' => $refund->get_parent_id(),
                'order_number' => $parent ? $parent->get_order_number() : null,
                'amount' => (float) $refund->get_amount(),
                'reason' => $refund->get_reason(),
                'currency' => $refund->get_currency(),
                'customer_email' => $parent ? $parent->get_billing_email() : null,
                'customer_phone' => $parent ? $parent->get_billing_phone() : null,
            ],
        ]);
    }

    /**
     * Format address
     */
    private function format_address($order, $type = 'billing') {
        $fields = ['first_name', 'last_name', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country'];
        $address = [];

        foreach ($fields as $field) {
            $method = "get_{$type}_{$field}";
            if (method_exists($order, $method)) {
                $address[$field] = $order->$method();
            }
        }

        return $address;
    }

    /**
     * Try to get tracking info from popular tracking plugins
     */
    private function get_tracking_info($order) {
        // Advanced Shipment Tracking (AST)
        $tracking = $order->get_meta('_wc_shipment_tracking_items');
        if (!empty($tracking) && is_array($tracking)) {
            return array_map(function ($item) {
                return [
                    'provider' => $item['tracking_provider'] ?? '',
                    'number' => $item['tracking_number'] ?? '',
                    'url' => $item['custom_tracking_link'] ?? '',
                ];
            }, $tracking);
        }

        // WooCommerce Shipment Tracking
        $tracking_number = $order->get_meta('_tracking_number');
        if ($tracking_number) {
            return [[
                'provider' => $order->get_meta('_tracking_provider') ?: '',
                'number' => $tracking_number,
                'url' => $order->get_meta('_tracking_link') ?: '',
            ]];
        }

        return null;
    }
}
