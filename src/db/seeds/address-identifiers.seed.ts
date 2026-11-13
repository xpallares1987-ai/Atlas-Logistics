/**
 * @file address-identifiers.seed.ts
 * @description Master seeder for specialized regulatory identifiers (SCAC, BIC, IATA, Broker License,
 * Customs Authorization, EORI, AEO) linked to canonical addresses, and linking customs facilities.
 * @module @atlas/db/seeds/address-identifiers
 */

import { db } from "../index.js";
import {
  addresses,
  addressIdentifiers,
  inferEnterpriseGroupId,
} from "../schema/core.js";
import { customsFacilities } from "../schema/customs_warehouse.js";
import { eq } from "drizzle-orm";

interface FacilityAddressDef {
  facilityId: string;
  addressId: string;
  companyName: string;
  tradeName: string;
  taxId: string;
  street1: string;
  zipCode: string;
  city: string;
  country: string;
  unLocode: string;
  authRef: string;
}

const CUSTOMS_FACILITY_ADDRESSES: readonly FacilityAddressDef[] = [
  {
    facilityId: "fac_da_bcn_zal",
    addressId: "addr_fac_da_bcn_zal",
    companyName: "Atlas Logistics Port Services S.A. (ZAL BCN)",
    tradeName: "Depósito Aduanero ZAL Port Barcelona",
    taxId: "ESA08991122",
    street1: "Av. Ports d'Europa 100, Sector ZAL Prat",
    zipCode: "08820",
    city: "El Prat de Llobregat / Barcelona",
    country: "ES",
    unLocode: "ESBCN",
    authRef: "ES-AET-2024-DA-4910",
  },
  {
    facilityId: "fac_dda_mad_cos",
    addressId: "addr_fac_dda_mad_cos",
    companyName: "Atlas Logistics Central Hub S.L. (DDA Coslada)",
    tradeName: "Depósito Distinto del Aduanero Coslada Hub",
    taxId: "ESB28114455",
    street1: "Centro de Carga Aérea & Intermodal Coslada, Nave 4",
    zipCode: "28821",
    city: "Coslada / Madrid",
    country: "ES",
    unLocode: "ESMAD",
    authRef: "ES-AET-2023-DDA-1822",
  },
  {
    facilityId: "fac_adt_vlc_port",
    addressId: "addr_fac_adt_vlc_port",
    companyName: "Atlas Intermodal Valencia S.L. (ADT Muelle Sur)",
    tradeName: "Almacén de Depósito Temporal Valencia Muelle Sur",
    taxId: "ESB46882211",
    street1: "Muelle de la Xitxarra s/n, Recinto Portuario",
    zipCode: "46024",
    city: "Valencia",
    country: "ES",
    unLocode: "ESVLC",
    authRef: "ES-AET-2025-ADT-7701",
  },
  {
    facilityId: "fac_zf_cadiz",
    addressId: "addr_fac_zf_cadiz",
    companyName: "Consorcio de la Zona Franca de Cádiz",
    tradeName: "Consorcio Zona Franca de Cádiz - Recinto Fiscal",
    taxId: "ESQ1118001A",
    street1: "Calle Ronda de Vigilancia s/n",
    zipCode: "11011",
    city: "Cádiz",
    country: "ES",
    unLocode: "ESCAD",
    authRef: "ES-AET-2022-ZF-0012",
  },
];

interface IdentifierDef {
  id: string;
  addressId: string;
  scheme:
    | "SCAC"
    | "IATA"
    | "BIC_OWNER"
    | "BROKER_LICENSE"
    | "EORI"
    | "AEO"
    | "CUSTOMS_AUTHORIZATION"
    | "LEI"
    | "DUNS"
    | "TAX_ID";
  value: string;
  transportMode?: "OCEAN" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";
  isPrimary?: boolean;
  issuedBy?: string;
}

const CANONICAL_IDENTIFIERS: readonly IdentifierDef[] = [
  // --- OCEAN CARRIERS (SCAC + BIC Owner Prefixes) ---
  {
    id: "ident_maersk_scac",
    addressId: "addr_carr_maersk",
    scheme: "SCAC",
    value: "MAEU",
    transportMode: "OCEAN",
    issuedBy: "NMFTA",
  },
  {
    id: "ident_maersk_bic",
    addressId: "addr_carr_maersk",
    scheme: "BIC_OWNER",
    value: "MSKU",
    transportMode: "OCEAN",
    issuedBy: "BIC",
  },
  {
    id: "ident_msc_scac",
    addressId: "addr_carr_msc",
    scheme: "SCAC",
    value: "MSCU",
    transportMode: "OCEAN",
    issuedBy: "NMFTA",
  },
  {
    id: "ident_msc_bic",
    addressId: "addr_carr_msc",
    scheme: "BIC_OWNER",
    value: "MEDU",
    transportMode: "OCEAN",
    issuedBy: "BIC",
  },
  {
    id: "ident_hapag_scac",
    addressId: "addr_carr_hapag",
    scheme: "SCAC",
    value: "HLCU",
    transportMode: "OCEAN",
    issuedBy: "NMFTA",
  },
  {
    id: "ident_hapag_bic",
    addressId: "addr_carr_hapag",
    scheme: "BIC_OWNER",
    value: "HLCU",
    transportMode: "OCEAN",
    issuedBy: "BIC",
  },
  {
    id: "ident_cosco_scac",
    addressId: "addr_carr_cosco",
    scheme: "SCAC",
    value: "COSU",
    transportMode: "OCEAN",
    issuedBy: "NMFTA",
  },
  {
    id: "ident_cosco_bic",
    addressId: "addr_carr_cosco",
    scheme: "BIC_OWNER",
    value: "COSU",
    transportMode: "OCEAN",
    issuedBy: "BIC",
  },
  {
    id: "ident_one_scac",
    addressId: "addr_carr_one",
    scheme: "SCAC",
    value: "ONEY",
    transportMode: "OCEAN",
    issuedBy: "NMFTA",
  },
  {
    id: "ident_one_bic",
    addressId: "addr_carr_one",
    scheme: "BIC_OWNER",
    value: "ONEU",
    transportMode: "OCEAN",
    issuedBy: "BIC",
  },
  {
    id: "ident_evergreen_scac",
    addressId: "addr_carr_evergreen",
    scheme: "SCAC",
    value: "EGLV",
    transportMode: "OCEAN",
    issuedBy: "NMFTA",
  },
  {
    id: "ident_evergreen_bic",
    addressId: "addr_carr_evergreen",
    scheme: "BIC_OWNER",
    value: "EGLU",
    transportMode: "OCEAN",
    issuedBy: "BIC",
  },

  // --- CUSTOMS BROKERS (Licenses & EORIs) ---
  {
    id: "ident_transmed_license",
    addressId: "addr_broker_transmed",
    scheme: "BROKER_LICENSE",
    value: "ES-CB-08101",
    issuedBy: "Agencia Estatal de Administración Tributaria (AEAT)",
  },
  {
    id: "ident_transmed_eori",
    addressId: "addr_broker_transmed",
    scheme: "EORI",
    value: "ESB08554433",
    issuedBy: "European Commission / DG TAXUD",
  },
  {
    id: "ident_iberia_license",
    addressId: "addr_broker_iberia",
    scheme: "BROKER_LICENSE",
    value: "ES-CB-46202",
    issuedBy: "Agencia Estatal de Administración Tributaria (AEAT)",
  },
  {
    id: "ident_iberia_eori",
    addressId: "addr_broker_iberia",
    scheme: "EORI",
    value: "ESA46998877",
    issuedBy: "European Commission / DG TAXUD",
  },

  // --- BONDED CUSTOMS WAREHOUSES (Official AEAT Authorizations) ---
  {
    id: "ident_fac_da_bcn_auth",
    addressId: "addr_fac_da_bcn_zal",
    scheme: "CUSTOMS_AUTHORIZATION",
    value: "ES-AET-2024-DA-4910",
    issuedBy: "AEAT Dependencia Regional de Aduanas e II.EE. de Cataluña",
  },
  {
    id: "ident_fac_dda_mad_auth",
    addressId: "addr_fac_dda_mad_cos",
    scheme: "CUSTOMS_AUTHORIZATION",
    value: "ES-AET-2023-DDA-1822",
    issuedBy: "AEAT Dependencia Regional de Aduanas e II.EE. de Madrid",
  },
  {
    id: "ident_fac_adt_vlc_auth",
    addressId: "addr_fac_adt_vlc_port",
    scheme: "CUSTOMS_AUTHORIZATION",
    value: "ES-AET-2025-ADT-7701",
    issuedBy: "AEAT Dependencia Regional de Aduanas e II.EE. de Valencia",
  },
  {
    id: "ident_fac_zf_cadiz_auth",
    addressId: "addr_fac_zf_cadiz",
    scheme: "CUSTOMS_AUTHORIZATION",
    value: "ES-AET-2022-ZF-0012",
    issuedBy: "AEAT Departamento de Aduanas e Impuestos Especiales",
  },

  // --- TOP HAULIERS & AIRLINES ---
  {
    id: "ident_sese_aeo",
    addressId: "addr_haul_sese",
    scheme: "AEO",
    value: "ESAEOF18000042",
    issuedBy: "AEAT OEA Seguridad y Simplificaciones Aduaneras",
  },
  {
    id: "ident_apmt_bcn_aeo",
    addressId: "addr_trm_apmt_bcn",
    scheme: "AEO",
    value: "ESAEOF12000019",
    issuedBy: "AEAT OEA",
  },
];

export async function seedAddressIdentifiers(): Promise<void> {
  console.log(
    "🏷️  [Seed:AddressIdentifiers] Seeding regulatory identifiers & warehouse facilities...",
  );

  // 1. Ensure facility addresses exist in addresses table
  for (const f of CUSTOMS_FACILITY_ADDRESSES) {
    const corporateGroupId = inferEnterpriseGroupId(f.companyName, "WH", "c-1");
    const now = new Date();

    await db
      .insert(addresses)
      .values({
        id: f.addressId,
        companyId: corporateGroupId,
        addressType: "WH",
        companyName: f.companyName,
        tradeName: f.tradeName,
        taxId: f.taxId,
        street1: f.street1,
        zipCode: f.zipCode,
        city: f.city,
        country: f.country,
        unLocode: f.unLocode,
        isDefaultShipper: false,
        isDefaultConsignee: false,
        isDefaultNotify: false,
        createdAt: now,
        updatedAt: now,
      } as any)
      .onConflictDoUpdate({
        target: addresses.id,
        set: {
          companyName: f.companyName,
          tradeName: f.tradeName,
          taxId: f.taxId,
          street1: f.street1,
          zipCode: f.zipCode,
          city: f.city,
          country: f.country,
          unLocode: f.unLocode,
          updatedAt: now,
        },
      });

    // 2. Link the customs facility to this address
    await db
      .update(customsFacilities)
      .set({ addressId: f.addressId })
      .where(eq(customsFacilities.id, f.facilityId));
  }

  // 3. Insert or update the canonical identifiers
  for (const item of CANONICAL_IDENTIFIERS) {
    // Check if the target address exists before inserting
    const existingAddress = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.id, item.addressId))
      .limit(1);

    if (existingAddress.length > 0) {
      const now = new Date();
      await db
        .insert(addressIdentifiers)
        .values({
          id: item.id,
          addressId: item.addressId,
          scheme: item.scheme as any,
          value: item.value,
          transportMode: item.transportMode as any,
          isPrimary: item.isPrimary ?? true,
          issuedBy: item.issuedBy || null,
          createdAt: now,
          updatedAt: now,
        } as any)
        .onConflictDoUpdate({
          target: addressIdentifiers.id,
          set: {
            value: item.value,
            scheme: item.scheme as any,
            transportMode: item.transportMode as any,
            issuedBy: item.issuedBy || null,
            updatedAt: now,
          },
        });
    }
  }

  console.log(
    "✅ [Seed:AddressIdentifiers] Identifiers and facility addresses seeded successfully.",
  );
}
