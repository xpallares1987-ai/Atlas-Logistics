import { zbc } from '../client.js';

export function startRateComparerWorker() {
  console.log('Starting Rate Comparer Worker...');
  
  zbc.createWorker({
    taskType: 'fetch-rates-task',
    taskHandler: async (job) => {
      console.log(`[Worker: fetch-rates-task] Received job ${job.key}`);
      
      const mockRates = [
        { id: 'cam-1', carrier: { name: 'Maersk' }, totalCost: 1200, baseFreightCost: 1000, currency: 'USD', origin: job.variables.origin, destination: job.variables.destination, surcharges: [] },
        { id: 'cam-2', carrier: { name: 'MSC' }, totalCost: 1150, baseFreightCost: 950, currency: 'USD', origin: job.variables.origin, destination: job.variables.destination, surcharges: [] },
        { id: 'cam-3', carrier: { name: 'Hapag-Lloyd' }, totalCost: 1250, baseFreightCost: 1050, currency: 'USD', origin: job.variables.origin, destination: job.variables.destination, surcharges: [] }
      ];
      
      console.log(`[Worker: fetch-rates-task] Found ${mockRates.length} rates. Completing job...`);
      
      return job.complete({
        rates: mockRates,
        status: 'SUCCESS'
      });
    }
  });
}
