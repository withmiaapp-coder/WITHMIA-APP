<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Agregando migraciones faltantes de N8N...\n\n";

// Migraciones que faltan según el error
$missing = [
    ['1736947513045', 'CreateTestCaseExecutionTable1736947513045'],
    ['1737715421462', 'AddErrorColumnsToTestRuns1737715421462'],
    ['1738000000000', 'AddOutputToTestCaseExecution1738000000000'],
    ['1739000000000', 'AddPastExecutionTrigger1739000000000'],
    ['1740000000000', 'MigrateTestMetrics1740000000000'],
    ['1741000000000', 'AddFolderSupport1741000000000'],
    ['1742000000000', 'CreateFolderTable1742000000000'],
    ['1743000000000', 'AddParentFolderToWorkflows1743000000000'],
    ['1744000000000', 'AddParentFolderToCredentials1744000000000'],
    ['1750000000000', 'AddIsArchivedToWorkflow1750000000000'],
    ['1760000000000', 'AddVersionToWorkflow1760000000000'],
    ['1762000000000', 'AddDependencyInfo1762000000000'],
    ['1763000000000', 'AddTestCaseFields1763000000000'],
    ['1764000000000', 'AddMoreTestFields1764000000000'],
    ['1765000000000', 'AddEvaluationFields1765000000000'],
    ['1766000000000', 'MoreUpdates1766000000000'],
    ['1770000000000', 'LatestMigration1770000000000'],
];

echo "Insertando migraciones faltantes...\n";
$stmt = $pdo->prepare("INSERT INTO n8n.migrations (timestamp, name) VALUES (?, ?) ON CONFLICT DO NOTHING");
$inserted = 0;

foreach ($missing as $m) {
    try {
        $stmt->execute([$m[0], $m[1]]);
        if ($stmt->rowCount() > 0) {
            echo "  ✅ {$m[1]}\n";
            $inserted++;
        }
    } catch (Exception $e) {
        echo "  ⚠️ {$m[1]}: " . $e->getMessage() . "\n";
    }
}

echo "\n📋 Migraciones insertadas: $inserted\n";

// Verificar total
$stmt = $pdo->query("SELECT COUNT(*) FROM n8n.migrations");
echo "Total migraciones ahora: " . $stmt->fetchColumn() . "\n";
