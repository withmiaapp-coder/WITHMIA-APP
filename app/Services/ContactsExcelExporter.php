<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ContactsExcelExporter
{
    private $evolutionApiUrl;
    private $evolutionApiKey;

    public function __construct()
    {
        $this->evolutionApiUrl = config('evolution.api_url');
        $this->evolutionApiKey = config('evolution.api_key');
    }

    /**
     * Obtener contactos de Evolution API
     */
    public function getContactsFromEvolution($instanceId)
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->evolutionApiKey,
                'Content-Type' => 'application/json'
            ])->get("{$this->evolutionApiUrl}/chat/findContacts/{$instanceId}");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (\Exception $e) {
            Log::error('Error obteniendo contactos de Evolution API: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Exportar contactos a Excel
     */
    public function exportContactsToExcel($contacts, $userId, $companyName = null)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Configurar información del documento
        $spreadsheet->getProperties()
            ->setCreator('MIA App')
            ->setLastModifiedBy('MIA App')
            ->setTitle('Contactos WhatsApp')
            ->setSubject('Exportación de contactos')
            ->setDescription('Lista de contactos de WhatsApp exportada desde MIA App');

        // HEADER PRINCIPAL
        $sheet->setCellValue('A1', 'CONTACTOS WHATSAPP - ' . strtoupper($companyName ?? 'MIA APP'));
        $sheet->mergeCells('A1:G1');
        
        // Estilo del header principal
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

        // Información de la exportación
        $sheet->setCellValue('A2', 'Fecha de exportación: ' . Carbon::now()->format('d/m/Y H:i:s'));
        $sheet->setCellValue('A3', 'Total de contactos: ' . count($contacts));
        $sheet->mergeCells('A2:G2');
        $sheet->mergeCells('A3:G3');

        // HEADERS DE COLUMNAS
        $headers = [
            'A5' => '#',
            'B5' => 'Nombre',
            'C5' => 'Número',
            'D5' => 'Tipo',
            'E5' => 'Estado',
            'F5' => 'Última vez visto',
            'G5' => 'Notas'
        ];

        foreach ($headers as $cell => $header) {
            $sheet->setCellValue($cell, $header);
        }

        // Estilo de headers
        $sheet->getStyle('A5:G5')->applyFromArray([
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

        // DATOS DE CONTACTOS
        $row = 6;
        $individualCount = 0;
        $groupCount = 0;

        foreach ($contacts as $index => $contact) {
            $isGroup = $this->isGroupContact($contact['remoteJid'] ?? $contact['id'] ?? '');
            $contactType = $isGroup ? 'Grupo' : 'Individual';
            
            if ($isGroup) {
                $groupCount++;
            } else {
                $individualCount++;
            }

            // Limpiar y formatear datos
            $name = $contact['pushName'] ?? $contact['name'] ?? 'Sin nombre';
            $number = $contact['remoteJid'] ?? $contact['id'] ?? '';
            $cleanNumber = $this->formatPhoneNumber($number);

            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $name);
            $sheet->setCellValue('C' . $row, $cleanNumber);
            $sheet->setCellValue('D' . $row, $contactType);
            $sheet->setCellValue('E' . $row, 'Activo');
            $sheet->setCellValue('F' . $row, Carbon::now()->format('d/m/Y'));
            $sheet->setCellValue('G' . $row, ''); // Campo para notas del usuario

            // Estilo alternado de filas
            if ($row % 2 == 0) {
                $sheet->getStyle('A' . $row . ':G' . $row)->applyFromArray([
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F9FAFB']
                    ]
                ]);
            }

            // Color diferente para grupos
            if ($isGroup) {
                $sheet->getStyle('D' . $row)->applyFromArray([
                    'font' => ['color' => ['rgb' => '059669']],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'ECFDF5']
                    ]
                ]);
            }

            $row++;
        }

        // RESUMEN AL FINAL
        $summaryRow = $row + 2;
        $sheet->setCellValue('A' . $summaryRow, 'RESUMEN');
        $sheet->mergeCells('A' . $summaryRow . ':G' . $summaryRow);
        
        $sheet->setCellValue('A' . ($summaryRow + 1), 'Contactos individuales:');
        $sheet->setCellValue('B' . ($summaryRow + 1), $individualCount);
        
        $sheet->setCellValue('A' . ($summaryRow + 2), 'Grupos:');
        $sheet->setCellValue('B' . ($summaryRow + 2), $groupCount);
        
        $sheet->setCellValue('A' . ($summaryRow + 3), 'Total:');
        $sheet->setCellValue('B' . ($summaryRow + 3), count($contacts));

        // Estilo del resumen
        $sheet->getStyle('A' . $summaryRow . ':G' . $summaryRow)->applyFromArray([
            'font' => ['bold' => true, 'size' => 12],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E5E7EB']
            ]
        ]);

        // AJUSTAR ANCHOS DE COLUMNAS
        $sheet->getColumnDimension('A')->setWidth(8);   // #
        $sheet->getColumnDimension('B')->setWidth(25);  // Nombre
        $sheet->getColumnDimension('C')->setWidth(20);  // Número
        $sheet->getColumnDimension('D')->setWidth(12);  // Tipo
        $sheet->getColumnDimension('E')->setWidth(12);  // Estado
        $sheet->getColumnDimension('F')->setWidth(15);  // Última vez
        $sheet->getColumnDimension('G')->setWidth(30);  // Notas

        // Borders para toda la tabla
        $sheet->getStyle('A5:G' . ($row - 1))->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'D1D5DB']
                ]
            ]
        ]);

        // Guardar archivo
        $fileName = 'contactos_whatsapp_' . $userId . '_' . date('Y-m-d_H-i-s') . '.xlsx';
        $filePath = 'exports/contacts/' . $fileName;

        // Crear directorio si no existe
        Storage::makeDirectory('exports/contacts');

        $writer = new Xlsx($spreadsheet);
        $fullPath = storage_path('app/' . $filePath);
        $writer->save($fullPath);

        return [
            'success' => true,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'full_path' => $fullPath,
            'download_url' => route('contacts.download', ['file' => $fileName]),
            'stats' => [
                'total' => count($contacts),
                'individuals' => $individualCount,
                'groups' => $groupCount,
                'exported_at' => Carbon::now()->toISOString()
            ]
        ];
    }

    /**
     * Verificar si es un contacto de grupo
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
        // Remover sufijos de WhatsApp
        $number = str_replace(['@s.whatsapp.net', '@g.us'], '', $remoteJid);
        
        // Si contiene guión (grupo), tomar solo la primera parte
        if (str_contains($number, '-')) {
            $parts = explode('-', $number);
            $number = $parts[0];
        }

        // Formatear número chileno si es el caso
        if (strlen($number) == 11 && str_starts_with($number, '569')) {
            return '+56 9 ' . substr($number, 3, 4) . ' ' . substr($number, 7, 4);
        }

        return '+' . $number;
    }

    /**
     * Obtener estadísticas de un archivo Excel
     */
    public function getExcelStats($filePath)
    {
        try {
            if (!Storage::exists($filePath)) {
                return null;
            }

            $fullPath = storage_path('app/' . $filePath);
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($fullPath);
            $sheet = $spreadsheet->getActiveSheet();

            // Contar filas con datos (excluyendo headers)
            $highestRow = $sheet->getHighestRow();
            $totalContacts = max(0, $highestRow - 5); // Restar headers y info

            return [
                'total_contacts' => $totalContacts,
                'file_size' => Storage::size($filePath),
                'created_at' => Storage::lastModified($filePath),
                'file_name' => basename($filePath)
            ];
        } catch (\Exception $e) {
            Log::error('Error leyendo estadísticas de Excel: ' . $e->getMessage());
            return null;
        }
    }
}