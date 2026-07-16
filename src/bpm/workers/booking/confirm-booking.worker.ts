import { AtlasWorker, AtlasBpmnError } from '../../utils/worker-base.js';
import { CARRIER_REJECTION, NO_SPACE_AVAILABLE } from '../../utils/error-codes.js';
import { shipments } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

interface ConfirmBookingInput {
  shipmentId: string;
  referenceNumber: string;
  selectedCarrier: string;
  origin: string;
  destination: string;
  equipment: string;
}

interface ConfirmBookingOutput {
  bookingConfirmed: boolean;
  bookingReference: string;
  vessel: string;
  voyage: string;
  etd: string;
  eta: string;
}

/**
 * Simulates carrier booking confirmation.
 * In production, this would call the carrier's API (Inttra, CargoSmart, etc.)
 */
class ConfirmBookingWorker extends AtlasWorker<ConfirmBookingInput, ConfirmBookingOutput> {
  readonly taskType = 'atlas.booking.confirm';

  async execute(job: any): Promise<ConfirmBookingOutput> {
    const { shipmentId, referenceNumber, selectedCarrier, origin, destination } = job.variables;

    console.log(`[ConfirmBooking] Confirming with ${selectedCarrier} for ${referenceNumber}`);

    // Simulate carrier API response
    // In production: await carrierApi.createBooking(...)
    const confirmation = this.simulateCarrierResponse(selectedCarrier, origin, destination);

    if (!confirmation.accepted) {
      throw new AtlasBpmnError(
        CARRIER_REJECTION,
        `Carrier ${selectedCarrier} rejected booking: ${confirmation.reason}`,
      );
    }

    // Update shipment status to BOOKED
    await this.db
      .update(shipments)
      .set({
        status: 'BOOKED',
        vessel: confirmation.vessel,
        voyage: confirmation.voyage,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId));

    console.log(`[ConfirmBooking] ✓ Booking confirmed: ${confirmation.bookingRef} on ${confirmation.vessel}`);

    return {
      bookingConfirmed: true,
      bookingReference: confirmation.bookingRef,
      vessel: confirmation.vessel,
      voyage: confirmation.voyage,
      etd: confirmation.etd,
      eta: confirmation.eta,
    };
  }

  private simulateCarrierResponse(carrier: string, origin: string, destination: string) {
    // 90% success rate for demo
    const accepted = Math.random() > 0.1;

    if (!accepted) {
      return {
        accepted: false,
        reason: 'No available space on preferred vessel',
        bookingRef: '', vessel: '', voyage: '', etd: '', eta: '',
      };
    }

    const vessels: Record<string, string[]> = {
      'Maersk': ['Maersk Eindhoven', 'Maersk Elba', 'Maersk Essen'],
      'MSC': ['MSC Gülsün', 'MSC Isabella', 'MSC Mina'],
      'Hapag-Lloyd': ['Berlin Express', 'Hamburg Express', 'Madrid Express'],
      'COSCO': ['COSCO Shipping Universe', 'COSCO Shipping Pisces'],
      'Evergreen': ['Ever Given', 'Ever Forward', 'Ever Glory'],
    };

    const vesselList = vessels[carrier] || ['MV Generic Vessel'];
    const vessel = vesselList[Math.floor(Math.random() * vesselList.length)];
    const voyage = `${carrier.substring(0, 3).toUpperCase()}${Math.floor(100 + Math.random() * 900)}E`;

    const etdDate = new Date();
    etdDate.setDate(etdDate.getDate() + Math.floor(5 + Math.random() * 10));
    const etaDate = new Date(etdDate);
    etaDate.setDate(etaDate.getDate() + Math.floor(20 + Math.random() * 15));

    return {
      accepted: true,
      reason: '',
      bookingRef: `BKG-${carrier.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      vessel,
      voyage,
      etd: etdDate.toISOString().split('T')[0],
      eta: etaDate.toISOString().split('T')[0],
    };
  }
}

export const confirmBookingWorker = new ConfirmBookingWorker();
