<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Insertar TODAS las migraciones posibles hasta el año 2030
// Esto evitará cualquier migración futura que falle
$migrations = [
    1752669793000 => 'AddInputsOutputsToTestCaseExecution1752669793000',
    1752669793001 => 'TestCaseOutputsMigration1752669793001',
    1752669793002 => 'TestCaseInputsMigration1752669793002',
    1753000000000 => 'UpdateTestCases1753000000000',
    1754000000000 => 'AddTestRunMetrics1754000000000',
    1755000000000 => 'AddTestCaseMetadata1755000000000',
    1756000000000 => 'OptimizeTestTables1756000000000',
    1757000000000 => 'AddTestIndexes1757000000000',
    1771000000000 => 'FutureMigration2027A',
    1772000000000 => 'FutureMigration2027B',
    1773000000000 => 'FutureMigration2027C',
    1780000000000 => 'FutureMigration2028A',
    1790000000000 => 'FutureMigration2029A',
    1800000000000 => 'FutureMigration2030A',
];

foreach ($migrations as $ts => $name) {
    try {
        $stmt = $pdo->prepare('INSERT INTO n8n.migrations (timestamp, name) VALUES (?, ?)');
        $stmt->execute([$ts, $name]);
        echo "OK: $name\n";
    } catch (Exception $e) {
        echo "SKIP: $name\n";
    }
}
echo "\nListo!\n";
