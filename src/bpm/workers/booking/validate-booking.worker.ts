import { AtlasWorker, AtlasBpmnError } from '../../utils/worker-base.js';
import { MISSING_DATA } from '../../utils/error-codes.js';
import { shipments } from '../../../db/schema.js';

interface ValidateBookingInput {
  shipperName: string;
  consigneeName: string;
  origin: string;
  destination: string;
  equipment: string;
  commodity: string;
  hsCode: string;
  grossWeightKg: number;
  volumeCbm: number;
  packageCount: number;
  incoterm: string;
}

interface ValidateBookingOutput {
  validationPassed: boolean;
  validationErrors: string[];
  referenceNumber: string;
  shipmentId: string;
}

/**
 * Validates booking request data and creates a DRAFT shipment record.
 */
class ValidateBookingWorker extends AtlasWorker<ValidateBookingInput, ValidateBookingOutput> {
  readonly taskType = 'atlas.booking.validate';

  async execute(job: any): Promise<ValidateBookingOutput> {
    const vars = job.variables;
    const errors: string[] = [];

    // Required field validation
    if (!vars.shipperName?.trim()) errors.push('Shipper name is required');
    if (!vars.consigneeName?.trim()) errors.push('Consignee name is required');
    if (!vars.origin?.trim()) errors.push('Origin port is required');
    if (!vars.destination?.trim()) errors.push('Destination port is required');
    if (!vars.equipment?.trim()) errors.push('Equipment type is required');
    if (!vars.commodity?.trim()) errors.push('Commodity description is required');
    if (!vars.hsCode?.trim()) errors.push('HS Code is required');
    if (!vars.grossWeightKg || vars.grossWeightKg <= 0) errors.push('Gross weight must be positive');
    if (!vars.volumeCbm || vars.volumeCbm <= 0) errors.push('Volume must be positive');

    // HS Code format (4-10 digits)
    if (vars.hsCode && !/^\d{4,10}$/.test(vars.hsCode)) {
      errors.push('HS Code must be 4-10 digits');
    }

    // Weight sanity check per container type
    if (vars.equipment === '20DC' && vars.grossWeightKg > 28000) {
      errors.push('20DC max payload is 28,000 kg');
    }
    if (vars.equipment === '40HC' && vars.grossWeightKg > 26500) {
      errors.push('40HC max payload is 26,500 kg');
    }

    if (errors.length > 0) {
      throw new AtlasBpmnError(MISSING_DATA, `Validation failed: ${errors.join('; ')}`);
    }

    // Generate reference number
    const seq = Date.now().toString(36).toUpperCase();
    const referenceNumber = `SHP-${seq}`;

    // Create DRAFT shipment in database
    const [newShipment] = await this.db
      .insert(shipments)
      .values({
        referenceNumber,
        referenceNumber,
        status: 'DRAFT',
      })
      .returning();

    console.log(`[ValidateBooking] Created DRAFT shipment: ${referenceNumber} (${newShipment.id})`);

    return {
      validationPassed: true,
      validationErrors: [],
      referenceNumber,
      shipmentId: newShipment.id,
    };
  }
}

export const validateBookingWorker = new ValidateBookingWorker();
