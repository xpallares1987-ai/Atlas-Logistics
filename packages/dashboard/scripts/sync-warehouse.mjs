import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INBOUND_FOLDER = path.join(__dirname, '../public/data/inbound');
const PROCESSED_FOLDER = path.join(__dirname, '../public/data/processed');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

async function processFile(fileName) {
  log(`Procesando archivo: ${fileName}`);
  const inputPath = path.join(INBOUND_FOLDER, fileName);
  const outputPath = path.join(PROCESSED_FOLDER, fileName);

  try {
    // Aquí iría la lógica para enviar el archivo a la API del Dashboard,
    // o para parsearlo y guardarlo en una base de datos local.
    // Por ahora, simplemente lo movemos a la carpeta de procesados para simular
    // un flujo de auto-import exitoso.
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    fs.renameSync(inputPath, outputPath);
    log(`✅ Archivo movido a procesados: ${fileName}`);
  } catch (err) {
    log(`❌ Error procesando ${fileName}: ${err.message}`);
  }
}

async function watchFolder() {
  log(`=== Iniciando Auto-Import Watcher ===`);
  log(`Directorio de entrada: ${INBOUND_FOLDER}`);
  log(`Directorio procesados: ${PROCESSED_FOLDER}`);
  
  ensureFolder(INBOUND_FOLDER);
  ensureFolder(PROCESSED_FOLDER);

  // Process existing files first
  const existing = fs.readdirSync(INBOUND_FOLDER);
  if (existing.length > 0) {
    log(`Encontrados ${existing.length} archivos pendientes.`);
    for (const file of existing) {
      if (fs.statSync(path.join(INBOUND_FOLDER, file)).isFile()) {
        await processFile(file);
      }
    }
  }

  // Watch for new files
  if (process.env.CI === 'true') {
    log(`[CI] Modo CI detectado. Finalizando ejecución sin iniciar watcher.`);
    process.exit(0);
  }

  log(`Observando nuevos archivos... (Ctrl+C para salir)`);
  fs.watch(INBOUND_FOLDER, async (eventType, fileName) => {
    if (eventType === 'rename' && fileName) {
      const filePath = path.join(INBOUND_FOLDER, fileName);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        log(`Nuevo archivo detectado: ${fileName}`);
        await processFile(fileName);
      }
    }
  });
}

// Ensure the process catches interruptions gracefully
process.on('SIGINT', () => {
  log('Apagando watcher...');
  process.exit(0);
});

watchFolder().catch(err => {
  log(`Error fatal: ${err.message}`);
  process.exit(1);
});
