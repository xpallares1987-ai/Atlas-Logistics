import { db } from "../index.js";
import { sql } from "drizzle-orm";

export async function seedControlTower(): Promise<void> {
  console.log("🌱 Initializing and seeding Autonomous Logistics Control Tower...");

  await db.run(sql`DROP TABLE IF EXISTS incident_reroute_options;`);
  await db.run(sql`DROP TABLE IF EXISTS control_tower_incidents;`);
  await db.run(sql`DROP TABLE IF EXISTS customs_ics2_declarations;`);
  await db.run(sql`DROP TABLE IF EXISTS freight_audit_disputes;`);

  // 1. Create SQLite tables if not exists
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS control_tower_incidents (
      id TEXT PRIMARY KEY,
      incident_number TEXT NOT NULL UNIQUE,
      shipment_id TEXT,
      asset_id TEXT,
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location_name TEXT,
      location_lat REAL,
      location_lng REAL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      auto_resolved INTEGER NOT NULL DEFAULT 0,
      impact_amount_eur REAL NOT NULL DEFAULT 0,
      delay_hours REAL NOT NULL DEFAULT 0,
      sla_deadline TEXT,
      assigned_to TEXT,
      resolution_action TEXT,
      resolved_at TEXT,
      resolved_by TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS incident_reroute_options (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES control_tower_incidents(id) ON DELETE CASCADE,
      option_name TEXT NOT NULL,
      transport_mode TEXT NOT NULL,
      corridor_description TEXT NOT NULL,
      eta_delta_hours REAL NOT NULL,
      cost_delta_eur REAL NOT NULL,
      co2_delta_kg REAL NOT NULL,
      feasibility_score INTEGER NOT NULL DEFAULT 85,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      execution_status TEXT NOT NULL DEFAULT 'PROPOSED',
      legs_json TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS customs_ics2_declarations (
      id TEXT PRIMARY KEY,
      mrn TEXT NOT NULL UNIQUE,
      shipment_id TEXT,
      declaration_type TEXT NOT NULL DEFAULT 'ENS',
      filing_status TEXT NOT NULL DEFAULT 'SUBMITTED',
      risk_circuit TEXT NOT NULL DEFAULT 'GREEN',
      declarant_eori TEXT NOT NULL,
      customs_office_code TEXT NOT NULL,
      security_assessment_score INTEGER NOT NULL DEFAULT 98,
      submitted_at TEXT NOT NULL,
      cleared_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS freight_audit_disputes (
      id TEXT PRIMARY KEY,
      dispute_code TEXT NOT NULL UNIQUE,
      invoice_line_id TEXT,
      carrier_invoice_id TEXT,
      shipment_id TEXT,
      claimed_amount REAL NOT NULL,
      expected_amount REAL NOT NULL,
      disputed_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      carrier_response_date TEXT,
      resolution_note TEXT,
      debit_note_number TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  // Clear existing to avoid duplicate conflicts during re-seed
  await db.run(sql`DELETE FROM incident_reroute_options;`);
  await db.run(sql`DELETE FROM control_tower_incidents;`);
  await db.run(sql`DELETE FROM customs_ics2_declarations;`);
  await db.run(sql`DELETE FROM freight_audit_disputes;`);

  // 2. Pre-seed Incidents
  const now = new Date();
  const sla1 = new Date(now.getTime() + 6 * 3600 * 1000).toISOString();
  const sla2 = new Date(now.getTime() + 3 * 3600 * 1000).toISOString();
  const sla3 = new Date(now.getTime() + 12 * 3600 * 1000).toISOString();

  await db.run(sql`
    INSERT INTO control_tower_incidents (
      id, incident_number, shipment_id, incident_type, severity, title, description,
      location_name, location_lat, location_lng, status, auto_resolved,
      impact_amount_eur, delay_hours, sla_deadline, assigned_to, created_at, updated_at
    ) VALUES 
    (
      'inc_001',
      'INC-2026-0814',
      'SH-1001',
      'PORT_CONGESTION',
      'CRITICAL',
      'Huelga de Estibadores y Bloqueo de Muelles en Puerto de Valencia',
      'Huelga de 72h convocada por sindicatos de estibadores en la terminal CSP Iberian Valencia. Buque MSC MAYA fondeado fuera de la bocana.',
      'Valencia Port Terminal (VLC)',
      39.4446,
      -0.3167,
      'OPEN',
      0,
      1850.00,
      48.0,
      ${sla1},
      'usr_ops_01',
      ${now.toISOString()},
      ${now.toISOString()}
    ),
    (
      'inc_002',
      'INC-2026-0815',
      'SH-1002',
      'COLD_CHAIN_BREACH',
      'HIGH',
      'Alarma de Temperatura en Contenedor Reefer Farma GDP (+9.2°C)',
      'La sonda de telemetría IoT del contenedor MSKU-918274 ha registrado una temperatura de 9.2°C durante más de 45 minutos (máximo permitido GDP: 8.0°C).',
      'Autovía A-4 Km 214 (Valdepeñas)',
      38.7612,
      -3.3854,
      'ANALYZING',
      0,
      3200.00,
      4.5,
      ${sla2},
      'usr_ops_01',
      ${now.toISOString()},
      ${now.toISOString()}
    ),
    (
      'inc_003',
      'INC-2026-0816',
      'SH-1003',
      'CUSTOMS_HOLD',
      'MEDIUM',
      'Retención Aduanera Circuito Naranja - Falta Certificado EUR.1',
      'La Agencia Tributaria (Aduanas Barajas) ha asignado circuito naranja a la DUA aérea por discrepancia de origen preferencial en componentes aeronáuticos.',
      'Aduana Carga Aeropuerto Madrid-Barajas (MAD)',
      40.4839,
      -3.5679,
      'PENDING_APPROVAL',
      0,
      450.00,
      8.0,
      ${sla3},
      'usr_customs_01',
      ${now.toISOString()},
      ${now.toISOString()}
    ),
    (
      'inc_004',
      'INC-2026-0817',
      'SH-1004',
      'ROAD_ACCIDENT',
      'LOW',
      'Avería Menor Neumático de Tractora - Auto-Resuelto por Protocolo',
      'Pinchazo en tractora en AP-7 Castellón. El servicio de asistencia móvil fue despachado automáticamente y la ruta fue recalculada.',
      'AP-7 Km 420 (Castellón)',
      40.0123,
      -0.0345,
      'AUTO_RESOLVED',
      1,
      280.00,
      2.0,
      ${sla3},
      'usr_ops_01',
      ${now.toISOString()},
      ${now.toISOString()}
    ),
    (
      'inc_005',
      'INC-2026-0818',
      'SH-1005',
      'CANAL_BLOCKAGE',
      'CRITICAL',
      'Restricción Severa de Tránsito y Congestión en Canal de Suez',
      'Retraso acumulado de 8 días en convoy marítimo hacia el Mediterráneo. Contenedores con fecha de entrega comprometida para campaña retail.',
      'Port Said / Suez Canal Approach',
      31.2653,
      32.3019,
      'OPEN',
      0,
      6400.00,
      192.0,
      ${sla1},
      'usr_ops_01',
      ${now.toISOString()},
      ${now.toISOString()}
    );
  `);

  // 3. Pre-seed Reroute Options for INC-001 (Valencia Port Congestion)
  await db.run(sql`
    INSERT INTO incident_reroute_options (
      id, incident_id, option_name, transport_mode, corridor_description,
      eta_delta_hours, cost_delta_eur, co2_delta_kg, feasibility_score, is_recommended, execution_status, legs_json
    ) VALUES 
    (
      'ro_001_1',
      'inc_001',
      'Desvío Intermodal Vía Puerto de Barcelona + Lanzadera Ferroviaria Zaragoza',
      'RAIL_INTERMODAL',
      'Desvío del buque a Barcelona BEST Terminal + Lanzadera ferroviaria directa a Terminal Marítima de Zaragoza (tmZ) y última milla en camión eléctrico.',
      -18.0,
      320.00,
      -180.5,
      94,
      1,
      'PROPOSED',
      '["Buque a Puerto de Barcelona (BEST)", "Tren bloque Barcelona-Zaragoza (tmZ)", "Camión EV Zaragoza-Destino Final"]'
    ),
    (
      'ro_001_2',
      'inc_001',
      'Descarga en Fondeadero Algeciras + Conexión Camión Express Terrestre',
      'ROAD_EXPRESS',
      'Transbordo feeder express en Algeciras y tracción por carretera con doble conductor directo a destino.',
      -26.0,
      890.00,
      410.2,
      78,
      0,
      'PROPOSED',
      '["Transbordo feeder Algeciras", "Camión express doble chófer A-4 directo"]'
    ),
    (
      'ro_005_1',
      'inc_005',
      'Desvío Vía Cabo de Buena Esperanza (Circunnavegación África)',
      'OCEAN',
      'Ruta oceánica alternativa evitando la zona de riesgo en Bab-el-Mandeb. Mayor distancia y tiempo de navegación pero con garantía de seguridad total.',
      216.0,
      950.00,
      4800.0,
      88,
      1,
      'PROPOSED',
      '["Tránsito Océano Índico Sur", "Paso Cabo de Buena Esperanza", "Atlántico Norte hacia Algeciras"]'
    ),
    (
      'ro_005_2',
      'inc_005',
      'Puente Multimodal Sea-Air Vía Puerto Jebel Ali / Aeropuerto Dubai (DWC)',
      'AIR_CARGO',
      'Descarga inmediata en Jebel Ali, tránsito aduanero terrestre exprés a Dubai World Central y vuelo carguero directo a Frankfurt/Madrid.',
      -72.0,
      2850.00,
      8200.0,
      91,
      0,
      'PROPOSED',
      '["Descarga Jebel Ali Port", "Tránsito DWC Airport", "Vuelo B777F Dubai-Madrid"]'
    );
  `);

  // 4. Pre-seed Customs ICS2 Declarations
  await db.run(sql`
    INSERT INTO customs_ics2_declarations (
      id, mrn, shipment_id, declaration_type, filing_status, risk_circuit,
      declarant_eori, customs_office_code, security_assessment_score, submitted_at, notes
    ) VALUES 
    (
      'ics2_001',
      '26ES000001928472B3',
      'SH-1001',
      'ENS',
      'CLEARED',
      'GREEN',
      'ESB99482716',
      'ES004611',
      98,
      ${now.toISOString()},
      'Levante automático otorgado por la AEAT sin incidencias de seguridad.'
    ),
    (
      'ics2_002',
      '26ES000002819401C9',
      'SH-1003',
      'ENS',
      'HELD_FOR_INSPECTION',
      'ORANGE',
      'ESB12345678',
      'ES002801',
      74,
      ${now.toISOString()},
      'Requiere aporte telemático de certificado EUR.1 y factura comercial traducida.'
    ),
    (
      'ics2_003',
      '26ES000003719284D1',
      'SH-1005',
      'ENS',
      'HELD_FOR_INSPECTION',
      'RED',
      'ESB87654321',
      'ES000811',
      42,
      ${now.toISOString()},
      'Inspección física y escáner no intrusivo asignado en Terminal Muelle Prat.'
    );
  `);

  // 5. Pre-seed Freight Audit 3-Way Match Disputes
  await db.run(sql`
    INSERT INTO freight_audit_disputes (
      id, dispute_code, shipment_id, claimed_amount, expected_amount, disputed_amount,
      reason, status, resolution_note, debit_note_number, created_at
    ) VALUES 
    (
      'dsp_001',
      'DSP-2026-0042',
      'SH-1001',
      5450.00,
      4000.00,
      1450.00,
      'UNJUSTIFIED_DEMURRAGE',
      'OPEN',
      'La naviera facturó 4 días de demora en terminal. Sin embargo, el contrato marco estipula 14 días libres y el contenedor fue retirado en el día 10 según registro EDI IFTSTA.',
      'DN-2026-0019',
      ${now.toISOString()}
    ),
    (
      'dsp_002',
      'DSP-2026-0043',
      'SH-1004',
      2185.00,
      1800.00,
      385.00,
      'BAF_INDEX_MISMATCH',
      'SUBMITTED_TO_CARRIER',
      'Recargo BAF facturado al 18.5%. El índice promedio publicado para el mes era 14.2%, excediendo la tarifa contractual aprobada.',
      'DN-2026-0020',
      ${now.toISOString()}
    );
  `);

  console.log("✅ Control Tower data seeded successfully!");
}
