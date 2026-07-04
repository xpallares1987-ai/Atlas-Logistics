import { parentPort, workerData } from 'worker_threads';

interface RateData {
  carrierId: number;
  originPort: string;
  destinationPort: string;
  currency: string;
  baseRate: number;
  validFrom: string;
  validTo: string;
}

const processBatch = (rates: RateData[]) => {
  const processedAt = new Date().toISOString();
  
  return rates.map(rate => ({
    carrierId: rate.carrierId,
    originPort: rate.originPort,
    destinationPort: rate.destinationPort,
    currency: rate.currency,
    baseRate: Number(rate.baseRate).toFixed(2),
    validFrom: rate.validFrom,
    validTo: rate.validTo,
    processedAt
  }));
};

if (parentPort) {
  try {
    const result = processBatch(workerData.rates);
    parentPort.postMessage({ status: 'success', data: result });
  } catch (error) {
    parentPort.postMessage({ status: 'error', error: (error as Error).message });
  }
}