=== WITHMIA para WooCommerce ===
Contributors: withmia
Tags: woocommerce, whatsapp, chatbot, ia, ecommerce, abandoned cart, live chat
Requires at least: 5.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Conecta tu tienda WooCommerce con WITHMIA: tu asistente de ventas con IA para WhatsApp, Instagram y más.

== Description ==

**WITHMIA para WooCommerce** integra tu tienda online con la plataforma [WITHMIA](https://withmia.com), permitiendo que tu asistente de IA venda productos, genere carritos, rastree pedidos y recupere carritos abandonados — todo desde WhatsApp, Instagram, Messenger y tu webchat.

### ¿Qué hace este plugin?

🤖 **Asistente de ventas con IA**
Tu bot de WITHMIA accede al catálogo de tu tienda en tiempo real. Puede recomendar productos, responder consultas de stock, precios y promociones directamente en el chat.

🛒 **Generación automática de carritos**
El asistente crea enlaces de carrito pre-cargados que el cliente solo necesita abrir para completar su compra. Compatible con productos simples y variables.

📦 **Seguimiento de pedidos**
Los clientes consultan el estado de sus pedidos por WhatsApp. WITHMIA recibe notificaciones automáticas de cada cambio de estado.

🔔 **Notificaciones en tiempo real**
Recibe alertas de nuevos pedidos, cambios de estado, stock bajo, nuevos clientes y reembolsos directamente en tu panel de WITHMIA.

💰 **Recuperación de carritos abandonados**
El plugin detecta carritos abandonados y notifica a WITHMIA, que puede enviar un mensaje automático por WhatsApp para recuperar la venta.

📊 **Métricas de ventas**
Accede a estadísticas de conversión, tasa de recuperación de carritos y más desde tu dashboard de WITHMIA.

### Características principales

* **API simplificada**: Endpoints REST optimizados para consultas de IA
* **Autenticación segura**: API Key dedicada (no requiere credenciales de WooCommerce)
* **Carrito por URL**: Genera enlaces de carrito con múltiples productos y cantidades
* **Detección de abandono**: Identifica carritos abandonados después de 30 minutos
* **Webhooks configurables**: Elige qué eventos enviar a WITHMIA
* **Panel de administración**: Configura todo desde WooCommerce → WITHMIA
* **Compatible**: WordPress 5.0+, WooCommerce 5.0+, PHP 7.4+
* **Ligero**: No afecta el rendimiento de tu tienda

### Canales soportados

* WhatsApp (vía API Cloud o Evolution API)
* Instagram Direct
* Facebook Messenger
* Webchat en tu sitio
* Email

### ¿Cómo funciona?

1. Instala y activa el plugin
2. Copia la API Key desde WooCommerce → WITHMIA
3. Pégala en tu panel de WITHMIA (app.withmia.com → Integraciones → WooCommerce)
4. Copia el Webhook URL que te da WITHMIA y pégalo en la configuración del plugin
5. ¡Listo! Tu asistente de IA ya puede vender tus productos

== Installation ==

### Instalación automática

1. Ve a **Plugins → Añadir nuevo** en tu panel de WordPress
2. Busca "WITHMIA"
3. Haz clic en **Instalar** y luego en **Activar**

### Instalación manual

1. Descarga el archivo ZIP del plugin
2. Ve a **Plugins → Añadir nuevo → Subir plugin**
3. Selecciona el archivo ZIP y haz clic en **Instalar ahora**
4. Activa el plugin

### Configuración

1. Ve a **WooCommerce → WITHMIA** en el menú lateral
2. Copia tu **API Key** (se genera automáticamente)
3. En [app.withmia.com](https://app.withmia.com), ve a **Integraciones → WooCommerce**
4. Pega la API Key y la URL de tu tienda
5. Copia la **URL del Webhook** que te proporciona WITHMIA
6. Pégala en el campo "URL del Webhook" en la configuración del plugin
7. Selecciona los eventos que quieres enviar
8. Haz clic en **Guardar cambios**

== Frequently Asked Questions ==

= ¿Necesito una cuenta de WITHMIA? =

Sí. Este plugin funciona como conector entre tu tienda WooCommerce y la plataforma WITHMIA. Puedes crear una cuenta gratuita en [withmia.com](https://withmia.com).

= ¿El plugin ralentiza mi tienda? =

No. Las notificaciones webhook se envían de forma asíncrona (non-blocking) y los endpoints API solo responden cuando son consultados.

= ¿Funciona con productos variables? =

Sí. El plugin soporta productos simples, variables (con variaciones), agrupados y externos. Los carritos pre-cargados también funcionan con variaciones específicas.

= ¿Qué datos se envían a WITHMIA? =

Solo los datos que configurés en la sección de eventos: información de pedidos, cambios de stock, y datos de carritos abandonados. No se envían contraseñas ni datos financieros sensibles.

= ¿Necesito WooCommerce REST API activada? =

Sí, pero está activada por defecto en WordPress. El plugin usa el namespace de WooCommerce REST API para registrar sus endpoints propios.

= ¿Puedo usar la API sin la plataforma WITHMIA? =

Sí. Los endpoints REST (`/wc/v3/withmia-products`, etc.) pueden ser usados por cualquier aplicación que tenga la API Key. Sin embargo, las funciones de IA y chat requieren la plataforma WITHMIA.

= ¿Funciona con tiendas multilingüe? =

Sí. El plugin devuelve los productos en el idioma configurado en tu tienda. Es compatible con WPML y Polylang.

= ¿Cómo funciona la recuperación de carritos abandonados? =

El plugin rastrea la actividad del carrito de cada sesión. Si un carrito no tiene actividad por 30 minutos, se marca como abandonado y se notifica a WITHMIA. Tu asistente de IA puede entonces enviar un mensaje por WhatsApp con un enlace de recuperación.

== Screenshots ==

1. Panel de configuración en WooCommerce → WITHMIA
2. API Key y estado de conexión
3. Configuración de eventos webhook
4. Endpoints API disponibles

== Changelog ==

= 1.0.0 =
* Lanzamiento inicial
* API REST simplificada para productos, categorías y stock
* Generación de carritos pre-cargados por URL
* Rastreo de carritos abandonados con notificación por webhook
* Panel de administración bajo WooCommerce
* Webhooks para pedidos, stock, clientes y reembolsos
* Compatibilidad con productos variables
* Autenticación por API Key dedicada

== Upgrade Notice ==

= 1.0.0 =
Primera versión. Instala para conectar tu tienda con WITHMIA.
