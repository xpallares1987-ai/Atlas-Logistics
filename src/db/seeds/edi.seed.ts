import { db } from "../index.js";
import { ediPartners, ediInterchanges, ediMessages } from "../schema/index.js";
import { sql } from "drizzle-orm";

export async function seedEdi(): Promise<void> {
  console.log("🌱 Initializing and seeding B2B EDI Engine & Trading Partners...");

  // 1. Create tables if not exist
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS edi_partners (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      standard TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_qualifier TEXT NOT NULL DEFAULT 'ZZ',
      receiver_id TEXT NOT NULL,
      receiver_qualifier TEXT NOT NULL DEFAULT 'ZZ',
      transport_protocol TEXT NOT NULL DEFAULT 'REST_WEBHOOK',
      endpoint_url TEXT,
      test_mode INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      tags TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS edi_interchanges (
      id TEXT PRIMARY KEY,
      partner_id TEXT,
      control_number TEXT NOT NULL,
      direction TEXT NOT NULL,
      standard TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT NOT NULL,
      raw_payload TEXT NOT NULL,
      ack_payload TEXT,
      ack_status TEXT,
      error_message TEXT,
      processed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      tags TEXT
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS edi_messages (
      id TEXT PRIMARY KEY,
      interchange_id TEXT NOT NULL,
      message_type TEXT NOT NULL,
      control_number TEXT NOT NULL,
      shipment_id TEXT,
      booking_reference TEXT,
      status TEXT NOT NULL,
      parsed_content TEXT,
      extracted_milestone TEXT,
      exception_triggered INTEGER NOT NULL DEFAULT 0,
      exception_details TEXT,
      processed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      tags TEXT
    );
  `);

  // 2. Pre-seed Leading Carrier Partners
  const partnersData = [
    {
      id: "partner_maersk",
      name: "Maersk Line B2B Gateway",
      standard: "EDIFACT",
      senderId: "MAERSKLINE",
      senderQualifier: "ZZ",
      receiverId: "ATLASLOG",
      receiverQualifier: "ZZ",
      transportProtocol: "AS2",
      endpointUrl: "https://as2.maersk.com/edi/inbound",
      testMode: false,
    },
    {
      id: "partner_msc",
      name: "MSC Geneva EDI Hub",
      standard: "EDIFACT",
      senderId: "MSCGVA",
      senderQualifier: "01",
      receiverId: "ATLASLOG",
      receiverQualifier: "ZZ",
      transportProtocol: "AS2",
      endpointUrl: "https://edi.msc.com/receive",
      testMode: false,
    },
    {
      id: "partner_cma",
      name: "CMA CGM EDIFACT Connect",
      standard: "EDIFACT",
      senderId: "CMACGM",
      senderQualifier: "14",
      receiverId: "ATLASLOG",
      receiverQualifier: "ZZ",
      transportProtocol: "REST_WEBHOOK",
      endpointUrl: "https://api.cma-cgm.com/b2b/edi",
      testMode: false,
    },
    {
      id: "partner_knight",
      name: "Knight-Swift Transportation",
      standard: "ANSI_X12",
      senderId: "KNIGHTSWIFT",
      senderQualifier: "02",
      receiverId: "ATLASLOG",
      receiverQualifier: "ZZ",
      transportProtocol: "SFTP",
      endpointUrl: "sftp://edi.knight-swift.com:22/inbound",
      testMode: false,
    },
    {
      id: "partner_jbhunt",
      name: "J.B. Hunt Intermodal & Trucking",
      standard: "ANSI_X12",
      senderId: "JBHUNT",
      senderQualifier: "ZZ",
      receiverId: "ATLASLOG",
      receiverQualifier: "ZZ",
      transportProtocol: "SFTP",
      endpointUrl: "sftp://edi.jbhunt.com/drops",
      testMode: false,
    },
  ];

  for (const partner of partnersData) {
    await db
      .insert(ediPartners)
      .values({
        id: partner.id,
        name: partner.name,
        standard: partner.standard,
        senderId: partner.senderId,
        senderQualifier: partner.senderQualifier,
        receiverId: partner.receiverId,
        receiverQualifier: partner.receiverQualifier,
        transportProtocol: partner.transportProtocol,
        endpointUrl: partner.endpointUrl,
        testMode: partner.testMode,
      })
      .onConflictDoNothing();
  }

  // 3. Seed Realistic Historical Interchanges
  const sampleEdifactPayload =
    "UNB+UNOA:2+MAERSKLINE:ZZ+ATLASLOG:ZZ+261004:1430+100021'BGM+7+BK-2026-8819+9'RFF+BM:MSK992011'DTM+137:202610041200:203'LOC+7+ESVLC:139:6+VALENCIA PORT'LOC+11+USNYC:139:6+NEW YORK HARBOR'STS+1+VD'UNT+7+100021'UNZ+1+100021'";

  const sampleContrlAck =
    "UNB+UNOA:2+ATLASLOG:ZZ+MAERSKLINE:ZZ+261004:1431+ACK9011'UCI+100021+MAERSKLINE:ZZ+ATLASLOG:ZZ+7'UCM+100021+IFTSTA:D:96B:UN+7'UNT+4+ACK9011'UNZ+1+ACK9011'";

  const sampleX12Payload =
    "ISA*00*          *00*          *02*KNIGHTSWIFT    *ZZ*ATLASLOG       *261004*1540*U*00401*000008821*0*P*>~GS*QM*KNIGHTSWIFT*ATLASLOG*20261004*1540*8821*X*004010~ST*214*0001~B10*KS-991201*BK-2026-8819*KNIGHTSWIFT~LX*1~AT7*X6*NS***20261004*1530*LT~MS1*MADRID*ES*ES~SE*6*0001~GE*1*8821~IEA*1*000008821~";

  const sample997Ack =
    "ISA*00*          *00*          *ZZ*ATLASLOG       *02*KNIGHTSWIFT    *261004*1541*U*00401*000009971*0*P*>~GS*FA*ATLASLOG*KNIGHTSWIFT*20261004*1541*9971*X*004010~ST*997*0001~AK1*QM*8821~AK2*214*0001~AK5*A~AK9*A*1*1*1~SE*6*0001~GE*1*9971~IEA*1*000009971~";

  await db
    .insert(ediInterchanges)
    .values({
      id: "ic_sample_edifact_01",
      partnerId: "partner_maersk",
      controlNumber: "100021",
      direction: "INBOUND",
      standard: "EDIFACT",
      senderId: "MAERSKLINE",
      receiverId: "ATLASLOG",
      status: "APPLIED",
      rawPayload: sampleEdifactPayload,
      ackPayload: sampleContrlAck,
      ackStatus: "ACCEPTED",
      processedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(ediMessages)
    .values({
      id: "msg_sample_edifact_01",
      interchangeId: "ic_sample_edifact_01",
      messageType: "IFTSTA",
      controlNumber: "100021",
      bookingReference: "BK-2026-8819",
      status: "APPLIED",
      parsedContent: {
        documentType: "IFTSTA",
        carrier: "MAERSKLINE",
        bookingNumber: "BK-2026-8819",
        billOfLading: "MSK992011",
        statusCode: "VD",
        milestone: "VESSEL_DEPARTED",
        location: "VALENCIA PORT (ESVLC)",
        timestamp: "2026-10-04T12:00:00Z",
      },
      extractedMilestone: "VESSEL_DEPARTED",
      exceptionTriggered: false,
      processedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(ediInterchanges)
    .values({
      id: "ic_sample_x12_01",
      partnerId: "partner_knight",
      controlNumber: "000008821",
      direction: "INBOUND",
      standard: "ANSI_X12",
      senderId: "KNIGHTSWIFT",
      receiverId: "ATLASLOG",
      status: "APPLIED",
      rawPayload: sampleX12Payload,
      ackPayload: sample997Ack,
      ackStatus: "ACCEPTED",
      processedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(ediMessages)
    .values({
      id: "msg_sample_x12_01",
      interchangeId: "ic_sample_x12_01",
      messageType: "214",
      controlNumber: "0001",
      bookingReference: "BK-2026-8819",
      status: "APPLIED",
      parsedContent: {
        documentType: "214",
        carrier: "KNIGHTSWIFT",
        proNumber: "KS-991201",
        bookingNumber: "BK-2026-8819",
        statusCode: "X6",
        milestone: "EN_ROUTE_TO_DELIVERY",
        location: "MADRID, ES",
        timestamp: "2026-10-04T15:30:00Z",
      },
      extractedMilestone: "IN_TRANSIT",
      exceptionTriggered: false,
      processedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log(`✅ Creados 5 interlocutores EDI y ${2} intercambios históricos de prueba.`);
}
