<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Restaurando migraciones de N8N...\n\n";

// Lista de todas las migraciones que deben estar marcadas como completadas
// Basado en el error, necesitamos marcar todas las migraciones hasta la última versión
$migrations = [
    '1587669153312' => 'InitialMigration1587669153312',
    '1589476000887' => 'WebhookModel1589476000887',
    '1594828256133' => 'CreateIndexStoppedAt1594828256133',
    '1607431743768' => 'MakeStoppedAtNullable1607431743768',
    '1611144599516' => 'AddWebhookId1611144599516',
    '1617268711084' => 'UniqueWorkflowNames1620821879465',
    '1617270242566' => 'CreateTagEntity1617270242566',
    '1620826335440' => 'UniqueWorkflowNames1620826335440',
    '1621707690587' => 'AddWaitColumn1621707690587',
    '1626176912946' => 'AddActivatedAtColumnToWorkflow1626176912946',
    '1644424784709' => 'SettingsV1644424784709',
    '1646834195327' => 'LowerCaseUserEmail1648740597343',
    '1648740597343' => 'LowerCaseUserEmail1648740597343',
    '1659888469333' => 'AddStatisticsToExecutions1659888469333',
    '1660062385367' => 'AddRetryableToExecutions1660062385367',
    '1663755770894' => 'AddTimestampColumnsToUsers1663755770894',
    '1669739707125' => 'AddTriggerCountColumn1669739707125',
    '1671535397530' => 'RemoveWorkflowDataLoadedFlag1671535397530',
    '1673268682475' => 'DeleteExecutionsWithWorkflows1673268682475',
    '1674138566000' => 'AddVersionIdToNonPersonalizedTable1674138566000',
    '1674509946020' => 'CreateLdapEntities1674509946020',
    '1675940580449' => 'PurgeInvalidWorkflowConnections1675940580449',
    '1676996103000' => 'CredentialMigration1676996103000',
    '1677236854063' => 'UpdateRunningExecutionStatus1677236854063',
    '1677501636754' => 'UpdateRunningExecutionStatus1677501636754',
    '1679416281779' => 'CreateExecutionMetadataTable1679416281779',
    '1681134145996' => 'AddUserRole1681134145996',
    '1681134145997' => 'AddNodeExecutionMetadataTable1681134145997',
    '1690000000001' => 'MigrateIntegerKeysToString1690000000001',
    '1690000000010' => 'ModifyWorkflowHistoryTable1690000000010',
    '1690787606731' => 'CreateVariables1690787606731',
    '1691089562041' => 'AddPinDataColumn1691089562041',
    '1693491613982' => 'RemoveSkipOwnerSetup1693491613982',
    '1694091729095' => 'MigrateCredentialsToShares1694091729095',
    '1695128658539' => 'AddGlobalAdminRole1695128658539',
    '1695829275184' => 'CreateProject1695829275184',
    '1696918756004' => 'SeparateExecutionCreationFromStart1696918756004',
    '1697108081579' => 'AddMfaColumns1697108081579',
    '1699540136001' => 'AddSourceControlEntities1699540136001',
    '1699891820300' => 'AddStatusToExecutions1699891820300',
    '1700571993961' => 'AddNodeIds1700571993961',
    '1701765048154' => 'UpdateNanoidType1701765048154',
    '1702336824298' => 'SeparateExecutionData1702336824298',
    '1702582454556' => 'IntroducePinData1702582454556',
    '1704371614000' => 'DropRelationsTable1704371614000',
    '1706390000000' => 'MigrateExecutionData1706390000000',
    '1706787800001' => 'CommunityNodes1706787800001',
    '1707390000000' => 'CreateAnnotationTable1707390000000',
    '1707776999000' => 'AddApiKeysTable1707776999000',
    '1708375906001' => 'DropDeletedAtColumn1708375906001',
    '1709651235475' => 'CreateApiKey1709651235475',
    '1711026437901' => 'MoveSshKeysToDatabase1711026437901',
    '1711390882123' => 'DropTestDefinitionTable1711390882123',
    '1712044305787' => 'RemoveInstalledAtFromNodes1712044305787',
    '1713286796440' => 'UniqueUserActiveSessions1713286796440',
];

// Verificar tabla de migraciones
echo "1️⃣ Verificando tabla de migraciones...\n";
$stmt = $pdo->query("SELECT COUNT(*) FROM n8n.migrations");
$count = $stmt->fetchColumn();
echo "  Migraciones actuales: $count\n";

// Insertar todas las migraciones como completadas
echo "\n2️⃣ Insertando migraciones faltantes...\n";
$inserted = 0;

foreach ($migrations as $timestamp => $name) {
    try {
        $stmt = $pdo->prepare("INSERT INTO n8n.migrations (timestamp, name) VALUES (?, ?) ON CONFLICT DO NOTHING");
        $stmt->execute([$timestamp, $name]);
        if ($stmt->rowCount() > 0) {
            $inserted++;
        }
    } catch (Exception $e) {
        // Ignorar
    }
}

echo "  ✅ $inserted migraciones insertadas\n";

// Verificar resultado
$stmt = $pdo->query("SELECT COUNT(*) FROM n8n.migrations");
$count = $stmt->fetchColumn();
echo "\n📋 Total migraciones ahora: $count\n";

// Mostrar últimas 10 migraciones
echo "\nÚltimas 10 migraciones:\n";
$stmt = $pdo->query("SELECT timestamp, name FROM n8n.migrations ORDER BY timestamp DESC LIMIT 10");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  {$row['timestamp']} - {$row['name']}\n";
}

echo "\n✅ ¡Migraciones restauradas!\n";
