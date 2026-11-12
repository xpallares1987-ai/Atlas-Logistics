import { db } from "../index.js";
import * as schema from "../schema/index.js";
import crypto from "crypto";

function computeSha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function seedCarbonInsetting(): Promise<void> {
  const now = new Date().toISOString();

  // 1. Genesis Seal for Token 1 (B100 Biodiesel - Port de Barcelona)
  const b100Payload = JSON.stringify({
    reference: "INSET-2026-B100-BCN-001",
    fuel: "BIO_MGO_HVO",
    bdn: "BDN-BCN-2026-8812",
    iscc: "ISCC-EU-Cert-DE105-829104",
    port: "ESBCN",
    supplier: "Repsol Marine Decarb S.A.",
    volumeMT: 500,
  });
  const b100DigitalSeal = computeSha256(b100Payload);

  // Genesis Seal for Token 2 (E-Methanol - Port of Rotterdam)
  const emethanolPayload = JSON.stringify({
    reference: "INSET-2026-METH-RTM-002",
    fuel: "E_METHANOL_RFNBO",
    bdn: "BDN-RTM-2026-4401",
    iscc: "ISCC-PLUS-Cert-NL201-994112",
    port: "NLRTM",
    supplier: "European Energy / Maersk Green Fuels",
    volumeMT: 300,
  });
  const emethanolDigitalSeal = computeSha256(emethanolPayload);

  // 2. Insert Carbon Insetting Tokens
  await db
    .insert(schema.carbonInsettingTokens)
    .values([
      {
        id: "token_b100_bcn_01",
        tokenReference: "INSET-2026-B100-BCN-001",
        fuelId: "fuel_bio_mgo_hvo",
        fuelType: "B100_BIODIESEL",
        bunkerPortLocode: "ESBCN",
        bunkerLocationName: "Port de Barcelona - Muelle de la Energía",
        bdnReference: "BDN-BCN-2026-8812",
        isccCertificateNumber: "ISCC-EU-Cert-DE105-829104",
        sustainabilityRegistry: "ISCC_EU",
        registryUrl:
          "https://www.iscc-system.org/certificates/ISCC-EU-Cert-DE105-829104",
        supplierCompanyName: "Repsol Marine Decarb S.A.",
        totalVolumeMetricTonnes: 500.0,
        totalEnergyMj: 22000000.0, // 500t * 44 MJ/kg * 1000
        availableEnergyMj: 17600000.0, // 4,400,000 MJ allocated
        baselineGhgIntensityGco2eqPerMj: 91.16,
        certifiedGhgIntensityGco2eqPerMj: 13.67,
        ghgSavingPercent: 85.0,
        ghgAbatementTco2eqPerTonne: 3.41, // ~3.41 tCO2eq ahorradas por tonelada
        unitPriceEurPerMj: 0.042,
        status: "PARTIALLY_ALLOCATED",
        digitalSealHash: b100DigitalSeal,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "token_emethanol_rtm_01",
        tokenReference: "INSET-2026-METH-RTM-002",
        fuelId: "fuel_e_methanol",
        fuelType: "E_METHANOL",
        bunkerPortLocode: "NLRTM",
        bunkerLocationName: "Port of Rotterdam - Maasvlakte 2 Green Hub",
        bdnReference: "BDN-RTM-2026-4401",
        isccCertificateNumber: "ISCC-PLUS-Cert-NL201-994112",
        sustainabilityRegistry: "ISCC_PLUS",
        registryUrl:
          "https://www.iscc-system.org/certificates/ISCC-PLUS-Cert-NL201-994112",
        supplierCompanyName: "European Energy / Maersk Green Fuels",
        totalVolumeMetricTonnes: 300.0,
        totalEnergyMj: 5970000.0, // 300t * 19.9 MJ/kg * 1000
        availableEnergyMj: 5970000.0,
        baselineGhgIntensityGco2eqPerMj: 91.16,
        certifiedGhgIntensityGco2eqPerMj: 5.47,
        ghgSavingPercent: 94.0,
        ghgAbatementTco2eqPerTonne: 1.705,
        unitPriceEurPerMj: 0.068,
        status: "AVAILABLE",
        digitalSealHash: emethanolDigitalSeal,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoUpdate({
      target: schema.carbonInsettingTokens.id,
      set: {
        availableEnergyMj: 17600000.0,
        status: "PARTIALLY_ALLOCATED",
        updatedAt: now,
      },
    });

  // 4. Insetting Allocation linked to Canonical Shipment 'sh_demo_01'
  const allocGenesisPrevHash =
    "0000000000000000000000000000000000000000000000000000000000000000";
  const allocPayload = JSON.stringify({
    reference: "ALLOC-2026-0001",
    token: "token_b100_bcn_01",
    shipment: "sh_demo_01",
    beneficiary: "c-1",
    allocatedEnergyMj: 4400000.0,
    abatedTco2eq: 341.0,
    certificate: "CERT-INS-2026-7788",
    prevHash: allocGenesisPrevHash,
  });
  const allocBlockHash = computeSha256(allocPayload);

  await db
    .insert(schema.carbonInsettingAllocations)
    .values({
      id: "alloc_sh_demo_01",
      allocationReference: "ALLOC-2026-0001",
      tokenId: "token_b100_bcn_01",
      shipmentId: "sh_demo_01",
      beneficiaryCompanyId: "c-1",
      beneficiaryName: "Atlas Global Logistics SL / Consignee Partner",
      transportMode: "MARITIME_OCEAN",
      allocatedEnergyMj: 4400000.0,
      equivalentFuelVolumeTonnes: 100.0,
      abatedGhgTco2eq: 341.0,
      costEur: 18480.0, // 4,400,000 MJ * 0.042 €/MJ
      certificateCode: "CERT-INS-2026-7788",
      verificationQrUrl:
        "https://atlas-logistics.io/verify/insetting/CERT-INS-2026-7788",
      previousBlockHash: allocGenesisPrevHash,
      blockHashSha256: allocBlockHash,
      status: "CLAIMED_RETIRED",
      leadAuditorVerifier: "Bureau Veritas Maritime / DNV Verisust",
      allocatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.carbonInsettingAllocations.id,
      set: {
        allocatedEnergyMj: 4400000.0,
        abatedGhgTco2eq: 341.0,
        costEur: 18480.0,
      },
    });

  // 5. FuelEU Penalties Ledger (Art. 23)
  await db
    .insert(schema.fuelEuPenaltiesLedger)
    .values({
      id: "pen_cadiz_2025",
      settlementReference: "PEN-2025-0041",
      vesselId: "ves_cadiz_bulk",
      reportingYear: 2025,
      complianceDeficitGco2eq: 30790000.0, // 30.79 tCO2eq deficit
      vlsfoEquivalentEnergyDeficitMj: 557750.0,
      vlsfoEquivalentDeficitTonnes: 13.6,
      statutoryPenaltyRateEurPerTonne: 2400.0,
      penaltyMultiplierConsecutiveYears: 1.0,
      totalPenaltyPayableEur: 32640.0,
      poolOffsetId: null,
      offsetAmountEur: 0.0,
      netPayableEur: 32640.0,
      paymentStatus: "CALCULATED_PENDING",
      euFundTreasuryAccount: "EU-INNOVATION-FUND-FUELEU-ESCROW-ES88",
      settledAt: now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: schema.fuelEuPenaltiesLedger.id,
      set: {
        totalPenaltyPayableEur: 32640.0,
        netPayableEur: 32640.0,
      },
    });

  console.log(
    "✅ Creados Tokens de Insetting Criptográfico (Book-and-Claim), Asignación sh_demo_01 y Penalizaciones FuelEU.",
  );
}
