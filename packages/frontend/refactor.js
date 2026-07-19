const fs = require("fs");
let code = fs.readFileSync("app/rates/page.tsx", "utf8");

const regexes = [
  {
    find: /const getBafProjectedImpact = \(\) => {([\s\S]*?)};\n\n  const getHistoricalBAFOilCorrelationData = \(\) => {/,
    replace: `const bafProjectedImpact = React.useMemo(() => {$1}, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity]);\n\n  const getHistoricalBAFOilCorrelationData = () => {`,
  },
  {
    find: /const getHistoricalBAFOilCorrelationData = \(\) => {([\s\S]*?)};\n\n  const getHistoricalBAFNormalizedCorrelationData = \(\) => {/,
    replace: `const historicalBAFOilCorrelationData = React.useMemo(() => {$1}, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity]);\n\n  const getHistoricalBAFNormalizedCorrelationData = () => {`,
  },
  {
    find: /const getHistoricalBAFNormalizedCorrelationData = \(\) => {([\s\S]*?)};\n\n  const getHistoricalDataForRoute = \(\) => {/,
    replace: `const historicalBAFNormalizedCorrelationData = React.useMemo(() => {$1}, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity]);\n\n  const getHistoricalDataForRoute = () => {`,
  },
  {
    find: /const getHistoricalDataForRoute = \(\) => {([\s\S]*?)};\n\n  const historicalBafSurchargesOnlyData/,
    replace: `const historicalDataForRoute = React.useMemo(() => {$1}, [selectedHistoryRoute, rates, convertAmount, displayCurrency]);\n\n  const historicalBafSurchargesOnlyData`,
  },
  {
    find: /const getHistoricalBaseVsBafData = \(\) => {([\s\S]*?)};\n\n  const getVolatilityBreakdown = \(\) => {/,
    replace: `const historicalBaseVsBafData = React.useMemo(() => {$1}, [selectedHistoryRoute, rates, convertAmount, displayCurrency, bafSensitivity]);\n\n  const getVolatilityBreakdown = () => {`,
  },
  {
    find: /const getVolatilityBreakdown = \(\) => {([\s\S]*?)};\n\n  const getActiveCarriersForSelectedRoute = \(\) => {/,
    replace: `const volatilityBreakdown = React.useMemo(() => {$1}, [selectedHistoryRoute, activeCarriersForSelectedRoute, historicalDataForRoute, historicalBafSurchargesOnlyData, bafSimulatedVolume]);\n\n  const getActiveCarriersForSelectedRoute = () => {`,
  },
  {
    find: /const getActiveCarriersForSelectedRoute = \(\) => {([\s\S]*?)};\n\n  const getMonthlyBafsForRoute =/,
    replace: `const activeCarriersForSelectedRoute = React.useMemo(() => {$1}, [selectedHistoryRoute, rates]);\n\n  const getMonthlyBafsForRoute =`,
  },
  {
    find: /const getMonthlyBafsForRoute = \(route: string\) => {([\s\S]*?)};\n\n  const getRouteBafMetrics/,
    replace: `const getMonthlyBafsForRoute = React.useCallback((route: string) => {$1}, [rates, displayCurrency, convertAmount, bafSensitivity]);\n\n  const getRouteBafMetrics`,
  },
  {
    find: /const getTop3CarriersBafVolatility = \(\) => {([\s\S]*?)};\n\n  const filteredRates/,
    replace: `const top3CarriersBafVolatility = React.useMemo(() => {$1}, [selectedHistoryRoute, rates, displayCurrency, convertAmount, bafSensitivity]);\n\n  const filteredRates`,
  },
];

// Apply replacements
regexes.forEach((r) => {
  code = code.replace(r.find, r.replace);
});

// We need to be careful with ordering because some strings might be replaced in definitions if we blindly replace.
// But we actually only want to replace the exact strings like getBafProjectedImpact()

code = code.replace(/getBafProjectedImpact\(\)/g, "bafProjectedImpact");
code = code.replace(
  /getHistoricalBAFOilCorrelationData\(\)/g,
  "historicalBAFOilCorrelationData",
);
code = code.replace(
  /getHistoricalBAFNormalizedCorrelationData\(\)/g,
  "historicalBAFNormalizedCorrelationData",
);
code = code.replace(/getHistoricalDataForRoute\(\)/g, "historicalDataForRoute");
code = code.replace(
  /getHistoricalBaseVsBafData\(\)/g,
  "historicalBaseVsBafData",
);
code = code.replace(/getVolatilityBreakdown\(\)/g, "volatilityBreakdown");
code = code.replace(
  /getActiveCarriersForSelectedRoute\(\)/g,
  "activeCarriersForSelectedRoute",
);
code = code.replace(
  /getTop3CarriersBafVolatility\(\)/g,
  "top3CarriersBafVolatility",
);

fs.writeFileSync("app/rates/page.tsx", code);
console.log("Refactoring finished.");
