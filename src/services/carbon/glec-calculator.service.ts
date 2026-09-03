export type TransportMode =
  | "OCEAN_CONTAINER"
  | "OCEAN_BULK"
  | "AIR_FREIGHT"
  | "AIR_BELLY"
  | "ROAD_DIESEL"
  | "ROAD_HVO"
  | "ROAD_EV"
  | "RAIL_ELECTRIC"
  | "RAIL_DIESEL";

export interface GlecEmissionFactors {
  wtw: number; // Well-to-Wheel (Total gCO2e / t-km)
  ttw: number; // Tank-to-Wheel (Direct operational combustion gCO2e / t-km)
  wtt: number; // Well-to-Tank (Upstream energy production & supply gCO2e / t-km)
  description: string;
}

// Official GLEC Framework v3 / ISO 14083 standard benchmark emission factors
export const GLEC_EMISSION_FACTORS: Record<TransportMode, GlecEmissionFactors> =
  {
    OCEAN_CONTAINER: {
      wtw: 11.8,
      ttw: 9.7,
      wtt: 2.1,
      description: "Portacontenedores Ultra-Large (15,000+ TEU) con VLSFO",
    },
    OCEAN_BULK: {
      wtw: 8.5,
      ttw: 7.0,
      wtt: 1.5,
      description: "Granelero / Bulk Carrier Capesize (100k+ DWT)",
    },
    AIR_FREIGHT: {
      wtw: 602.0,
      ttw: 510.0,
      wtt: 92.0,
      description: "Avión Carguero Puro (Long-Haul Freighter B777F / A330F)",
    },
    AIR_BELLY: {
      wtw: 430.0,
      ttw: 365.0,
      wtt: 65.0,
      description: "Bodega de Avión Comercial de Pasajeros (Belly Cargo)",
    },
    ROAD_DIESEL: {
      wtw: 62.0,
      ttw: 51.5,
      wtt: 10.5,
      description: "Camión Articulado Diésel Euro 6 (40t GVW)",
    },
    ROAD_HVO: {
      wtw: 16.5,
      ttw: 3.2,
      wtt: 13.3,
      description:
        "Camión Pesado con HVO100 (Aceite Vegetal Hidrotratado 100% Renovable)",
    },
    ROAD_EV: {
      wtw: 18.2,
      ttw: 0.0,
      wtt: 18.2,
      description:
        "Camión Eléctrico a Batería (BEV con Mix Energético Red Europea)",
    },
    RAIL_ELECTRIC: {
      wtw: 14.5,
      ttw: 0.0,
      wtt: 14.5,
      description: "Ferrocarril de Mercancías Eléctrico (Mix de Red UE)",
    },
    RAIL_DIESEL: {
      wtw: 28.0,
      ttw: 23.2,
      wtt: 4.8,
      description: "Ferrocarril de Tracción Diésel",
    },
  };

export interface LegCalculationInput {
  originName: string;
  destinationName: string;
  mode: TransportMode;
  distanceKm: number;
  weightKg: number;
}

export interface LegCalculationResult {
  legOrder: number;
  originName: string;
  destinationName: string;
  mode: TransportMode;
  distanceKm: number;
  weightTonnes: number;
  tonneKm: number;
  factors: GlecEmissionFactors;
  legTco2eWtw: number;
  legTco2eTtw: number;
  legTco2eWtt: number;
}

export interface MultimodalCalculationResult {
  totalDistanceKm: number;
  totalWeightTonnes: number;
  totalTonneKm: number;
  totalTco2eWtw: number;
  totalTco2eTtw: number;
  totalTco2eWtt: number;
  carbonIntensityGco2ePerTkm: number;
  legs: LegCalculationResult[];
}

export interface GreenAlternativeOption {
  alternativeMode: TransportMode;
  modeName: string;
  simulatedTco2eWtw: number;
  savedTco2e: number;
  reductionPercentage: number;
  description: string;
}

export class GlecCalculatorService {
  /**
   * Calculates carbon emissions for a single journey leg
   */
  public static calculateLeg(
    input: LegCalculationInput,
    legOrder: number = 1,
  ): LegCalculationResult {
    const factors =
      GLEC_EMISSION_FACTORS[input.mode] || GLEC_EMISSION_FACTORS.ROAD_DIESEL;
    const weightTonnes = input.weightKg / 1000;
    const tonneKm = weightTonnes * input.distanceKm;

    // tCO2e = (t-km * gCO2e/t-km) / 1,000,000
    const legTco2eWtw = Number(
      ((tonneKm * factors.wtw) / 1_000_000).toFixed(4),
    );
    const legTco2eTtw = Number(
      ((tonneKm * factors.ttw) / 1_000_000).toFixed(4),
    );
    const legTco2eWtt = Number(
      ((tonneKm * factors.wtt) / 1_000_000).toFixed(4),
    );

    return {
      legOrder,
      originName: input.originName,
      destinationName: input.destinationName,
      mode: input.mode,
      distanceKm: input.distanceKm,
      weightTonnes: Number(weightTonnes.toFixed(3)),
      tonneKm: Number(tonneKm.toFixed(2)),
      factors,
      legTco2eWtw,
      legTco2eTtw,
      legTco2eWtt,
    };
  }

  /**
   * Calculates total multimodal journey Scope 3 emissions according to GLEC / ISO 14083
   */
  public static calculateJourney(
    legs: LegCalculationInput[],
  ): MultimodalCalculationResult {
    if (!legs || legs.length === 0) {
      throw new Error(
        "At least one journey leg is required for carbon calculation",
      );
    }

    let totalDistanceKm = 0;
    let totalTonneKm = 0;
    let totalTco2eWtw = 0;
    let totalTco2eTtw = 0;
    let totalTco2eWtt = 0;
    const totalWeightTonnes = (legs[0]?.weightKg || 0) / 1000;

    const calculatedLegs = legs.map((leg, index) => {
      const result = this.calculateLeg(leg, index + 1);
      totalDistanceKm += result.distanceKm;
      totalTonneKm += result.tonneKm;
      totalTco2eWtw += result.legTco2eWtw;
      totalTco2eTtw += result.legTco2eTtw;
      totalTco2eWtt += result.legTco2eWtt;
      return result;
    });

    const carbonIntensityGco2ePerTkm =
      totalTonneKm > 0
        ? Number(((totalTco2eWtw * 1_000_000) / totalTonneKm).toFixed(2))
        : 0;

    return {
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalWeightTonnes: Number(totalWeightTonnes.toFixed(3)),
      totalTonneKm: Number(totalTonneKm.toFixed(2)),
      totalTco2eWtw: Number(totalTco2eWtw.toFixed(4)),
      totalTco2eTtw: Number(totalTco2eTtw.toFixed(4)),
      totalTco2eWtt: Number(totalTco2eWtt.toFixed(4)),
      carbonIntensityGco2ePerTkm,
      legs: calculatedLegs,
    };
  }

  /**
   * Simulates eco-friendly corridors (Green Routes) comparing sustainable alternatives
   */
  public static generateGreenAlternatives(
    legs: LegCalculationInput[],
  ): GreenAlternativeOption[] {
    const baseJourney = this.calculateJourney(legs);
    const baseWtw = baseJourney.totalTco2eWtw;
    const alternatives: GreenAlternativeOption[] = [];

    // Alternative 1: Switch road diesel legs to HVO100 Renewable Biofuel
    const hasRoadDiesel = legs.some((l) => l.mode === "ROAD_DIESEL");
    if (hasRoadDiesel) {
      const hvoLegs = legs.map((l) =>
        l.mode === "ROAD_DIESEL"
          ? { ...l, mode: "ROAD_HVO" as TransportMode }
          : l,
      );
      const hvoJourney = this.calculateJourney(hvoLegs);
      const saved = Number((baseWtw - hvoJourney.totalTco2eWtw).toFixed(4));
      const pct = Number(((saved / baseWtw) * 100).toFixed(1));

      alternatives.push({
        alternativeMode: "ROAD_HVO",
        modeName: "Corredor HVO100 (Biodiésel 100% Renovable)",
        simulatedTco2eWtw: hvoJourney.totalTco2eWtw,
        savedTco2e: saved,
        reductionPercentage: pct,
        description:
          "Sustitución de transporte rodado convencional por biocombustible renovable HVO100 sin modificar infraestructura.",
      });
    }

    // Alternative 2: Modal Shift from Road to Electric Rail (Intermodal)
    if (hasRoadDiesel) {
      const railLegs = legs.map((l) =>
        l.mode === "ROAD_DIESEL"
          ? { ...l, mode: "RAIL_ELECTRIC" as TransportMode }
          : l,
      );
      const railJourney = this.calculateJourney(railLegs);
      const saved = Number((baseWtw - railJourney.totalTco2eWtw).toFixed(4));
      const pct = Number(((saved / baseWtw) * 100).toFixed(1));

      alternatives.push({
        alternativeMode: "RAIL_ELECTRIC",
        modeName: "Transferencia Modal a Ferrocarril Eléctrico",
        simulatedTco2eWtw: railJourney.totalTco2eWtw,
        savedTco2e: saved,
        reductionPercentage: pct,
        description:
          "Uso de autopista ferroviaria electrificada para los tramos terrestres de media y larga distancia.",
      });
    }

    // Alternative 3: Electric Fleet (BEV) for First/Last Mile
    if (hasRoadDiesel) {
      const evLegs = legs.map((l) =>
        l.mode === "ROAD_DIESEL"
          ? { ...l, mode: "ROAD_EV" as TransportMode }
          : l,
      );
      const evJourney = this.calculateJourney(evLegs);
      const saved = Number((baseWtw - evJourney.totalTco2eWtw).toFixed(4));
      const pct = Number(((saved / baseWtw) * 100).toFixed(1));

      alternatives.push({
        alternativeMode: "ROAD_EV",
        modeName: "Flota Eléctrica Cero Emisiones Locales (BEV)",
        simulatedTco2eWtw: evJourney.totalTco2eWtw,
        savedTco2e: saved,
        reductionPercentage: pct,
        description:
          "Vehículos 100% eléctricos de batería para la distribución capilar y conexiones portuarias.",
      });
    }

    return alternatives;
  }
}
