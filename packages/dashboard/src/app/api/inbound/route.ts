import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export async function GET() {
  const processedDir = path.join(process.cwd(), 'public', 'data', 'processed');
  
  if (!fs.existsSync(processedDir)) {
    return NextResponse.json({ files: [] });
  }

  try {
    const files = fs.readdirSync(processedDir).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx'));
    // En un escenario real, podríamos leer el contenido o devolver solo los nombres.
    // Devolveremos las URLs relativas para que el frontend pueda hacer fetch.
    const fileUrls = files.map(f => `/data/processed/${f}`);
    return NextResponse.json({ files: fileUrls });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
