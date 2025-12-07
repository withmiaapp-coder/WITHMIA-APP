const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Este script requiere que node_modules/sharp esté instalado
// Instala con: npm install sharp

const sharp = require('sharp');

const publicDir = './public';
const pngFiles = [
    'favicon.png',
    'laurel-logo.png',
    'Logo-Atlantis.png',
    'logo-mia-original.png',
    'logo-withmia.png',
    'icons/api-final.png',
    'icons/facebook-new.png',
    'icons/gmail-new.png',
    'icons/instagram-new.png',
    'icons/web-new.png',
    'icons/whatsapp.png',
    'images/mia-logo.png'
];

async function convertToWebP() {
    console.log('🔄 Iniciando conversión PNG → WebP...\n');
    
    for (const file of pngFiles) {
        const inputPath = path.join(publicDir, file);
        const outputPath = inputPath.replace('.png', '.webp');
        
        if (!fs.existsSync(inputPath)) {
            console.log(`⚠️  No encontrado: ${file}`);
            continue;
        }
        
        try {
            await sharp(inputPath)
                .webp({ quality: 90 })
                .toFile(outputPath);
            
            const originalSize = fs.statSync(inputPath).size;
            const newSize = fs.statSync(outputPath).size;
            const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
            
            console.log(`✅ ${file} → ${path.basename(outputPath)} (${savings}% más pequeño)`);
        } catch (error) {
            console.error(`❌ Error convirtiendo ${file}:`, error.message);
        }
    }
    
    console.log('\n✨ Conversión completada!');
    console.log('\n📝 Ahora debes:');
    console.log('1. Actualizar referencias en HTML/CSS/JS para usar .webp');
    console.log('2. Eliminar archivos .png si ya no los necesitas');
}

convertToWebP().catch(console.error);
