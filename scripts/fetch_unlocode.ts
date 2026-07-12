import fs from 'fs';
import path from 'path';
import fetch from 'cross-fetch';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub dataset which maintains an up-to-date compiled CSV of UN/LOCODEs
const UNLOCODE_CSV_URL = 'https://raw.githubusercontent.com/datasets/un-locode/master/data/code-list.csv';
const OUTPUT_FILE = path.resolve(__dirname, '../data/unlocodes_full.json');

// Convert UN/LOCODE string coordinates (e.g., "3114N 12128E") to decimal degrees
function parseCoordinates(coordStr: string): { latitude: number, longitude: number } | null {
  if (!coordStr || coordStr.trim() === '') return null;
  // Format is usually DDMMN DDDMME or DDMM[N/S] DDDMM[E/W]
  // e.g. "3114N 12128E"
  const match = coordStr.trim().match(/^(\d{2,4})([NS])\s+(\d{3,5})([EW])$/);
  if (!match) return null;

  try {
    let latStr = match[1];
    let latDir = match[2];
    let lonStr = match[3];
    let lonDir = match[4];

    // Latitude: first 2 digits are degrees, rest are minutes
    let latDeg = parseInt(latStr.substring(0, 2), 10);
    let latMin = parseInt(latStr.substring(2) || '0', 10);
    let lat = latDeg + (latMin / 60);
    if (latDir === 'S') lat = -lat;

    // Longitude: first 3 digits are degrees, rest are minutes
    let lonDeg = parseInt(lonStr.substring(0, 3), 10);
    let lonMin = parseInt(lonStr.substring(3) || '0', 10);
    let lon = lonDeg + (lonMin / 60);
    if (lonDir === 'W') lon = -lon;

    return { latitude: parseFloat(lat.toFixed(4)), longitude: parseFloat(lon.toFixed(4)) };
  } catch (e) {
    return null;
  }
}

function determineType(functionStr: string): string {
  if (functionStr.includes('1')) return 'SEAPORT';
  if (functionStr.includes('4')) return 'AIRPORT';
  if (functionStr.includes('6')) return 'INLAND_PORT'; // Dry port / ICD
  if (functionStr.includes('2') || functionStr.includes('3')) return 'INLAND_PORT';
  return 'UNKNOWN';
}

async function fetchAndProcessLocodes() {
  console.log(`📥 Descargando listado oficial UN/LOCODE desde: ${UNLOCODE_CSV_URL}`);
  const response = await fetch(UNLOCODE_CSV_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch UN/LOCODE: ${response.statusText}`);
  }

  const results: any[] = [];
  let totalProcessed = 0;

  console.log('🔄 Procesando CSV...');
  
  return new Promise((resolve, reject) => {
    // Pipe the response body to the CSV parser
    // @ts-ignore
    response.body.pipe(csv())
      .on('data', (data: any) => {
        totalProcessed++;
        const functions = data['Function'] || '';
        
        // We only care about Ports (1), Airports (4), or Multimodal/Dry Ports (6)
        if (functions.includes('1') || functions.includes('4') || functions.includes('6')) {
          const countryCode = data['Country'];
          const locationCode = data['Location'];
          if (!countryCode || !locationCode) return;

          const locode = `${countryCode}${locationCode}`;
          const coords = parseCoordinates(data['Coordinates']);

          // Determine type
          const type = determineType(functions);

          results.push({
            locode,
            name: data['NameWoDiacritics'] || data['Name'],
            countryCode,
            countryName: countryCode, // The CSV usually only gives the code, mapping country name is ideal but code is fine for now
            type,
            region: 'Global', // Simplified for massive bulk
            latitude: coords ? coords.latitude : null,
            longitude: coords ? coords.longitude : null
          });
        }
      })
      .on('end', () => {
        console.log(`✅ Procesamiento completado. Total evaluados: ${totalProcessed}`);
        console.log(`⚓ Ubicaciones filtradas (Puertos/Aeropuertos): ${results.length}`);
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        console.log(`💾 Guardado en: ${OUTPUT_FILE}`);
        resolve(results.length);
      })
      .on('error', (err: any) => {
        reject(err);
      });
  });
}

fetchAndProcessLocodes().catch(console.error);
