// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FreightRate } from "../types";
import { FreightRateSchema } from "../schemas/excel-schema";

/**
 * Normalizes headers and searches for matching columns based on common variants
 */
export function getHeaderKey(
  headers: string[],
  targetNames: string[],
): string | null {
  for (const h of headers) {
    const cleanH = h
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    for (const t of targetNames) {
      const cleanT = t.toLowerCase().replace(/[\s_-]+/g, "");
      if (
        cleanH === cleanT ||
        cleanH.includes(cleanT) ||
        cleanT.includes(cleanH)
      ) {
        return h;
      }
    }
  }
  return null;
}

/**
 * Assures currency expressions and objects are cleanly converted to numbers
 */
export function parseNum(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;

  // Remove currency symbols, brackets and whitespace
  // Matches $, €, £, and other symbols, plus [ ] and all spaces
  let str = String(val).replace(/[$\u20AC\u00A3[\]\s]/g, "");

  // Handle European format (1.234,56) vs US format (1,234.56)
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");

  if (lastComma > lastDot) {
    // European format: 1.234,56 or 1234,56
    // Remove all dots (thousands separator) and then replace comma with dot
    str = str.replace(/\./g, "").replace(",", ".");
  } else {
    // US format: 1,234.56 or 1234.56
    // Remove all commas (thousands separator)
    str = str.replace(/,/g, "");
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalizes strings to Proper Case (Nombre Propio) with acronym guards.
 */
export function toProperCase(str: string): string {
  if (!str) return "";
  const trimmed = str.trim();
  if (!trimmed) return "";

  const upperTrimmed = trimmed.toUpperCase();
  if (upperTrimmed === "MSC") return "MSC";
  if (upperTrimmed === "COSCO") return "COSCO";
  if (upperTrimmed === "EUR") return "EUR";
  if (upperTrimmed === "USD") return "USD";
  if (upperTrimmed === "VGM") return "VGM";
  if (upperTrimmed === "THC") return "THC";
  if (upperTrimmed === "BAF") return "BAF";
  if (upperTrimmed === "LSS") return "LSS";

  return trimmed
    .toLowerCase()
    .replace(/(^[a-zÀ-ÿ]|[\s\-()/&,+]\s*[a-zÀ-ÿ])/g, (match) =>
      match.toUpperCase(),
    );
}

/**
 * Trims and sanitizes strings safely
 */
export function parseStr(val: unknown, fallback = ""): string {
  if (val === undefined || val === null || val === "") return fallback;
  return String(val).trim();
}

/**
 * Parses raw JSON structured rows generated from SheetJS into standard FreightRate entities
 */
export function parseRawSheetRows(
  rawRows: Record<string, unknown>[],
  sheetName: string,
): FreightRate[] {
  if (rawRows.length === 0) return [];

  const keys = Object.keys(rawRows[0]);

  const pMes = getHeaderKey(keys, ["mes", "month", "periodo", "fecha"]);
  const pPol = getHeaderKey(keys, [
    "portofloading",
    "pol",
    "origen",
    "loadingport",
  ]);
  const pPod = getHeaderKey(keys, [
    "portofdischarge",
    "pod",
    "destino",
    "dischargeport",
  ]);
  const pCarrier = getHeaderKey(keys, ["carrier", "naviera", "linea"]);
  const pTotal = getHeaderKey(keys, [
    "total",
    "totalcost",
    "costetotal",
    "sumatotal",
  ]);
  const pFob = getHeaderKey(keys, [
    "gastosfob",
    "fob",
    "localesorigin",
    "localfob",
  ]);
  const pOcean = getHeaderKey(keys, [
    "oceanfreight",
    "flete",
    "fletemaritimo",
    "ocean",
  ]);
  const pDestino = getHeaderKey(keys, [
    "gastosendestino",
    "destino",
    "localesdestino",
    "destcharges",
  ]);
  const pTransit = getHeaderKey(keys, [
    "transittime",
    "tt",
    "tiempo",
    "dias",
    "days",
  ]);

  const pBaf = getHeaderKey(keys, ["baf", "fuel"]);
  const pThc = getHeaderKey(keys, ["thc", "handling"]);
  const pLss = getHeaderKey(keys, ["lss", "lowsulfur"]);
  const pOtros = getHeaderKey(keys, ["otros", "others", "recargos"]);

  const parsedRates: FreightRate[] = [];

  rawRows.forEach((row) => {
    const polVal = pPol ? parseStr(row[pPol]) : "";
    const podVal = pPod ? parseStr(row[pPod]) : "";
    const carrierVal = pCarrier ? parseStr(row[pCarrier]) : "";
    const mesVal = pMes ? parseStr(row[pMes]) : "";

    if (!polVal || !podVal || !carrierVal) {
      return;
    }

    const ocean = pOcean ? parseNum(row[pOcean]) : 0;
    const fob = pFob ? parseNum(row[pFob]) : 0;
    const dest = pDestino ? parseNum(row[pDestino]) : 0;

    const baf = pBaf ? parseNum(row[pBaf]) : 0;
    const thc = pThc ? parseNum(row[pThc]) : 0;
    const lss = pLss ? parseNum(row[pLss]) : 0;
    const otros = pOtros ? parseNum(row[pOtros]) : 0;

    const totalVal = pTotal
      ? parseNum(row[pTotal])
      : ocean + fob + dest + baf + thc + lss + otros;

    const cleanPol = polVal.toUpperCase().trim().replace(/\s+/g, "");
    let polsToCreate: string[] = [];
    if (
      cleanPol === "BARCELONA/VALENCIA" ||
      cleanPol === "VALENCIA/BARCELONA"
    ) {
      polsToCreate = ["Barcelona", "Valencia"];
    } else {
      polsToCreate = [polVal];
    }

    const cleanPod = podVal.toUpperCase().trim().replace(/\s+/g, "");
    let podsToCreate: string[] = [];
    if (
      cleanPod.includes("ALGER(ARGEL)&SKIKDA&ANNABA") ||
      cleanPod.includes("ALGER(ARGEL)&SKIDKA&ANNABA") ||
      (cleanPod.includes("ALGER") &&
        cleanPod.includes("SKIKDA") &&
        cleanPod.includes("ANNABA"))
    ) {
      podsToCreate = ["Alger (Argel)", "Skikda", "Annaba"];
    } else {
      podsToCreate = [podVal];
    }

    polsToCreate.forEach((pName) => {
      podsToCreate.forEach((dName) => {
        parsedRates.push({
          sheetSource: sheetName,
          mes: toProperCase(mesVal) || "N/A",
          pol: toProperCase(pName),
          pod: toProperCase(dName),
          carrier: toProperCase(carrierVal),
          total: totalVal,
          gastosFob: fob,
          oceanFreight: ocean,
          gastosDestino: dest,
          baf,
          thc,
          lss,
          otrosRecargos: otros,
          transitTime: pTransit ? parseNum(row[pTransit]) : undefined,
        });
      });
    });
  });

  // Final validation pass via Zod
  return parsedRates.filter((rate) => {
    const result = FreightRateSchema.safeParse(rate);
    if (!result.success) {
      console.warn(
        "Skipping invalid rate record:",
        result.error.format(),
        rate,
      );
      return false;
    }
    return true;
  });
}

/**
 * Parses using an explicit mapping provided by the user via the UI
 */
export function parseMappedSheetRows(
  rawRows: Record<string, unknown>[],
  sheetName: string,
  mapping: Record<string, string>,
): FreightRate[] {
  if (rawRows.length === 0) return [];
  const parsedRates: FreightRate[] = [];

  rawRows.forEach((row) => {
    const polVal = mapping.pol ? parseStr(row[mapping.pol]) : "";
    const podVal = mapping.pod ? parseStr(row[mapping.pod]) : "";
    const carrierVal = mapping.carrier ? parseStr(row[mapping.carrier]) : "";
    const mesVal = mapping.mes ? parseStr(row[mapping.mes]) : "";

    if (!polVal || !podVal || !carrierVal) return;

    const ocean = mapping.oceanFreight
      ? parseNum(row[mapping.oceanFreight])
      : 0;
    const fob = mapping.gastosFob ? parseNum(row[mapping.gastosFob]) : 0;
    const dest = mapping.gastosDestino
      ? parseNum(row[mapping.gastosDestino])
      : 0;
    const baf = mapping.baf ? parseNum(row[mapping.baf]) : 0;

    // total calculation
    const totalVal = mapping.total
      ? parseNum(row[mapping.total])
      : ocean + fob + dest + baf;

    parsedRates.push({
      sheetSource: sheetName,
      mes: toProperCase(mesVal) || "N/A",
      pol: toProperCase(polVal),
      pod: toProperCase(podVal),
      carrier: toProperCase(carrierVal),
      total: totalVal,
      gastosFob: fob,
      oceanFreight: ocean,
      gastosDestino: dest,
      baf,
      thc: 0,
      lss: 0,
      otrosRecargos: 0,
      transitTime: mapping.transitTime
        ? parseNum(row[mapping.transitTime])
        : undefined,
      validUntil: mapping.validUntil
        ? parseStr(row[mapping.validUntil])
        : undefined,
    });
  });

  return parsedRates.filter((rate) => {
    const result = FreightRateSchema.safeParse(rate);
    if (!result.success) {
      console.warn("Skipping mapped record:", result.error.format(), rate);
      return false;
    }
    return true;
  });
}

/**
 * Parses raw datos.js JSON items into proper FreightRate entities, computing standard flat values
 */
export function parseDatosJsRows(
  rawRecords: Record<string, any>[],
): FreightRate[] {
  const EUR_USD_RATE = 1.08;
  const META_KEYS = [
    "CONTRATO",
    "Dias libres en Origen",
    "Dias Libres en Destino",
    "Effective Date",
    "Valid Until",
    "GASTOS FOB",
    "SF + RECARGOS",
    "Ocean freight",
    "GASTOS EN DESTINO",
    "NAC",
  ];

  const parsedRates: FreightRate[] = [];

  rawRecords.forEach((item) => {
    const oceanFreight = (item.oceanFreight as number) || 0;
    const oceanFreightDivisa = (item.oceanFreightDivisa as string) || "USD";
    const mes = (item.mes as string) || "N/A";
    const pol = (item.pol as string) || "";
    const pod = (item.pod as string) || "";
    const carrier = (item.carrier as string) || "";
    const contrato = (item.contrato as string) || "";
    const nac = (item.nac as string) || "—";
    const diasLibresOrigen =
      item.diasLibresOrigen !== undefined ? item.diasLibresOrigen : "—";
    const diasLibresDestino =
      item.diasLibresDestino !== undefined ? item.diasLibresDestino : "—";
    const validUntil = (item.validUntil as string) || "";
    const conceptos =
      (item.conceptos as Record<
        string,
        number | { val: number; divisa: string }
      >) || {};

    // Compute parts
    let totalUSD =
      oceanFreightDivisa === "EUR" ? oceanFreight * EUR_USD_RATE : oceanFreight;
    let gastosFob = 0;
    let gastosDestino = 0;
    let baf = 0;
    let thc = 0;
    let lss = 0;
    let otrosRecargos = 0;

    Object.entries(conceptos).forEach(([key, value]) => {
      if (META_KEYS.includes(key)) return;

      const val =
        typeof value === "object"
          ? (value as { val: number }).val
          : (value as number);
      const divisa =
        typeof value === "object"
          ? (value as { divisa: string }).divisa || "USD"
          : "USD";
      const valUSD = divisa === "EUR" ? val * EUR_USD_RATE : val;

      totalUSD += valUSD;

      const lowKey = key.toLowerCase();
      if (lowKey.includes("baf")) {
        baf += valUSD;
      } else if (lowKey.includes("thco") || lowKey.includes("thc")) {
        thc += valUSD;
        gastosFob += valUSD;
      } else if (
        lowKey.includes("lss") ||
        lowKey.includes("seca") ||
        lowKey.includes("co2")
      ) {
        lss += valUSD;
      } else if (
        lowKey.startsWith("doc:") ||
        lowKey.includes("porto") ||
        lowKey.includes("vgm") ||
        lowKey.includes("fob")
      ) {
        gastosFob += valUSD;
      } else if (
        lowKey.includes("portd") ||
        lowKey.includes("thcd") ||
        lowKey.includes("owd") ||
        lowKey.includes("onct")
      ) {
        gastosDestino += valUSD;
      } else {
        otrosRecargos += valUSD;
      }
    });

    const cleanPol = pol.toUpperCase().trim().replace(/\s+/g, "");
    let polsToCreate: string[] = [];
    if (
      cleanPol === "BARCELONA/VALENCIA" ||
      cleanPol === "VALENCIA/BARCELONA"
    ) {
      polsToCreate = ["Barcelona", "Valencia"];
    } else {
      polsToCreate = [pol];
    }

    const cleanPod = pod.toUpperCase().trim().replace(/\s+/g, "");
    let podsToCreate: string[] = [];
    if (
      cleanPod.includes("ALGER(ARGEL)&SKIKDA&ANNABA") ||
      cleanPod.includes("ALGER(ARGEL)&SKIDKA&ANNABA") ||
      (cleanPod.includes("ALGER") &&
        cleanPod.includes("SKIKDA") &&
        cleanPod.includes("ANNABA"))
    ) {
      podsToCreate = ["Alger (Argel)", "Skikda", "Annaba"];
    } else {
      podsToCreate = [pod];
    }

    polsToCreate.forEach((pName) => {
      podsToCreate.forEach((dName) => {
        parsedRates.push({
          sheetSource: "DATOS",
          mes: toProperCase(mes),
          pol: toProperCase(pName),
          pod: toProperCase(dName),
          carrier: toProperCase(carrier),
          total: Math.round(totalUSD * 100) / 100,
          gastosFob: Math.round(gastosFob * 100) / 100,
          oceanFreight,
          oceanFreightDivisa,
          gastosDestino: Math.round(gastosDestino * 100) / 100,
          baf: Math.round(baf * 100) / 100,
          thc: Math.round(thc * 100) / 100,
          lss: Math.round(lss * 100) / 100,
          otrosRecargos: Math.round(otrosRecargos * 100) / 100,
          contrato,
          nac,
          diasLibresOrigen,
          diasLibresDestino,
          validUntil,
          conceptos,
        });
      });
    });
  });

  // Final validation pass via Zod
  return parsedRates.filter((rate) => {
    const result = FreightRateSchema.safeParse(rate);
    if (!result.success) {
      console.warn(
        "Skipping invalid rate record:",
        result.error.format(),
        rate,
      );
      return false;
    }
    return true;
  });
}

/**
 * Parses semicolon-separated CSV content representing freight records into FreightRate structures
 */
export function parseSemicolonCSV(
  csvText: string,
  fileName = "Imported CSV",
): FreightRate[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(";").map((h) => h.trim());
  const headerIndices: Record<string, number> = {};
  headers.forEach((h, index) => {
    headerIndices[h] = index;
  });

  const getHeaderVal = (
    rowCols: string[],
    headerName: string,
    fallback = "",
  ): string => {
    const index = headerIndices[headerName];
    if (index === undefined || index >= rowCols.length) return fallback;
    return rowCols[index].trim();
  };

  const parsedRates: FreightRate[] = [];

  for (let idx = 1; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (
      !line ||
      line.startsWith(";-") ||
      line.startsWith("--------------") ||
      line.match(/^;+$/)
    ) {
      continue;
    }

    const cols = line.split(";").map((c) => c.trim());
    if (cols.length < 5) continue;

    const monthRaw = getHeaderVal(cols, "Month");
    if (
      !monthRaw ||
      monthRaw.toLowerCase().includes("month") ||
      monthRaw.startsWith("--------------")
    )
      continue;

    const mes = monthRaw.toUpperCase();
    const pol = getHeaderVal(cols, "Port of Loading");
    const pod = getHeaderVal(cols, "Port of Discharge");
    const carrierRaw = getHeaderVal(cols, "Carrier");

    let carrier = carrierRaw;
    if (carrierRaw.toUpperCase() === "HAPAG") carrier = "HAPAG-LLOYD";

    const oceanFreight = parseNum(getHeaderVal(cols, "Ocean freight"));
    const oceanFreightDivisa =
      getHeaderVal(cols, "Ocean freight Currency") || "USD";

    const contrato = getHeaderVal(cols, "CONTRATO");
    const nac = getHeaderVal(cols, "NAC") || "—";

    const freeDaysOriginRaw = getHeaderVal(cols, "Dias libres en Origen");
    const freeDaysDestRaw = getHeaderVal(cols, "Dias Libres en Destino");
    const diasLibresOrigen = freeDaysOriginRaw
      ? parseInt(freeDaysOriginRaw, 10) || "—"
      : "—";
    const diasLibresDestino = freeDaysDestRaw
      ? parseInt(freeDaysDestRaw, 10) || "—"
      : "—";

    const validUntil = getHeaderVal(cols, "Valid Until");

    // Build conceptos and compute sum totals
    const conceptos: Record<string, number | { val: number; divisa: string }> =
      {};
    const EUR_USD_RATE = 1.08;
    let totalUSD =
      oceanFreightDivisa === "EUR" ? oceanFreight * EUR_USD_RATE : oceanFreight;
    let gastosFob = 0;
    let gastosDestino = 0;
    let baf = 0;
    let thc = 0;
    let lss = 0;
    let otrosRecargos = 0;

    headers.forEach((h, hIdx) => {
      if (h.startsWith("CON:") || h.startsWith("DOC:")) {
        const val = parseNum(cols[hIdx]);
        if (val !== 0) {
          let divisa = "EUR"; // default fallback
          const nextH = headers[hIdx + 1];
          if (
            nextH &&
            (nextH.toLowerCase().includes("currency") ||
              nextH.toLowerCase() === "divisa")
          ) {
            divisa = cols[hIdx + 1] || "EUR";
          }
          conceptos[h] = { val, divisa };

          const valUSD = divisa === "EUR" ? val * EUR_USD_RATE : val;
          totalUSD += valUSD;

          const lowKey = h.toLowerCase();
          if (lowKey.includes("baf")) {
            baf += valUSD;
          } else if (lowKey.includes("thco") || lowKey.includes("thc")) {
            thc += valUSD;
            gastosFob += valUSD;
          } else if (
            lowKey.includes("lss") ||
            lowKey.includes("seca") ||
            lowKey.includes("co2")
          ) {
            lss += valUSD;
          } else if (
            lowKey.startsWith("doc:") ||
            lowKey.includes("porto") ||
            lowKey.includes("vgm") ||
            lowKey.includes("fob")
          ) {
            gastosFob += valUSD;
          } else if (
            lowKey.includes("portd") ||
            lowKey.includes("thcd") ||
            lowKey.includes("owd") ||
            lowKey.includes("onct")
          ) {
            gastosDestino += valUSD;
          } else {
            otrosRecargos += valUSD;
          }
        }
      }
    });

    // Check dual POL and POD split logics
    const cleanPol = pol.toUpperCase().trim().replace(/\s+/g, "");
    let polsToCreate: string[] = [];
    if (
      cleanPol === "BARCELONA/VALENCIA" ||
      cleanPol === "VALENCIA/BARCELONA"
    ) {
      polsToCreate = ["Barcelona", "Valencia"];
    } else {
      polsToCreate = [pol];
    }

    const cleanPod = pod.toUpperCase().trim().replace(/\s+/g, "");
    let podsToCreate: string[] = [];
    if (
      cleanPod.includes("ALGER(ARGEL)&SKIKDA&ANNABA") ||
      cleanPod.includes("ALGER(ARGEL)&SKIDKA&ANNABA") ||
      (cleanPod.includes("ALGER") &&
        cleanPod.includes("SKIKDA") &&
        cleanPod.includes("ANNABA"))
    ) {
      podsToCreate = ["Alger (Argel)", "Skikda", "Annaba"];
    } else if (
      cleanPod === "ALTAMIRA&VERACRUZ" ||
      cleanPod === "VERACRUZ&ALTAMIRA" ||
      cleanPod.includes("ALTAMIRA&VERACRUZ")
    ) {
      podsToCreate = ["Altamira", "Veracruz"];
    } else {
      podsToCreate = [pod];
    }

    polsToCreate.forEach((pName) => {
      podsToCreate.forEach((dName) => {
        parsedRates.push({
          sheetSource: fileName,
          mes: toProperCase(mes),
          pol: toProperCase(pName),
          pod: toProperCase(dName),
          carrier: toProperCase(carrier),
          total: Math.round(totalUSD * 100) / 100,
          gastosFob: Math.round(gastosFob * 100) / 100,
          oceanFreight,
          oceanFreightDivisa,
          gastosDestino: Math.round(gastosDestino * 100) / 100,
          baf: Math.round(baf * 100) / 100,
          thc: Math.round(thc * 100) / 100,
          lss: Math.round(lss * 100) / 100,
          otrosRecargos: Math.round(otrosRecargos * 100) / 100,
          contrato,
          nac,
          diasLibresOrigen,
          diasLibresDestino,
          validUntil,
          conceptos,
        });
      });
    });
  }

  // Final validation pass via Zod
  return parsedRates.filter((rate) => {
    const result = FreightRateSchema.safeParse(rate);
    if (!result.success) {
      console.warn(
        "Skipping invalid rate record:",
        result.error.format(),
        rate,
      );
      return false;
    }
    return true;
  });
}

