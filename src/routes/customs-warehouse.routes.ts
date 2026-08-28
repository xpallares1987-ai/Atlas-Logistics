import { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import {
  customsFacilities,
  customsGuarantees,
  customsInventoryLots,
  customsStockLedgerEntries,
  customsDischargeDeclarations,
} from "../db/schema/customs_warehouse.js";
import { eq, desc } from "drizzle-orm";
import { CustomsWarehouseFinanceService } from "../services/customs-warehouse/customs-warehouse-finance.service.js";
import { CustomsStockLedgerService } from "../services/customs-warehouse/customs-stock-ledger.service.js";
import { PDFService } from "../services/pdf.service.js";

export async function customsWarehouseRoutes(app: FastifyInstance) {
  // 1. List Customs Facilities (DA, DDA, ADT, ZF)
  app.get("/facilities", async (_req, reply) => {
    try {
      const facilities = await db.select().from(customsFacilities);
      return reply.send(facilities);
    } catch (err: any) {
      app.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to fetch customs facilities" });
    }
  });

  // 2. List Comprehensive Guarantees (Avales Globales AEAT)
  app.get("/guarantees", async (_req, reply) => {
    try {
      const guarantees = await db.select().from(customsGuarantees);
      return reply.send(guarantees);
    } catch (err: any) {
      app.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to fetch customs guarantees" });
    }
  });

  // 3. List Customs Inventory Lots with search & filtering
  app.get<{
    Querystring: {
      regime?: string;
      facilityId?: string;
      status?: string;
      q?: string;
    };
  }>("/lots", async (req, reply) => {
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
    } catch (err: any) {
      app.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to fetch inventory lots" });
    }
  });

  // 4. Get Inventory Lot Detail with Ledger Entries
  app.get<{ Params: { id: string } }>("/lots/:id", async (req, reply) => {
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch lot details" });
    }
  });

  // 5. Get Official Stock Ledger Entries (Libro Oficial de Existencias)
  app.get("/ledger", async (_req, reply) => {
    try {
      const entries = await db
        .select()
        .from(customsStockLedgerEntries)
        .orderBy(desc(customsStockLedgerEntries.entrySequentialNumber));
      return reply.send(entries);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch stock ledger" });
    }
  });

  // 6. Calculate Suspended Debt Simulator
  app.post<{
    Body: {
      customsValueEur: number;
      tariffRatePercent: number;
      importVatRatePercent?: number;
    };
  }>("/calculate-debt", async (req, reply) => {
    try {
      const result = CustomsWarehouseFinanceService.calculateSuspendedDebt(
        req.body,
      );
      return reply.send({ success: true, result });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(400).send({ error: err.message });
    }
  });

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
  }>("/calculate-discharge", async (req, reply) => {
    try {
      const result =
        CustomsWarehouseFinanceService.calculateDischargeSettlement(req.body);
      return reply.send({ success: true, result });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(400).send({ error: err.message });
    }
  });

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
  }>("/lots/:id/status", async (req, reply) => {
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: "Failed to update lot status" });
    }
  });

  // 9. Stream Official Customs Bonding Document (DVD PDF)
  app.get<{ Params: { id: string } }>(
    "/lots/:id/dvd-pdf",
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
      } catch (err: any) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to generate DVD PDF" });
      }
    },
  );

  // 10. Stream Official Stock & Suspended Debt Certificate PDF
  app.get("/stock-certificate-pdf", async (_req, reply) => {
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
    } catch (err: any) {
      app.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to generate stock certificate PDF" });
    }
  });
}
