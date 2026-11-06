import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { eq } from "drizzle-orm";

export async function seedStowagePlans(): Promise<void> {
  console.log(
    "📦 [STOWAGE] Sembrando planes de estiba 3D y estabilidad de contenedores...",
  );

  // Verify target container cnt_msku_9284712 and shipment sh_demo_01
  const [demoContainer] = await db
    .select({
      id: schema.shipmentContainers.id,
      shipmentId: schema.shipmentContainers.shipmentId,
    })
    .from(schema.shipmentContainers)
    .where(eq(schema.shipmentContainers.id, "cnt_msku_9284712"))
    .limit(1);

  let targetContainerId = demoContainer?.id;
  let targetShipmentId = demoContainer?.shipmentId;

  if (!targetContainerId || !targetShipmentId) {
    const [firstContainer] = await db
      .select({
        id: schema.shipmentContainers.id,
        shipmentId: schema.shipmentContainers.shipmentId,
      })
      .from(schema.shipmentContainers)
      .limit(1);
    targetContainerId = firstContainer?.id;
    targetShipmentId = firstContainer?.shipmentId;
  }

  if (!targetContainerId || !targetShipmentId) {
    console.warn(
      "⚠️ Prerrequisitos de contenedor ausentes para container_stowage_plans.",
    );
    return;
  }

  await db
    .insert(schema.containerStowagePlans)
    .values({
      id: "stow_cnt_msku_9284712",
      containerId: targetContainerId,
      shipmentId: targetShipmentId,
      totalCargoWeightKg: 24500,
      maxPayloadKg: 28450,
      tareWeightKg: 3950,
      volumeUtilizationPercent: 84.6,
      weightUtilizationPercent: 86.1,
      centerOfGravityJson: JSON.stringify({
        x: 0.04,
        y: 1.15,
        z: 0.12,
        deviationMm: 38,
        isBalanced: true,
      }),
      axleLoadDistributionJson: JSON.stringify({
        steerAxleKg: 5800,
        driveAxleKg: 16400,
        trailerTridemKg: 21500,
        gcvwKg: 43700,
        isCompliant: true,
        maxLegalGcvwKg: 44000,
      }),
      stabilityCertified: true,
      certifiedBy: "Capt. Martin Vance (Senior Marine Surveyor)",
      certifiedAt: Math.floor(Date.now() / 1000) - 43200,
      stowageSequenceJson: JSON.stringify([
        {
          id: "cargo_item_01",
          label: "Tooling Unit Alpha",
          x: -0.6,
          y: 0.8,
          z: -4.2,
          width: 1.2,
          height: 1.4,
          depth: 1.2,
          weight: 4200,
          color: "#3b82f6",
        },
        {
          id: "cargo_item_02",
          label: "Precision Lathe B",
          x: 0.6,
          y: 0.8,
          z: -4.2,
          width: 1.2,
          height: 1.4,
          depth: 1.2,
          weight: 4200,
          color: "#60a5fa",
        },
        {
          id: "cargo_item_03",
          label: "Hydraulic Assembly C",
          x: -0.6,
          y: 0.8,
          z: 0.0,
          width: 1.2,
          height: 1.5,
          depth: 1.4,
          weight: 4800,
          color: "#4ade80",
        },
        {
          id: "cargo_item_04",
          label: "Hydraulic Assembly D",
          x: 0.6,
          y: 0.8,
          z: 0.0,
          width: 1.2,
          height: 1.5,
          depth: 1.4,
          weight: 4800,
          color: "#4ade80",
        },
        {
          id: "cargo_item_05",
          label: "Robotic Arms Pallet E",
          x: 0.0,
          y: 0.7,
          z: 3.8,
          width: 2.1,
          height: 1.3,
          depth: 1.5,
          weight: 6500,
          color: "#fbbf24",
        },
      ]),
    })
    .onConflictDoNothing();

  console.log("✅ [STOWAGE] Plan de estiba y estabilidad sembrados con éxito.");
}
