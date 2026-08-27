export type TransportConvention =
  | "HAGUE_VISBY"
  | "HAMBURG"
  | "MONTREAL_1999"
  | "CMR"
  | "CIM_COTIF"
  | "MULTIMODAL_FIATA";

export interface LiabilityCalculationInput {
  convention: TransportConvention;
  transportMode: "OCEAN" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";
  damagedWeightKg: number;
  packagesCount?: number;
  claimedAmount: number;
  claimedCurrency?: string;
  incidentDate: Date | string;
  noticeDate?: Date | string;
  deliveryDate?: Date | string;
  sdrToEurRate?: number;
}

export interface StatutoryLiabilityResult {
  convention: TransportConvention;
  conventionName: string;
  statutorySdrRatePerKg: number;
  packageSdrRate?: number;
  sdrToEurRate: number;
  totalStatutoryLimitSdr: number;
  totalStatutoryLimitEur: number;
  claimedAmountEur: number;
  carrierMaxLiabilityEur: number; // min(claimedAmount, totalStatutoryLimitEur)
  isLiabilityCapped: boolean; // true if statutory limit is lower than claimed amount
  lossExceedsLimitEur: number; // claimedAmount - totalStatutoryLimitEur if > 0
  timeBarDays: number;
  timeBarExpirationDate: Date;
  noticeDeadlineDays: number;
  noticeExpired: boolean;
  timeBarExpired: boolean;
  legalStatus: "IN_TIME" | "NOTICE_DELAYED" | "TIME_BARRED";
  legalRecommendation: string;
}

export class CarrierLiabilityService {
  public static readonly DEFAULT_SDR_TO_EUR = 1.245; // 1 SDR / DEG ≈ 1.2450 EUR
  public static readonly DEFAULT_SDR_TO_USD = 1.33; // 1 SDR / DEG ≈ 1.3300 USD

  /**
   * Deterministically calculates statutory carrier liability limits and time-bar deadlines under international conventions
   */
  public static calculateStatutoryLiability(
    input: LiabilityCalculationInput,
  ): StatutoryLiabilityResult {
    const {
      convention,
      damagedWeightKg,
      packagesCount = 1,
      claimedAmount,
      incidentDate,
      noticeDate = new Date(),
      deliveryDate,
      sdrToEurRate = this.DEFAULT_SDR_TO_EUR,
    } = input;

    const incDate = new Date(incidentDate);
    const notDate = new Date(noticeDate);
    const delDate = deliveryDate ? new Date(deliveryDate) : incDate;

    let conventionName = "";
    let sdrRatePerKg = 0;
    let packageSdr = 0;
    let totalSdr = 0;
    let timeBarDays = 365; // default 1 year
    let noticeDeadlineDays = 7;

    switch (convention) {
      case "HAGUE_VISBY":
        conventionName =
          "Reglas de La Haya-Visby (Protocolo 1968 / 1979) - Marítimo";
        sdrRatePerKg = 2.0;
        packageSdr = 666.67;
        const weightSdrHV = damagedWeightKg * sdrRatePerKg;
        const packageSdrHV = packagesCount * packageSdr;
        totalSdr = Math.max(weightSdrHV, packageSdrHV);
        timeBarDays = 365; // 1 year
        noticeDeadlineDays = 3; // 3 days for non-apparent
        break;

      case "HAMBURG":
        conventionName = "Reglas de Hamburgo (1978) - Marítimo";
        sdrRatePerKg = 2.5;
        packageSdr = 835.0;
        const weightSdrHam = damagedWeightKg * sdrRatePerKg;
        const packageSdrHam = packagesCount * packageSdr;
        totalSdr = Math.max(weightSdrHam, packageSdrHam);
        timeBarDays = 730; // 2 years
        noticeDeadlineDays = 15;
        break;

      case "MONTREAL_1999":
        conventionName = "Convenio de Montreal 1999 (Revisión ICAO) - Aéreo";
        sdrRatePerKg = 22.0;
        totalSdr = damagedWeightKg * sdrRatePerKg;
        timeBarDays = 730; // 2 years (Art. 35)
        noticeDeadlineDays = 14; // 14 days damage (Art. 31)
        break;

      case "CMR":
        conventionName =
          "Convenio CMR (Ginebra 1956 / Protocolo 1978) - Carretera";
        sdrRatePerKg = 8.33;
        totalSdr = damagedWeightKg * sdrRatePerKg;
        timeBarDays = 365; // 1 year (Art. 32)
        noticeDeadlineDays = 7; // 7 days non-apparent
        break;

      case "CIM_COTIF":
        conventionName = "Convenio CIM / COTIF (1999) - Ferrocarril";
        sdrRatePerKg = 17.0;
        totalSdr = damagedWeightKg * sdrRatePerKg;
        timeBarDays = 365;
        noticeDeadlineDays = 7;
        break;

      case "MULTIMODAL_FIATA":
        conventionName = "Reglas UNCTAD / FIATA - Transporte Multimodal";
        sdrRatePerKg = input.transportMode === "OCEAN" ? 2.0 : 8.33;
        totalSdr = damagedWeightKg * sdrRatePerKg;
        timeBarDays = 270; // 9 months
        noticeDeadlineDays = 6;
        break;
    }

    const totalStatutoryLimitEur = Number((totalSdr * sdrToEurRate).toFixed(2));
    const claimedAmountEur = Number(claimedAmount.toFixed(2));
    const carrierMaxLiabilityEur = Math.min(
      claimedAmountEur,
      totalStatutoryLimitEur,
    );
    const isLiabilityCapped = totalStatutoryLimitEur < claimedAmountEur;
    const lossExceedsLimitEur = isLiabilityCapped
      ? Number((claimedAmountEur - totalStatutoryLimitEur).toFixed(2))
      : 0;

    // Time-bar expiration calculation
    const timeBarExpirationDate = new Date(
      delDate.getTime() + timeBarDays * 86400000,
    );
    const now = new Date();
    const timeBarExpired = now > timeBarExpirationDate;

    // Notice deadline calculation
    const noticeExpirationDate = new Date(
      delDate.getTime() + noticeDeadlineDays * 86400000,
    );
    const noticeExpired = notDate > noticeExpirationDate;

    let legalStatus: "IN_TIME" | "NOTICE_DELAYED" | "TIME_BARRED" = "IN_TIME";
    let legalRecommendation = "";

    if (timeBarExpired) {
      legalStatus = "TIME_BARRED";
      legalRecommendation = `ACCIÓN PRESCRITA: Ha vencido el plazo estatutario de caducidad (${timeBarDays} días) bajo ${convention}. La acción legal contra el porteador no es viable.`;
    } else if (noticeExpired) {
      legalStatus = "NOTICE_DELAYED";
      legalRecommendation = `PROTESTA FUERA DE PLAZO: La reserva se notificó superando los ${noticeDeadlineDays} días reglamentarios. Se presume entrega en buen estado, requiriendo prueba pericial directa de culpa del porteador.`;
    } else {
      legalStatus = "IN_TIME";
      legalRecommendation = isLiabilityCapped
        ? `RECOBRO LIMITADO POR DEG: La responsabilidad del porteador está legalmente limitada a ${totalStatutoryLimitEur.toFixed(
            2,
          )} € (${totalSdr.toFixed(
            2,
          )} DEG). La diferencia de ${lossExceedsLimitEur.toFixed(
            2,
          )} € debe ser asumida por la póliza de seguro de carga (First-Party Cargo Insurance).`
        : `RECOBRO ÍNTEGRO: El límite legal de ${totalStatutoryLimitEur.toFixed(
            2,
          )} € cubre el 100% del daño reclamado (${claimedAmountEur.toFixed(
            2,
          )} €). Proceder con reclamación formal contra el porteador.`;
    }

    return {
      convention,
      conventionName,
      statutorySdrRatePerKg: sdrRatePerKg,
      packageSdrRate: packageSdr > 0 ? packageSdr : undefined,
      sdrToEurRate,
      totalStatutoryLimitSdr: Number(totalSdr.toFixed(2)),
      totalStatutoryLimitEur,
      claimedAmountEur,
      carrierMaxLiabilityEur,
      isLiabilityCapped,
      lossExceedsLimitEur,
      timeBarDays,
      timeBarExpirationDate,
      noticeDeadlineDays,
      noticeExpired,
      timeBarExpired,
      legalStatus,
      legalRecommendation,
    };
  }
}
