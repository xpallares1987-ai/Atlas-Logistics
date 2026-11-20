/**
 * @file customs-warehouse.routes.ts
 * @description Fastify routes for EU Customs Bonded Warehousing (DA, DDA, ADT, ZF), comprehensive guarantees (GRN), inventory lots, official stock ledger, suspended customs debt calculation, and DVD PDF generation.
 * @module @atlas/api/modules/customs-warehouse/routes
 */

import { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import {
  customsFacilities,
  customsGuarantees,
  customsInventoryLots,
  customsStockLedgerEntries,
} from "../../db/schema/customs_warehouse.js";
import { addresses } from "../../db/schema/core.js";
import { eq, desc, sql } from "drizzle-orm";
import { CustomsWarehouseFinanceService } from "./customs-warehouse-finance.service.js";
import { PDFService } from "../../services/pdf.service.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const CUSTOMS_WAREHOUSE_TAG = ["Customs Bonded Warehouse"] as const;

export async function customsWarehouseRoutes(app: FastifyInstance) {
  // 1. List Customs Facilities (DA, DDA, ADT, ZF) with 1:1 address resolution
  app.get(
    "/facilities",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary:
          "List authorized customs warehouse facilities (DA, DDA, ADT, ZF) with canonical address resolution",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req, reply) => {
      try {
        const facilities = await db
          .select({
            id: customsFacilities.id,
            addressId: customsFacilities.addressId,
            facilityCode: customsFacilities.facilityCode,
            name: sql<string>`coalesce(${addresses.tradeName}, ${addresses.companyName}, ${customsFacilities.name})`,
            facilityType: customsFacilities.facilityType,
            customsAuthorityAuthorizationRef:
              customsFacilities.customsAuthorityAuthorizationRef,
            managingOperatorName: sql<string>`coalesce(${addresses.companyName}, ${customsFacilities.managingOperatorName})`,
            locationAddress: sql<string>`coalesce(${addresses.street1}, ${customsFacilities.locationAddress})`,
            city: sql<string>`coalesce(${addresses.city}, ${customsFacilities.city})`,
            countryCode: sql<string>`coalesce(${addresses.country}, ${customsFacilities.countryCode})`,
            totalPalletCapacity: customsFacilities.totalPalletCapacity,
            occupiedPallets: customsFacilities.occupiedPallets,
            totalVolumeM3: customsFacilities.totalVolumeM3,
            maxStayDaysLimit: customsFacilities.maxStayDaysLimit,
            isReeferCertified: customsFacilities.isReeferCertified,
            isActive: customsFacilities.isActive,
            createdAt: customsFacilities.createdAt,
            updatedAt: customsFacilities.updatedAt,
          })
          .from(customsFacilities)
          .leftJoin(addresses, eq(customsFacilities.addressId, addresses.id));
        return reply.send(facilities);
      } catch (err: unknown) {
        app.log.error(err);
        return reply
          .status(500)
          .send({ error: "Failed to fetch customs facilities" });
      }
    },
  );

  // 2. List Comprehensive Guarantees (AEAT GRN)
  app.get(
    "/guarantees",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary:
          "List comprehensive customs guarantees (GRN) and reference balances",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req, reply) => {
      try {
        const guarantees = await db.select().from(customsGuarantees);
        return reply.send(guarantees);
      } catch (err: unknown) {
        app.log.error(err);
        return reply
          .status(500)
          .send({ error: "Failed to fetch customs guarantees" });
      }
    },
  );

  // 3. List Customs Inventory Lots with search & filtering
  app.get<{
    Querystring: {
      regime?: string;
      facilityId?: string;
      status?: string;
      q?: string;
    };
  }>(
    "/lots",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary:
          "List customs bonded inventory lots with regime, facility, status, and text search filters",
        querystring: openApiObject({
          regime: { type: "string" },
          facilityId: { type: "string" },
          status: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const { regime, facilityId, status, q } = req.query;
        let lots = await db
          .select()
          .from(customsInventoryLots)
          .orderBy(desc(customsInventoryLots.createdAt));

        if (regime && regime !== "ALL") {
          lots = lots.filter((l) => l.customsRegimeCode === regime);
        }
        if (facilityId && facilityId !== "ALL") {
          lots = lots.filter((l) => l.facilityId === facilityId);
        }
        if (status && status !== "ALL") {
          lots = lots.filter((l) => l.status === status);
        }
        if (q) {
          const queryLower = q.toLowerCase();
          lots = lots.filter(
            (l) =>
              l.lotNumber.toLowerCase().includes(queryLower) ||
              l.ownerCompanyName.toLowerCase().includes(queryLower) ||
              l.taricCommodityCode.toLowerCase().includes(queryLower) ||
              l.goodsDescription.toLowerCase().includes(queryLower) ||
              l.inclusionDvdNumber.toLowerCase().includes(queryLower),
          );
        }

        return reply.send(lots);
      } catch (err: unknown) {
        app.log.error(err);
        return reply
          .status(500)
          .send({ error: "Failed to fetch inventory lots" });
      }
    },
  );

  // 4. Get Inventory Lot Detail with Ledger Entries
  app.get<{ Params: { id: string } }>(
    "/lots/:id",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary:
          "Retrieve customs inventory lot details with stock ledger entries",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const [lot] = await db
          .select()
          .from(customsInventoryLots)
          .where(eq(customsInventoryLots.id, req.params.id));

        if (!lot) {
          return reply.status(404).send({ error: "Customs lot not found" });
        }

        const entries = await db
          .select()
          .from(customsStockLedgerEntries)
          .where(eq(customsStockLedgerEntries.lotId, lot.id))
          .orderBy(desc(customsStockLedgerEntries.entrySequentialNumber));

        return reply.send({ ...lot, entries });
      } catch (err: unknown) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch lot details" });
      }
    },
  );

  // 5. Get Official Stock Ledger Entries
  app.get(
    "/ledger",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary: "List official customs bonded stock ledger movements",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req, reply) => {
      try {
        const entries = await db
          .select()
          .from(customsStockLedgerEntries)
          .orderBy(desc(customsStockLedgerEntries.entrySequentialNumber));
        return reply.send(entries);
      } catch (err: unknown) {
        app.log.error(err);
        return reply
          .status(500)
          .send({ error: "Failed to fetch stock ledger" });
      }
    },
  );

  // 6. Calculate Suspended Debt Simulator
  app.post<{
    Body: {
      customsValueEur: number;
      tariffRatePercent: number;
      importVatRatePercent?: number;
    };
  }>(
    "/calculate-debt",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary: "Simulate suspended customs duty and import VAT debt",
        body: openApiObject({
          customsValueEur: { type: "number" },
          tariffRatePercent: { type: "number" },
          importVatRatePercent: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const result = CustomsWarehouseFinanceService.calculateSuspendedDebt(
          req.body,
        );
        return reply.send({ success: true, result });
      } catch (err: unknown) {
        app.log.error(err);
        return reply.status(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  // 7. Calculate Discharge Tax Settlement Simulator
  app.post<{
    Body: {
      totalLotCustomsValueEur: number;
      totalLotDutyAmountEur: number;
      totalLotVatAmountEur: number;
      initialPackagesCount: number;
      dischargedPackagesCount: number;
      dischargeRegimeCode:
        "4071" | "3171" | "7171" | "5171" | "DOMESTIC_COMMERCE_DDA";
    };
  }>(
    "/calculate-discharge",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary:
          "Simulate partial or full customs bonded discharge tax settlement",
        body: openApiObject({
          totalLotCustomsValueEur: { type: "number" },
          totalLotDutyAmountEur: { type: "number" },
          totalLotVatAmountEur: { type: "number" },
          initialPackagesCount: { type: "number" },
          dischargedPackagesCount: { type: "number" },
          dischargeRegimeCode: {
            type: "string",
            enum: ["4071", "3171", "7171", "5171", "DOMESTIC_COMMERCE_DDA"],
          },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const result =
          CustomsWarehouseFinanceService.calculateDischargeSettlement(req.body);
        return reply.send({ success: true, result });
      } catch (err: unknown) {
        app.log.error(err);
        return reply.status(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  // 8. Update Lot Status
  app.post<{
    Params: { id: string };
    Body: {
      status:
        | "ACTIVE"
        | "PARTIALLY_DISCHARGED"
        | "CLOSED_DISCHARGED"
        | "EXPIRED_ALERT";
      remarks?: string;
    };
  }>(
    "/lots/:id/status",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary: "Update customs inventory lot status and operational remarks",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          status: {
            type: "string",
            enum: [
              "ACTIVE",
              "PARTIALLY_DISCHARGED",
              "CLOSED_DISCHARGED",
              "EXPIRED_ALERT",
            ],
          },
          remarks: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const [lot] = await db
          .select()
          .from(customsInventoryLots)
          .where(eq(customsInventoryLots.id, req.params.id));

        if (!lot) {
          return reply.status(404).send({ error: "Lot not found" });
        }

        await db
          .update(customsInventoryLots)
          .set({
            status: req.body.status,
            remarks: req.body.remarks || lot.remarks,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(customsInventoryLots.id, req.params.id));

        return reply.send({ success: true, status: req.body.status });
      } catch (err: unknown) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to update lot status" });
      }
    },
  );

  // 9. Stream Official Customs Bonding Document (DVD PDF)
  app.get<{ Params: { id: string } }>(
    "/lots/:id/dvd-pdf",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary:
          "Generate and stream official Customs Bonding Document (DVD) PDF for a lot",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const [lot] = await db
          .select()
          .from(customsInventoryLots)
          .where(eq(customsInventoryLots.id, req.params.id));

        if (!lot) {
          return reply.status(404).send({ error: "Lot not found" });
        }

        let facilityName = "Depósito Aduanero ZAL Port Barcelona";
        let facilityRef = "ES-AET-2024-DA-4910";
        if (lot.facilityId) {
          const [fac] = await db
            .select()
            .from(customsFacilities)
            .where(eq(customsFacilities.id, lot.facilityId));
          if (fac) {
            facilityName = fac.name;
            facilityRef = fac.customsAuthorityAuthorizationRef;
          }
        }

        let grn = "GRN-2026-AEAT-00918";
        let bank = "Banco Santander S.A.";
        if (lot.guaranteeId) {
          const [guar] = await db
            .select()
            .from(customsGuarantees)
            .where(eq(customsGuarantees.id, lot.guaranteeId));
          if (guar) {
            grn = guar.guaranteeReferenceNumber;
            bank = guar.guarantorFinancialInstitution;
          }
        }

        const pdfBuffer = await PDFService.generateCustomsBondingDocumentPdf({
          ...lot,
          facilityName,
          facilityAuthorizationRef: facilityRef,
          guaranteeReferenceNumber: grn,
          guarantorBank: bank,
        });

        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `inline; filename="DVD_${lot.lotNumber}.pdf"`,
          )
          .send(pdfBuffer);
      } catch (err: unknown) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to generate DVD PDF" });
      }
    },
  );

  // 10. Stream Official Stock & Suspended Debt Certificate PDF
  app.get(
    "/stock-certificate-pdf",
    {
      schema: {
        tags: [...CUSTOMS_WAREHOUSE_TAG],
        summary:
          "Generate and stream official customs warehouse stock and suspended debt certificate PDF",
        response: {
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req, reply) => {
      try {
        const lots = await db
          .select()
          .from(customsInventoryLots)
          .orderBy(desc(customsInventoryLots.createdAt));

        const totalSuspended = lots.reduce(
          (sum, l) => sum + (l.totalSuspendedDebtEur || 0),
          0,
        );
        const totalPkgs = lots.reduce(
          (sum, l) => sum + (l.currentPackageCount || 0),
          0,
        );
        const totalMass = lots.reduce(
          (sum, l) => sum + (l.currentGrossMassKg || 0),
          0,
        );

        const pdfBuffer = await PDFService.generateCustomsStockCertificatePdf({
          facilityName: "Red Nacional de Depósitos Aduaneros Autorizados",
          lots,
          totalSuspendedDebtEur: totalSuspended,
          totalPackages: totalPkgs,
          totalGrossMassKg: totalMass,
        });

        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `inline; filename="Certificado_Existencias_Aduaneras.pdf"`,
          )
          .send(pdfBuffer);
      } catch (err: unknown) {
        app.log.error(err);
        return reply
          .status(500)
          .send({ error: "Failed to generate stock certificate PDF" });
      }
    },
  );
}
