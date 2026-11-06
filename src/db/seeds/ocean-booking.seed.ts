import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { eq } from "drizzle-orm";

export async function seedOceanBookings(): Promise<void> {
  console.log(
    "🚢 [OCEAN-BOOKING] Sembrando detalles DCSA de reservas marítimas...",
  );

  // Verify target shipment sh_demo_01 and booking bk_demo_01
  const [demoShipment] = await db
    .select({ id: schema.shipments.id })
    .from(schema.shipments)
    .where(eq(schema.shipments.id, "sh_demo_01"))
    .limit(1);

  let targetShipmentId = demoShipment?.id;
  if (!targetShipmentId) {
    const [firstShipment] = await db
      .select({ id: schema.shipments.id })
      .from(schema.shipments)
      .limit(1);
    targetShipmentId = firstShipment?.id;
  }

  const [demoBooking] = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(eq(schema.bookings.id, "bk_demo_01"))
    .limit(1);

  let targetBookingId = demoBooking?.id;
  if (!targetBookingId) {
    const [firstBooking] = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .limit(1);
    targetBookingId = firstBooking?.id;
  }

  if (!targetShipmentId || !targetBookingId) {
    console.warn(
      "⚠️ Prerrequisitos de expedición o reserva ausentes para ocean_booking_details.",
    );
    return;
  }

  await db
    .insert(schema.oceanBookingDetails)
    .values({
      id: "bkg_sh_demo_01",
      bookingId: targetBookingId,
      shipmentId: targetShipmentId,
      carrierScac: "MSCU",
      serviceContractNumber: "SC-MED-2026-88192",
      cargoCutOff: "2026-11-12T18:00:00Z",
      vcsCutOff: "2026-11-13T12:00:00Z",
      docCutOff: "2026-11-13T16:00:00Z",
      siCutOff: "2026-11-14T10:00:00Z",
      siStatus: "CONFIRMED",
      draftBlStatus: "ISSUED",
      hazardousDeclaration: JSON.stringify({
        isHazardous: false,
        imdgClass: null,
        unNumber: null,
      }),
      specialInstructions:
        "Temperature neutral, protect from salt spray, top stowage preferred.",
      vgmJson: JSON.stringify({
        containerNumber: "MSKU9284712",
        verifiedGrossMassKg: 28450,
        tareWeightKg: 3950,
        method: "SM1",
        certifiedBy: "Atlas Weighing Station ESVLC-01",
      }),
    })
    .onConflictDoNothing();

  console.log("✅ [OCEAN-BOOKING] Detalles DCSA sembrados con éxito.");
}
