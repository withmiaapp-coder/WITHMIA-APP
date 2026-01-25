<?php
/**
 * Verificar que detectIfQuestion existe en el deploy
 */

require __DIR__ . '/vendor/autoload.php';

$controller = new ReflectionClass('App\Http\Controllers\KnowledgeController');

echo "📋 VERIFICACIÓN DE DEPLOY\n";
echo "═══════════════════════════════════════\n\n";

if ($controller->hasMethod('detectIfQuestion')) {
    echo "✅ Método detectIfQuestion EXISTE\n";
    
    // Probar el método
    $method = $controller->getMethod('detectIfQuestion');
    $method->setAccessible(true);
    
    $instance = $controller->newInstanceWithoutConstructor();
    
    $testCases = [
        '¿Cuáles son sus precios?' => true,
        '¿horario de atención tienen?' => true,
        'En qué horario atienden?' => true,
        'Nuestro horario es de 9 a 6' => false,
        'Abrimos de lunes a viernes' => false,
        'Vendemos productos de tecnología' => false,
    ];
    
    echo "\n🧪 PRUEBAS:\n";
    foreach ($testCases as $msg => $expected) {
        $result = $method->invoke($instance, $msg);
        $status = ($result === $expected) ? '✅' : '❌';
        $type = $result ? 'PREGUNTA' : 'INFORMACIÓN';
        $expectedType = $expected ? 'PREGUNTA' : 'INFORMACIÓN';
        echo "$status \"$msg\" => $type (esperado: $expectedType)\n";
    }
} else {
    echo "❌ Método detectIfQuestion NO EXISTE - EL DEPLOY NO ESTÁ ACTUALIZADO\n";
}
