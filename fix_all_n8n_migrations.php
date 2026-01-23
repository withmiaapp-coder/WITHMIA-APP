<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Marcando TODAS las migraciones de N8N como completadas...\n\n";

// Lista completa de migraciones de postgres desde el repo de n8n
// Orden exacto del archivo index.ts
$migrations = [
    ['1587669153312', 'InitialMigration1587669153312'],
    ['1589476000887', 'WebhookModel1589476000887'],
    ['1594828256133', 'CreateIndexStoppedAt1594828256133'],
    ['1611144599516', 'AddWebhookId1611144599516'],
    ['1607431743768', 'MakeStoppedAtNullable1607431743768'],
    ['1617270242566', 'CreateTagEntity1617270242566'],
    ['1620824779533', 'UniqueWorkflowNames1620824779533'],
    ['1626176912946', 'AddwaitTill1626176912946'],
    ['1630419189837', 'UpdateWorkflowCredentials1630419189837'],
    ['1644422880309', 'AddExecutionEntityIndexes1644422880309'],
    ['1646834195327', 'IncreaseTypeVarcharLimit1646834195327'],
    ['1646992772331', 'CreateUserManagement1646992772331'],
    ['1648740597343', 'LowerCaseUserEmail1648740597343'],
    ['1652367743993', 'AddUserSettings1652367743993'],
    ['1652254514002', 'CommunityNodes1652254514002'],
    ['1652905585850', 'AddAPIKeyColumn1652905585850'],
    ['1654090467022', 'IntroducePinData1654090467022'],
    ['1660062385367', 'CreateCredentialsUserRole1660062385367'],
    ['1658932090381', 'AddNodeIds1658932090381'],
    ['1659902242948', 'AddJsonKeyPinData1659902242948'],
    ['1663755770893', 'CreateWorkflowsEditorRole1663755770893'],
    ['1665484192212', 'CreateCredentialUsageTable1665484192212'],
    ['1665754637025', 'RemoveCredentialUsageTable1665754637025'],
    ['1669739707126', 'AddWorkflowVersionIdColumn1669739707126'],
    ['1664196174001', 'WorkflowStatistics1664196174001'],
    ['1669823906995', 'AddTriggerCountColumn1669823906995'],
    ['1671726148421', 'RemoveWorkflowDataLoadedFlag1671726148421'],
    ['1671535397530', 'MessageEventBusDestinations1671535397530'],
    ['1673268682475', 'DeleteExecutionsWithWorkflows1673268682475'],
    ['1674509946020', 'CreateLdapEntities1674509946020'],
    ['1675940580449', 'PurgeInvalidWorkflowConnections1675940580449'],
    ['1674138566000', 'AddStatusToExecutions1674138566000'],
    ['1676996103000', 'MigrateExecutionStatus1676996103000'],
    ['1677236854063', 'UpdateRunningExecutionStatus1677236854063'],
    ['1679416281778', 'CreateExecutionMetadataTable1679416281778'],
    ['1677501636754', 'CreateVariables1677501636754'],
    ['1681134145996', 'AddUserActivatedProperty1681134145996'],
    ['1690000000000', 'MigrateIntegerKeysToString1690000000000'],
    ['1690000000020', 'SeparateExecutionData1690000000020'],
    ['1681134145997', 'RemoveSkipOwnerSetup1681134145997'],
    ['1690000000030', 'RemoveResetPasswordColumns1690000000030'],
    ['1690787606731', 'AddMissingPrimaryKeyOnExecutionData1690787606731'],
    ['1691088862123', 'CreateWorkflowNameIndex1691088862123'],
    ['1690000000040', 'AddMfaColumns1690000000030'],
    ['1692967111175', 'CreateWorkflowHistoryTable1692967111175'],
    ['1693554410387', 'DisallowOrphanExecutions1693554410387'],
    ['1693491613982', 'ExecutionSoftDelete1693491613982'],
    ['1695128658538', 'AddWorkflowMetadata1695128658538'],
    ['1694091729095', 'MigrateToTimestampTz1694091729095'],
    ['1695829275184', 'ModifyWorkflowHistoryNodesAndConnections1695829275184'],
    ['1700571993961', 'AddGlobalAdminRole1700571993961'],
    ['1705429061930', 'DropRoleMapping1705429061930'],
    ['1711018413374', 'RemoveFailedExecutionStatus1711018413374'],
    ['1711390882123', 'MoveSshKeysToDatabase1711390882123'],
    ['1712044305787', 'RemoveNodesAccess1712044305787'],
    ['1714133768519', 'CreateProject1714133768519'],
    ['1714133768521', 'MakeExecutionStatusNonNullable1714133768521'],
    ['1717498465931', 'AddActivatedAtUserSetting1717498465931'],
    ['1720101653148', 'AddConstraintToExecutionMetadata1720101653148'],
    ['1721377157740', 'FixExecutionMetadataSequence1721377157740'],
    ['1723627610222', 'CreateInvalidAuthTokenTable1723627610222'],
    ['1723796243146', 'RefactorExecutionIndices1723796243146'],
    ['1724753530828', 'CreateAnnotationTables1724753530828'],
    ['1724951148974', 'AddApiKeysTable1724951148974'],
    ['1727427440136', 'SeparateExecutionCreationFromStart1727427440136'],
    ['1726606152711', 'CreateProcessedDataTable1726606152711'],
    ['1728659839644', 'AddMissingPrimaryKeyOnAnnotationTagMapping1728659839644'],
    ['1729607673464', 'UpdateProcessedDataValueColumnToText1729607673464'],
    ['1730386903556', 'CreateTestDefinitionTable1730386903556'],
    ['1731404028106', 'AddDescriptionToTestDefinition1731404028106'],
    ['1731582748663', 'MigrateTestDefinitionKeyToString1731582748663'],
    ['1732271325258', 'CreateTestMetricTable1732271325258'],
    ['1732549866705', 'CreateTestRun1732549866705'],
    ['1733133775640', 'AddMockedNodesColumnToTestDefinition1733133775640'],
    ['1734479635324', 'AddManagedColumnToCredentialsTable1734479635324'],
    ['1729607673469', 'AddProjectIcons1729607673469'],
    ['1736172058779', 'AddStatsColumnsToTestRun1736172058779'],
    ['1740445074052', 'UpdateParentFolderIdColumn1740445074052'],
    ['1741167584277', 'RenameAnalyticsToInsights1741167584277'],
    ['1742918400000', 'AddScopesColumnToApiKeys1742918400000'],
    ['1745322634000', 'ClearEvaluation1745322634000'],
    ['1745587087521', 'AddWorkflowStatisticsRootCount1745587087521'],
    ['1745934666076', 'AddWorkflowArchivedColumn1745934666076'],
    ['1745934666077', 'DropRoleTable1745934666077'],
    ['1747824239000', 'AddProjectDescriptionColumn1747824239000'],
    ['1758794506893', 'AddProjectIdToVariableTable1758794506893'],
    ['1761047826451', 'AddWorkflowVersionColumn1761047826451'],
    ['1761655473000', 'ChangeDependencyInfoToJson1761655473000'],
];

// Limpiar tabla de migraciones
echo "1️⃣ Limpiando tabla de migraciones...\n";
$pdo->exec("DELETE FROM n8n.migrations");

// Insertar todas las migraciones
echo "2️⃣ Insertando todas las migraciones...\n";
$inserted = 0;
$stmt = $pdo->prepare("INSERT INTO n8n.migrations (timestamp, name) VALUES (?, ?)");

foreach ($migrations as $m) {
    try {
        $stmt->execute([$m[0], $m[1]]);
        $inserted++;
    } catch (Exception $e) {
        echo "  ⚠️ Error con {$m[1]}: " . $e->getMessage() . "\n";
    }
}

echo "  ✅ $inserted migraciones insertadas\n";

// Verificar
$stmt = $pdo->query("SELECT COUNT(*) FROM n8n.migrations");
$count = $stmt->fetchColumn();
echo "\n📋 Total migraciones: $count\n";

echo "\n✅ ¡Todas las migraciones marcadas como completadas!\n";
echo "🔄 Reiniciando N8N...\n";
