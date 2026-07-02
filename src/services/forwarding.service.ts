import { db } from '../db/client.js';
import { shipments, invoices, containers, house_containers } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export class ForwardingService {
  /**
   * Consolidate an HBL into an MBL
   */
  async consolidateShipment(masterId: number, houseId: number) {
    // 1. Verify MBL exists and is type MBL or Direct
    const master = await db.query.shipments.findFirst({
      where: eq(shipments.id, masterId)
    });

    if (!master) {
      throw new Error(`Master shipment ${masterId} not found`);
    }
    
    if (master.type === 'HBL') {
      throw new Error('Cannot attach a shipment to an HBL');
    }

    // 2. Verify HBL exists
    const house = await db.query.shipments.findFirst({
      where: eq(shipments.id, houseId)
    });

    if (!house) {
      throw new Error(`House shipment ${houseId} not found`);
    }

    if (house.type === 'MBL') {
      throw new Error('Cannot attach an MBL to another MBL');
    }

    // 3. Perform update (change master type to MBL if it was Direct, and house to HBL)
    await db.transaction(async (tx: any) => {
      if (master.type === 'Direct') {
        await tx.update(shipments)
          .set({ type: 'MBL' })
          .where(eq(shipments.id, masterId));
      }

      await tx.update(shipments)
        .set({ 
          type: 'HBL',
          parent_shipment_id: masterId 
        })
        .where(eq(shipments.id, houseId));
    });

    return { success: true, message: `Shipment ${houseId} consolidated under ${masterId}` };
  }

  /**
   * Calculate Profit & Loss for a shipment (AR vs AP invoices)
   */
  async calculateProfitAndLoss(shipmentId: number) {
    // Find all invoices associated with this shipment
    const shipmentInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.shipment_id, shipmentId),
        sql`${invoices.status} != 'Cancelled'`
      )
    });

    let totalRevenue = 0; // Accounts Receivable
    let totalCost = 0;    // Accounts Payable

    for (const inv of shipmentInvoices) {
      const amount = Number(inv.total_amount);
      if (inv.type === 'AR') {
        totalRevenue += amount;
      } else if (inv.type === 'AP') {
        totalCost += amount;
      }
    }

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      shipmentId,
      totalRevenue,
      totalCost,
      profit,
      marginPercentage: Number(margin.toFixed(2)),
      currency: shipmentInvoices.length > 0 ? shipmentInvoices[0].currency : 'USD'
    };
  }

  /**
   * Add a container to an MBL
   */
  async addContainer(shipmentId: number, containerData: any) {
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId)
    });

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    if (shipment.type === 'HBL') {
      throw new Error('Containers can only be added directly to MBL or Direct shipments');
    }

    const [newContainer] = await db.insert(containers).values({
      shipment_id: shipmentId,
      ...containerData
    }).returning();

    return newContainer;
  }
}

export const forwardingService = new ForwardingService();
