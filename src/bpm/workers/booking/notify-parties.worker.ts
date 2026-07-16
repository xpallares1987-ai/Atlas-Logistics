import { AtlasWorker } from '../../utils/worker-base.js';

interface NotifyPartiesInput {
  referenceNumber: string;
  shipperName: string;
  consigneeName: string;
  notifyParty?: string;
  origin: string;
  destination: string;
  vessel: string;
  voyage: string;
  etd: string;
  eta: string;
  selectedCarrier: string;
}

interface NotifyPartiesOutput {
  notificationsSent: number;
  notifiedParties: string[];
  notifiedAt: string;
}

/**
 * Sends notifications to all relevant parties about the shipment.
 * In production: email/SMS/EDI notifications via messaging service.
 */
class NotifyPartiesWorker extends AtlasWorker<NotifyPartiesInput, NotifyPartiesOutput> {
  readonly taskType = 'atlas.notify.parties';

  async execute(job: any): Promise<NotifyPartiesOutput> {
    const vars = job.variables;
    const parties: string[] = [];

    // Notify shipper
    if (vars.shipperName) {
      console.log(`[NotifyParties] 📧 Notifying shipper: ${vars.shipperName}`);
      parties.push(`Shipper: ${vars.shipperName}`);
    }

    // Notify consignee
    if (vars.consigneeName) {
      console.log(`[NotifyParties] 📧 Notifying consignee: ${vars.consigneeName}`);
      parties.push(`Consignee: ${vars.consigneeName}`);
    }

    // Notify party (if specified)
    if (vars.notifyParty) {
      console.log(`[NotifyParties] 📧 Notifying party: ${vars.notifyParty}`);
      parties.push(`Notify Party: ${vars.notifyParty}`);
    }

    // Notify internal ops team
    parties.push('Internal: Operations Team');
    console.log(`[NotifyParties] 📧 Notifying internal operations team`);

    // Notify carrier agent
    if (vars.selectedCarrier) {
      parties.push(`Carrier Agent: ${vars.selectedCarrier}`);
      console.log(`[NotifyParties] 📧 Notifying carrier agent: ${vars.selectedCarrier}`);
    }

    console.log(`[NotifyParties] ✓ Sent ${parties.length} notifications for ${vars.referenceNumber}`);

    return {
      notificationsSent: parties.length,
      notifiedParties: parties,
      notifiedAt: new Date().toISOString(),
    };
  }
}

export const notifyPartiesWorker = new NotifyPartiesWorker();
