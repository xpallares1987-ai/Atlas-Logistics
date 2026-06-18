const fs = require('fs');
let code = fs.readFileSync('app/rates/page.tsx', 'utf8');

const regex = /const getRouteBafMetrics = React\.useCallback\(\(\) => \{\n\}, \[[^\]]+\]\);/;

const replacement = `const getRouteBafMetrics = React.useCallback(() => {
    const allRoutes = Array.from(new Set(rates.map(r => \`\${r.pol} → \${r.pod}\`)));
    const targetCurr = displayCurrency === 'ORIGINAL' ? 'USD' : displayCurrency;
    const oilPrices = [74.5, 78.2, 83.1, 88.4, 81.3, 85.0];

    return allRoutes.map(route => {
      const [polVal, podVal] = route.split(' → ');
      const matchingRates = rates.filter(r => r.pol === polVal && r.pod === podVal);
      const bafValues = getMonthlyBafsForRoute(route);

      if (bafValues.length === 0) {
        return {
          route,
          avgBaf: 0,
          stdDev: 0,
          deviationPercentage: 0,
          annualCost: 0,
          carriersCount: 0
        };
      }
      
      const avgBaf = bafValues.reduce((a, b) => a + b, 0) / bafValues.length;
      const variance = bafValues.reduce((a, b) => a + Math.pow(b - avgBaf, 2), 0) / bafValues.length;
      const stdDev = Math.sqrt(variance);
      const deviationPercentage = avgBaf > 0 ? (stdDev / avgBaf) * 100 : 0;
      const carriersCount = matchingRates.length;
      
      const annualCost = avgBaf * bafSimulatedVolume * 12;
      
      return {
        route,
        avgBaf,
        stdDev,
        deviationPercentage,
        annualCost,
        carriersCount
      };
    });
  }, [rates, displayCurrency, bafSensitivity, bafSimulatedVolume, getMonthlyBafsForRoute]);`;

code = code.replace(regex, replacement);
fs.writeFileSync('app/rates/page.tsx', code);
console.log('Restored getRouteBafMetrics');
