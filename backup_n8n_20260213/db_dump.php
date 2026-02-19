<?php
/**
 * Database backup script - exports all tables to SQL INSERT statements
 */

$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$dbname = 'railway';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname";

try {
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "Connected to database.\n";
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage() . "\n");
}

$outputFile = __DIR__ . '/DATABASE_railway.sql';
$fh = fopen($outputFile, 'w');

// Get all tables
$tables = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")->fetchAll(PDO::FETCH_COLUMN);
echo "Found " . count($tables) . " tables.\n";

fwrite($fh, "-- WITHMIA Database Backup - " . date('Y-m-d H:i:s') . "\n");
fwrite($fh, "-- Tables: " . count($tables) . "\n\n");

foreach ($tables as $table) {
    echo "Backing up: $table... ";
    
    // Get CREATE TABLE (column definitions)
    $cols = $pdo->query("SELECT column_name, data_type, character_maximum_length, column_default, is_nullable 
                         FROM information_schema.columns 
                         WHERE table_schema = 'public' AND table_name = '$table' 
                         ORDER BY ordinal_position")->fetchAll();
    
    fwrite($fh, "\n-- Table: $table (" . count($cols) . " columns)\n");
    fwrite($fh, "-- Columns: " . implode(', ', array_column($cols, 'column_name')) . "\n");
    
    // Get row count
    $count = $pdo->query("SELECT COUNT(*) FROM \"$table\"")->fetchColumn();
    fwrite($fh, "-- Rows: $count\n");
    
    if ($count == 0) {
        echo "0 rows (skipped)\n";
        continue;
    }
    
    // Export data
    $stmt = $pdo->query("SELECT * FROM \"$table\"");
    $rowNum = 0;
    while ($row = $stmt->fetch()) {
        $columns = array_keys($row);
        $values = array_map(function($v) use ($pdo) {
            if ($v === null) return 'NULL';
            if (is_resource($v)) {
                $data = stream_get_contents($v);
                return "E'\\\\x" . bin2hex($data) . "'";
            }
            return $pdo->quote($v);
        }, array_values($row));
        
        $colList = '"' . implode('", "', $columns) . '"';
        $valList = implode(', ', $values);
        fwrite($fh, "INSERT INTO \"$table\" ($colList) VALUES ($valList);\n");
        $rowNum++;
    }
    
    echo "$rowNum rows\n";
}

fclose($fh);
$size = filesize($outputFile);
echo "\nBackup saved to: $outputFile\n";
echo "File size: " . number_format($size) . " bytes\n";
