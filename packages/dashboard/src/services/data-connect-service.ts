import { DataConnect } from 'firebase/data-connect';

export class SCMDataConnectService {
  constructor(_dc: DataConnect) {}

  async listShipments() {
    return [];
  }

  async createShipment(_trackingNumber: string, _origin: string, _destination: string) {
    // Retain mock functionality since schema was purged
  }
}
