import { eventBus } from '../../core/event-bus.js';

export class RateDataService {
  private worker: Worker;
  private isProcessing: boolean = false;
  private ratesCache: any[] = [];

  constructor() {
    this.worker = new Worker(new URL('../workers/decrypt-worker.ts', import.meta.url), { type: 'module' });
    this.setupWorkerListener();
  }

  private setupWorkerListener() {
    this.worker.onmessage = (e: MessageEvent) => {
      this.isProcessing = false;
      const { status, data, error } = e.data;

      if (status === 'success') {
        this.ratesCache = data;
        eventBus.publish('RATES_DECRYPTED', { count: this.ratesCache.length });
        console.log(`Successfully decrypted ${this.ratesCache.length} rate records.`);
      } else {
        console.error('Decryption failed in worker:', error);
        eventBus.publish('RATES_DECRYPTION_ERROR', { error });
      }
    };
  }

  public loadAndDecryptRates(encryptedPayload: string, keyString: string) {
    if (this.isProcessing) {
      console.warn('Worker is already processing a payload.');
      return;
    }
    
    this.isProcessing = true;
    this.worker.postMessage({ encryptedPayload, keyString });
  }

  public getCachedRates() {
    return this.ratesCache;
  }
}

export const rateDataService = new RateDataService();