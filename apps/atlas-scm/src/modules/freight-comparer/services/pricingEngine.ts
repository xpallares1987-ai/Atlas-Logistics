import { FreightRate, SimulatedFreightRate, SurchargeRule } from "../types";

export function applySurcharges(
  rates: FreightRate[],
  rules: SurchargeRule[],
): SimulatedFreightRate[] {
  const activeRules = rules.filter((r) => r.active);

  if (activeRules.length === 0) {
    return rates.map((rate) => ({
      ...rate,
      originalTotal: rate.total,
      originalOceanFreight: rate.oceanFreight,
      originalOtrosRecargos: rate.otrosRecargos || 0,
      originalBaf: rate.baf || 0,
      originalThc: rate.thc || 0,
      originalLss: rate.lss || 0,
      appliedSurcharges: [],
    }));
  }

  return rates.map((rate) => {
    let simulatedOcean = rate.oceanFreight;
    let simulatedBaf = rate.baf || 0;
    let simulatedOtros = rate.otrosRecargos || 0;

    const appliedSurcharges: { name: string; amount: number }[] = [];

    activeRules.forEach((rule) => {
      let calculatedAmount = 0;

      switch (rule.calcMethod) {
        case "PERCENTAGE":
          calculatedAmount = simulatedOcean * (rule.amount / 100);
          break;
        case "PER_TEU":
        case "FLAT_PER_BL":
          // Assuming 1 container/TEU per row for this MVP
          calculatedAmount = rule.amount;
          break;
      }

      appliedSurcharges.push({ name: rule.name, amount: calculatedAmount });

      switch (rule.type) {
        case "BAF":
          simulatedBaf += calculatedAmount;
          break;
        case "CAF":
          simulatedOcean += calculatedAmount;
          break;
        default:
          simulatedOtros += calculatedAmount;
      }
    });

    const newTotal =
      simulatedOcean +
      (rate.gastosFob || 0) +
      (rate.gastosDestino || 0) +
      simulatedBaf +
      (rate.thc || 0) +
      (rate.lss || 0) +
      simulatedOtros;

    return {
      ...rate,
      originalTotal: rate.total,
      originalOceanFreight: rate.oceanFreight,
      originalOtrosRecargos: rate.otrosRecargos || 0,
      originalBaf: rate.baf || 0,
      originalThc: rate.thc || 0,
      originalLss: rate.lss || 0,

      oceanFreight: simulatedOcean,
      baf: simulatedBaf,
      otrosRecargos: simulatedOtros,
      total: newTotal,
      appliedSurcharges,
    };
  });
}
