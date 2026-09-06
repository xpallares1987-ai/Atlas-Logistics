/**
 * Dangerous Goods Emergency Response & EmS Guide Service
 * Deterministic resolution of IMO EmS Schedules, Kemler Hazard Codes, and ADR Tunnel Restrictions.
 */

export const EMS_FIRE_SCHEDULES: Record<
  string,
  { title: string; instructions: string }
> = {
  "F-A": {
    title: "General Fire Schedule",
    instructions:
      "Usar agua pulverizada en gran cantidad. No usar chorro directo si hay líquidos inflamables.",
  },
  "F-B": {
    title: "Explosive Substances and Articles",
    instructions:
      "PELIGRO DE DETONACIÓN. Evacuar inmediatamente 800m. No intentar sofocar si el fuego alcanza los bultos.",
  },
  "F-C": {
    title: "Non-Flammable Gases",
    instructions:
      "Enfriar botellas y depósitos con cortina de agua desde posición protegida.",
  },
  "F-D": {
    title: "Flammable Gases",
    instructions:
      "No apagar llama de gas a menos que se corte la fuga. Enfriar envases con abundante agua.",
  },
  "F-E": {
    title: "Non-Water-Reactive Flammable Liquids",
    instructions:
      "Usar espuma resistente al alcohol, polvo químico seco o CO2. Enfriar recipientes expuestos.",
  },
};

export const EMS_SPILLAGE_SCHEDULES: Record<
  string,
  { title: string; instructions: string }
> = {
  "S-A": {
    title: "Toxic Substances",
    instructions:
      "Usar equipo de respiración autónomo SCBA y traje de protección química. Contener derrame.",
  },
  "S-B": {
    title: "Corrosive Substances",
    instructions:
      "Neutralizar cuidadosamente con cal o bicarbonato. Evitar contacto con la piel y ojos.",
  },
  "S-E": {
    title: "Flammable Liquids, Floating on Water",
    instructions:
      "Eliminar todas las fuentes de ignición. Contener con barreras flotantes y material absorbente inerte.",
  },
  "S-I": {
    title: "Flammable Solids and Batteries",
    instructions:
      "Cubrir con arena seca o polvo de roca. Evitar uso excesivo de agua si hay riesgo de reactividad.",
  },
  "S-F": {
    title: "Water-Soluble Marine Pollutants",
    instructions:
      "Evitar vertido al alcantarillado o al mar. Emplear bombas de aspiración y tanques de retención.",
  },
};

export const KEMLER_DESCRIPTIONS: Record<string, string> = {
  "33": "Líquido muy inflamable (Punto de inflamación < 23°C)",
  "30": "Líquido inflamable (Punto de inflamación 23°C a 60°C)",
  "80": "Materia corrosiva",
  "88": "Materia muy corrosiva",
  X88: "Materia muy corrosiva que reacciona peligrosamente con el agua",
  "25": "Gas comburente (favorece el incendio)",
  "90": "Materia peligrosa para el medio ambiente / Materias diversas",
  "60": "Materia tóxica o nociva",
};

export const TUNNEL_DESCRIPTIONS: Record<string, string> = {
  B: "Prohibido el paso por túneles de categoría B, C, D y E.",
  "B/D":
    "Prohibido en cisternas en túneles B, C, D y E; otros bultos prohibidos en túneles D y E.",
  "C/E":
    "Prohibido en cisternas en túneles C, D y E; otros bultos prohibidos en túnel E.",
  "D/E":
    "Prohibido en cisternas o a granel en túneles D y E; otros bultos prohibidos en túnel E.",
  E: "Prohibido el paso por túneles de categoría E para cualquier cantidad reglamentada.",
  "-": "Sin restricciones de paso por túneles.",
};

export class DgEmergencyResponseService {
  /**
   * Resolves comprehensive emergency intervention protocols for a given substance or shipment.
   */
  public static resolveEmergencyCard(params: {
    unNumber: string;
    primaryClass: string;
    emsFireCode?: string;
    emsSpillageCode?: string;
    kemlerNumber?: string;
    adrTunnelCode?: string;
    emergencyPhone24h: string;
  }): {
    emsFireDetail: { code: string; title: string; instructions: string };
    emsSpillageDetail: { code: string; title: string; instructions: string };
    kemlerInterpretation: string;
    tunnelInterpretation: string;
    requiredPpe: string;
    primaryFireExtinguisher: string;
  } {
    const fireCode = params.emsFireCode || "F-A";
    const spillCode = params.emsSpillageCode || "S-A";
    const kemler = params.kemlerNumber || "30";
    const tunnel = params.adrTunnelCode || "D/E";

    const fireDetail = EMS_FIRE_SCHEDULES[fireCode] || {
      code: fireCode,
      title: "Standard Fire Schedule",
      instructions:
        "Enfriar recipientes con agua pulverizada desde distancia de seguridad.",
    };

    const spillDetail = EMS_SPILLAGE_SCHEDULES[spillCode] || {
      code: spillCode,
      title: "Standard Spillage Schedule",
      instructions:
        "Recoger con absorbente inerte y depositar en bidones de salvamento herméticos.",
    };

    let ppe =
      "Gafas de seguridad estancas, guantes de nitrilo/neopreno, calzado de seguridad con puntera.";
    let extinguisher =
      "Polvo químico seco polivalente ABC, espuma resistente a alcohol o CO2.";

    if (params.primaryClass.startsWith("1")) {
      ppe =
        "Equipo antichispas, protección auditiva de alta atenuación, casco y traje ignífugo.";
      extinguisher =
        "Agua pulverizada masiva (inundación). Prohibido sofocar si el fuego alcanza la masa explosiva.";
    } else if (params.primaryClass.startsWith("8")) {
      ppe =
        "Traje de protección química nivel B, pantalla facial, guantes de butilo y botas resistentes a ácidos.";
      extinguisher =
        "Polvo químico seco o niebla de agua. No aplicar chorro directo sobre ácidos concentrados.";
    } else if (params.primaryClass.startsWith("6")) {
      ppe =
        "Equipo de respiración autónoma (SCBA), traje de protección química estanco a gases.";
    }

    return {
      emsFireDetail: { code: fireCode, ...fireDetail },
      emsSpillageDetail: { code: spillCode, ...spillDetail },
      kemlerInterpretation:
        KEMLER_DESCRIPTIONS[kemler] || `Peligro químico N° ${kemler}`,
      tunnelInterpretation:
        TUNNEL_DESCRIPTIONS[tunnel] ||
        `Restricción de túnel categoría ${tunnel}`,
      requiredPpe: ppe,
      primaryFireExtinguisher: extinguisher,
    };
  }
}
