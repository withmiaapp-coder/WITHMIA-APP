<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DynamicContactsExcelManager
{
    private $evolutionApiUrl;
    private $evolutionApiKey;

    public function __construct()
    {
        $this->evolutionApiUrl = config('evolution.api_url');
        $this->evolutionApiKey = config('evolution.api_key');
    }

    /**
     * Obtener o crear el archivo Excel único del usuario
     */
    public function getUserExcelFile($userId, $companyName = null)
    {
        $fileName = "contactos_whatsapp_user_{$userId}.xlsx";
        $filePath = "exports/contacts/{$fileName}";
        $fullPath = storage_path("app/{$filePath}");

        // Si el archivo no existe, crearlo
        if (!Storage::exists($filePath)) {
            $this->createInitialExcel($userId, $companyName, $filePath);
        }

        return [
            'file_path' => $filePath,
            'file_name' => $fileName,
            'full_path' => $fullPath,
            'download_url' => route('contacts.download', ['file' => $fileName]),
            'exists' => Storage::exists($filePath)
        ];
    }

    /**
     * Crear Excel inicial con estructura
     */
    private function createInitialExcel($userId, $companyName, $filePath)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Configurar propiedades del documento
        $spreadsheet->getProperties()
            ->setCreator('MIA App')
            ->setTitle('Contactos WhatsApp - ' . ($companyName ?? 'Usuario'))
            ->setDescription('Lista dinámica de contactos de WhatsApp - Se actualiza automáticamente');

        // HEADER PRINCIPAL
        $sheet->setCellValue('A1', 'CONTACTOS WHATSAPP - ' . strtoupper($companyName ?? 'MIA APP'));
        $sheet->mergeCells('A1:H1');
        
        // Información dinámica
        $sheet->setCellValue('A2', 'Archivo creado: ' . Carbon::now()->format('d/m/Y H:i:s'));
        $sheet->setCellValue('A3', 'Última actualización: ' . Carbon::now()->format('d/m/Y H:i:s'));
        $sheet->setCellValue('A4', 'Total de contactos: 0');
        $sheet->mergeCells('A2:H2');
        $sheet->mergeCells('A3:H3');
        $sheet->mergeCells('A4:H4');

        // HEADERS DE COLUMNAS (fila 6)
        $headers = [
            'A6' => '#',
            'B6' => 'Nombre',
            'C6' => 'Número',
            'D6' => 'Tipo',
            'E6' => 'Estado',
            'F6' => 'Agregado',
            'G6' => 'Última actualización',
            'H6' => 'Notas'
        ];

        foreach ($headers as $cell => $header) {
            $sheet->setCellValue($cell, $header);
        }

        // Aplicar estilos
        $this->applyInitialStyles($sheet);

        // Guardar archivo
        Storage::makeDirectory('exports/contacts');
        $writer = new Xlsx($spreadsheet);
        $writer->save(storage_path("app/{$filePath}"));

        Log::debug("Excel inicial creado para usuario {$userId}: {$filePath}");
    }

    /**
     * Agregar nuevo contacto al Excel existente
     */
    public function addContactToExcel($userId, $contact, $companyName = null)
    {
        $fileInfo = $this->getUserExcelFile($userId, $companyName);
        
        try {
            // Cargar Excel existente
            $spreadsheet = IOFactory::load($fileInfo['full_path']);
            $sheet = $spreadsheet->getActiveSheet();

            // Verificar si el contacto ya existe
            if ($this->contactExists($sheet, $contact['remoteJid'] ?? $contact['id'])) {
                Log::debug("Contacto ya existe, actualizando: " . ($contact['pushName'] ?? 'Sin nombre'));
                return $this->updateExistingContact($userId, $contact, $companyName);
            }

            // Encontrar la próxima fila vacía
            $lastRow = $this->findLastDataRow($sheet);
            $newRow = $lastRow + 1;

            // Agregar nuevo contacto
            $this->addContactRow($sheet, $newRow, $contact, $lastRow - 5); // -5 para headers

            // Actualizar información del header
            $this->updateExcelMetadata($sheet, $lastRow - 5); // Total de contactos

            // Guardar archivo
            $writer = new Xlsx($spreadsheet);
            $writer->save($fileInfo['full_path']);

            Log::debug("Contacto agregado al Excel del usuario {$userId}: " . ($contact['pushName'] ?? 'Sin nombre'));

            return [
                'success' => true,
                'action' => 'added',
                'contact_name' => $contact['pushName'] ?? 'Sin nombre',
                'total_contacts' => $lastRow - 5,
                'file_info' => $fileInfo
            ];

        } catch (\Exception $e) {
            Log::error("Error agregando contacto al Excel: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Importar múltiples contactos al Excel
     */
    public function importContactsToExcel($userId, $contacts, $companyName = null)
    {
        $fileInfo = $this->getUserExcelFile($userId, $companyName);
        $addedCount = 0;
        $updatedCount = 0;

        try {
            $spreadsheet = IOFactory::load($fileInfo['full_path']);
            $sheet = $spreadsheet->getActiveSheet();

            foreach ($contacts as $contact) {
                $contactId = $contact['remoteJid'] ?? $contact['id'] ?? '';
                
                if ($this->contactExists($sheet, $contactId)) {
                    $updatedCount++;
                    continue; // Skip if exists
                }

                // Encontrar próxima fila y agregar
                $lastRow = $this->findLastDataRow($sheet);
                $newRow = $lastRow + 1;
                
                $this->addContactRow($sheet, $newRow, $contact, $lastRow - 5 + 1);
                $addedCount++;
            }

            // Actualizar metadata
            $totalContacts = $this->findLastDataRow($sheet) - 6;
            $this->updateExcelMetadata($sheet, $totalContacts);

            // Guardar archivo
            $writer = new Xlsx($spreadsheet);
            $writer->save($fileInfo['full_path']);

            Log::debug("Importación masiva completada para usuario {$userId}: {$addedCount} agregados, {$updatedCount} existían");

            return [
                'success' => true,
                'added' => $addedCount,
                'updated' => $updatedCount,
                'total' => $totalContacts,
                'file_info' => $fileInfo
            ];

        } catch (\Exception $e) {
            Log::error("Error en importación masiva: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Verificar si un contacto ya existe en el Excel
     */
    private function contactExists($sheet, $contactId)
    {
        $lastRow = $this->findLastDataRow($sheet);
        
        for ($row = 7; $row <= $lastRow; $row++) {
            $existingId = $sheet->getCell('C' . $row)->getValue();
            if ($this->normalizeContactId($existingId) === $this->normalizeContactId($contactId)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Normalizar ID de contacto para comparación
     */
    private function normalizeContactId($contactId)
    {
        // Remover sufijos de WhatsApp y espacios
        return str_replace(['@s.whatsapp.net', '@g.us', ' ', '+'], '', $contactId);
    }

    /**
     * Encontrar la última fila con datos
     */
    private function findLastDataRow($sheet)
    {
        $row = 7; // Empezar después de headers
        while ($sheet->getCell('A' . $row)->getValue() !== null) {
            $row++;
        }
        return $row - 1; // Última fila con datos
    }

    /**
     * Agregar fila de contacto
     */
    private function addContactRow($sheet, $row, $contact, $contactNumber)
    {
        $isGroup = $this->isGroupContact($contact['remoteJid'] ?? $contact['id'] ?? '');
        $contactType = $isGroup ? 'Grupo' : 'Individual';
        $name = $contact['pushName'] ?? $contact['name'] ?? 'Sin nombre';
        $number = $this->formatPhoneNumber($contact['remoteJid'] ?? $contact['id'] ?? '');

        $sheet->setCellValue('A' . $row, $contactNumber);
        $sheet->setCellValue('B' . $row, $name);
        $sheet->setCellValue('C' . $row, $number);
        $sheet->setCellValue('D' . $row, $contactType);
        $sheet->setCellValue('E' . $row, 'Activo');
        $sheet->setCellValue('F' . $row, Carbon::now()->format('d/m/Y H:i'));
        $sheet->setCellValue('G' . $row, Carbon::now()->format('d/m/Y H:i'));
        $sheet->setCellValue('H' . $row, ''); // Notas vacías

        // Aplicar estilos a la fila
        $this->styleContactRow($sheet, $row, $isGroup);
    }

    /**
     * Aplicar estilos a fila de contacto
     */
    private function styleContactRow($sheet, $row, $isGroup)
    {
        // Fila alternada
        if ($row % 2 == 0) {
            $sheet->getStyle('A' . $row . ':H' . $row)->applyFromArray([
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F9FAFB']
                ]
            ]);
        }

        // Color especial para grupos
        if ($isGroup) {
            $sheet->getStyle('D' . $row)->applyFromArray([
                'font' => ['color' => ['rgb' => '059669']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'ECFDF5']
                ]
            ]);
        }

        // Borders
        $sheet->getStyle('A' . $row . ':H' . $row)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'D1D5DB']
                ]
            ]
        ]);
    }

    /**
     * Actualizar metadata del Excel
     */
    private function updateExcelMetadata($sheet, $totalContacts)
    {
        $sheet->setCellValue('A3', 'Última actualización: ' . Carbon::now()->format('d/m/Y H:i:s'));
        $sheet->setCellValue('A4', 'Total de contactos: ' . $totalContacts);
    }

    /**
     * Aplicar estilos iniciales
     */
    private function applyInitialStyles($sheet)
    {
        // Header principal
        $sheet->getStyle('A1')->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 16,
                'color' => ['rgb' => 'FFFFFF']
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E40AF']
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER
            ]
        ]);

        // Headers de columnas
        $sheet->getStyle('A6:H6')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF']
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '374151']
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000']
                ]
            ]
        ]);

        // Anchos de columnas
        $sheet->getColumnDimension('A')->setWidth(8);   // #
        $sheet->getColumnDimension('B')->setWidth(25);  // Nombre
        $sheet->getColumnDimension('C')->setWidth(20);  // Número
        $sheet->getColumnDimension('D')->setWidth(12);  // Tipo
        $sheet->getColumnDimension('E')->setWidth(12);  // Estado
        $sheet->getColumnDimension('F')->setWidth(15);  // Agregado
        $sheet->getColumnDimension('G')->setWidth(15);  // Actualizado
        $sheet->getColumnDimension('H')->setWidth(30);  // Notas
    }

    /**
     * Verificar si es contacto de grupo
     */
    private function isGroupContact($remoteJid)
    {
        return str_contains($remoteJid, '@g.us');
    }

    /**
     * Formatear número de teléfono
     */
    private function formatPhoneNumber($remoteJid)
    {
        $number = str_replace(['@s.whatsapp.net', '@g.us'], '', $remoteJid);
        
        if (str_contains($number, '-')) {
            $parts = explode('-', $number);
            $number = $parts[0];
        }

        if (strlen($number) == 11 && str_starts_with($number, '569')) {
            return '+56 9 ' . substr($number, 3, 4) . ' ' . substr($number, 7, 4);
        }

        return '+' . $number;
    }

    /**
     * Obtener estadísticas del Excel
     */
    public function getExcelStats($userId)
    {
        $fileInfo = $this->getUserExcelFile($userId);
        
        if (!$fileInfo['exists']) {
            return null;
        }

        try {
            $spreadsheet = IOFactory::load($fileInfo['full_path']);
            $sheet = $spreadsheet->getActiveSheet();
            
            $totalContacts = $this->findLastDataRow($sheet) - 6;
            $lastUpdate = $sheet->getCell('A3')->getValue();
            
            return [
                'total_contacts' => max(0, $totalContacts),
                'file_size' => Storage::size($fileInfo['file_path']),
                'last_modified' => Storage::lastModified($fileInfo['file_path']),
                'last_update' => $lastUpdate,
                'file_info' => $fileInfo
            ];
            
        } catch (\Exception $e) {
            Log::error("Error obteniendo estadísticas del Excel: " . $e->getMessage());
            return null;
        }
    }
}