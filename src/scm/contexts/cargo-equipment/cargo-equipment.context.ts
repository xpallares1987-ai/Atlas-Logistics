import { v4 as uuidv4 } from "uuid";
import { db } from "../../../db/index.js";
import {
  scmCargos,
  scmEquipmentAssignments,
} from "../../../db/schema/scm_foundation.js";
import {
  AggregateRoot,
  SecurityActorContext,
  assertInvariant,
  DEFAULT_OPERATOR_ACTOR,
} from "../../kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";

export interface GoodsSpecification {
  goodsId: string;
  description: string;
  hsCode?: string;
  countryOfOrigin?: string;
  dangerousGoods?: {
    unNumber: string;
    imoClass: string;
    packingGroup: "I" | "II" | "III";
  };
  temperatureControl?: {
    minCelsius: number;
    maxCelsius: number;
    setPointCelsius: number;
  };
}

export interface PackageEntity {
  packageId: string;
  packageType: "PALLET" | "CARTON" | "CRATE" | "DRUM" | "BAG" | "LOOSE";
  quantity: number;
  dimensionsCm: { length: number; width: number; height: number };
  grossWeightKg: number;
  volumeCbm: number;
  stackable: boolean;
  marksAndNumbers?: string;
  goods: GoodsSpecification[];
}

export class CargoAggregate extends AggregateRoot<string> {
  public shipmentId: string;
  public packages: PackageEntity[];
  public totalPackages: number;
  public totalGrossWeightKg: number;
  public totalVolumeCbm: number;
  public chargeableWeightKg: number;
  public hasDangerousGoods: boolean;
  public hasTemperatureControl: boolean;

  constructor(params: {
    id: string;
    shipmentId: string;
    packages: PackageEntity[];
    version?: number;
  }) {
    super(params.id, params.version ?? 1);
    assertInvariant(
      params.packages.length > 0,
      "cargo_equipment",
      "CARGO_REQUIRES_AT_LEAST_ONE_PACKAGE",
      "Cargo declaration must contain at least one Package item",
    );

    let pkgSum = 0;
    let weightSum = 0;
    let volumeSum = 0;
    let hasDG = false;
    let hasTemp = false;

    for (const pkg of params.packages) {
      assertInvariant(
        pkg.quantity > 0 && pkg.grossWeightKg > 0,
        "cargo_equipment",
        "PACKAGE_INVALID_DIMENSIONS_OR_WEIGHT",
        `Package '${pkg.packageId}' must have quantity > 0 and grossWeightKg > 0`,
      );
      assertInvariant(
        Array.isArray(pkg.goods) && pkg.goods.length > 0,
        "cargo_equipment",
        "PACKAGE_REQUIRES_AT_LEAST_ONE_GOODS_ITEM",
        `Package '${pkg.packageId}' must contain at least one Goods specification`,
      );

      pkgSum += pkg.quantity;
      weightSum += pkg.grossWeightKg;
      volumeSum += pkg.volumeCbm;

      for (const g of pkg.goods) {
        if (g.dangerousGoods) hasDG = true;
        if (g.temperatureControl) hasTemp = true;
      }
    }

    this.shipmentId = params.shipmentId;
    this.packages = params.packages;
    this.totalPackages = pkgSum;
    this.totalGrossWeightKg = Math.round(weightSum * 100) / 100;
    this.totalVolumeCbm = Math.round(volumeSum * 100) / 100;
    this.chargeableWeightKg = Math.max(
      this.totalGrossWeightKg,
      Math.round(this.totalVolumeCbm * 1000),
    );
    this.hasDangerousGoods = hasDG;
    this.hasTemperatureControl = hasTemp;
  }
}

export interface CargoEquipmentAllocationLink {
  cargoId: string;
  packageId?: string;
  allocatedPackages: number;
  allocatedWeightKg: number;
  allocatedVolumeCbm: number;
}

export class EquipmentAssignmentAggregate extends AggregateRoot<string> {
  public shipmentId: string;
  public consolidationId?: string;
  public equipmentCategory: "CONTAINER" | "TRAILER" | "ULD" | "SWAP_BODY";
  public isoTypeCode: string;
  public equipmentNumber: string;
  public seals: string[];
  public tareWeightKg: number;
  public maxPayloadKg: number;
  public vgmWeightKg?: number;
  public pickupPin?: string;
  public status: "ASSIGNED" | "RELEASED" | "STUFFED" | "SEALED" | "GATED_IN";
  public cargoAllocations: CargoEquipmentAllocationLink[];

  constructor(params: {
    id: string;
    shipmentId: string;
    consolidationId?: string;
    equipmentCategory: EquipmentAssignmentAggregate["equipmentCategory"];
    isoTypeCode: string;
    equipmentNumber: string;
    seals?: string[];
    tareWeightKg?: number;
    maxPayloadKg?: number;
    vgmWeightKg?: number;
    pickupPin?: string;
    status?: EquipmentAssignmentAggregate["status"];
    cargoAllocations?: CargoEquipmentAllocationLink[];
    version?: number;
  }) {
    super(params.id, params.version ?? 1);
    const tare = params.tareWeightKg ?? 3800;
    const maxPayload = params.maxPayloadKg ?? 28200;
    const allocations = params.cargoAllocations || [];

    const totalLoadedWeightKg = allocations.reduce(
      (sum, a) => sum + a.allocatedWeightKg,
      0,
    );

    assertInvariant(
      totalLoadedWeightKg <= maxPayload,
      "cargo_equipment",
      "EQUIPMENT_PAYLOAD_EXCEEDED",
      `Loaded cargo weight (${totalLoadedWeightKg} kg) exceeds equipment max payload (${maxPayload} kg) for ${params.equipmentNumber}`,
    );

    if (params.vgmWeightKg !== undefined) {
      const minExpectedVgm = tare + totalLoadedWeightKg;
      assertInvariant(
        params.vgmWeightKg >= minExpectedVgm,
        "cargo_equipment",
        "EQUIPMENT_INVALID_SOLAS_VGM",
        `SOLAS VGM (${params.vgmWeightKg} kg) cannot be less than Tare (${tare} kg) + Loaded Cargo (${totalLoadedWeightKg} kg) = ${minExpectedVgm} kg`,
      );
    }

    if (params.status === "SEALED" || params.status === "GATED_IN") {
      assertInvariant(
        Boolean(params.seals && params.seals.length > 0),
        "cargo_equipment",
        "EQUIPMENT_SEAL_REQUIRED",
        `Equipment '${params.equipmentNumber}' cannot transition to ${params.status} without at least one active seal number`,
      );
    }

    this.shipmentId = params.shipmentId;
    this.consolidationId = params.consolidationId;
    this.equipmentCategory = params.equipmentCategory;
    this.isoTypeCode = params.isoTypeCode;
    this.equipmentNumber = params.equipmentNumber;
    this.seals = params.seals || [];
    this.tareWeightKg = tare;
    this.maxPayloadKg = maxPayload;
    this.vgmWeightKg = params.vgmWeightKg;
    this.pickupPin = params.pickupPin;
    this.status = params.status || "ASSIGNED";
    this.cargoAllocations = allocations;
  }
}

export async function declareShipmentCargo(
  input: {
    shipmentId: string;
    packages: Array<{
      packageId?: string;
      packageType: PackageEntity["packageType"];
      quantity: number;
      dimensionsCm: { length: number; width: number; height: number };
      grossWeightKg: number;
      volumeCbm: number;
      stackable?: boolean;
      marksAndNumbers?: string;
      goods: Array<Omit<GoodsSpecification, "goodsId"> & { goodsId?: string }>;
    }>;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<CargoAggregate> {
  await ensureScmFoundationTables();

  const normalizedPackages: PackageEntity[] = (input.packages || []).map(
    (p) => ({
      packageId: p.packageId || `pkg_${uuidv4().substring(0, 8)}`,
      packageType: p.packageType,
      quantity: Number(p.quantity),
      dimensionsCm: p.dimensionsCm,
      grossWeightKg: Number(p.grossWeightKg),
      volumeCbm: Number(p.volumeCbm),
      stackable: p.stackable ?? true,
      marksAndNumbers: p.marksAndNumbers,
      goods: (p.goods || []).map((g) => ({
        goodsId: g.goodsId || `gds_${uuidv4().substring(0, 8)}`,
        description: g.description,
        hsCode: g.hsCode,
        countryOfOrigin: g.countryOfOrigin,
        dangerousGoods: g.dangerousGoods,
        temperatureControl: g.temperatureControl,
      })),
    }),
  );

  const cargo = new CargoAggregate({
    id: `crg_${uuidv4().substring(0, 8)}`,
    shipmentId: input.shipmentId,
    packages: normalizedPackages,
    version: 1,
  });

  cargo["recordDomainEvent"]({
    eventType: "cargo_equipment.CargoDeclared.v1",
    producerContext: "cargo_equipment",
    aggregateType: "Cargo",
    correlationId,
    actor,
    payload: {
      cargoId: cargo.id,
      shipmentId: cargo.shipmentId,
      totalPackages: cargo.totalPackages,
      totalGrossWeightKg: cargo.totalGrossWeightKg,
      totalVolumeCbm: cargo.totalVolumeCbm,
      chargeableWeightKg: cargo.chargeableWeightKg,
      hasDangerousGoods: cargo.hasDangerousGoods,
      hasTemperatureControl: cargo.hasTemperatureControl,
      packages: cargo.packages,
    },
  });

  if (cargo.hasDangerousGoods) {
    const dgItems = cargo.packages.flatMap((p) =>
      p.goods.filter((g) => Boolean(g.dangerousGoods)),
    );
    cargo["recordDomainEvent"]({
      eventType: "cargo_equipment.DangerousGoodsDeclared.v1",
      producerContext: "cargo_equipment",
      aggregateType: "Cargo",
      correlationId,
      actor,
      payload: {
        cargoId: cargo.id,
        shipmentId: cargo.shipmentId,
        dangerousGoodsItems: dgItems,
      },
    });
  }

  const now = new Date();
  await db.insert(scmCargos).values({
    id: cargo.id,
    shipmentId: cargo.shipmentId,
    totalPackages: cargo.totalPackages,
    totalGrossWeightKg: cargo.totalGrossWeightKg,
    totalVolumeCbm: cargo.totalVolumeCbm,
    chargeableWeightKg: cargo.chargeableWeightKg,
    hasDangerousGoods: cargo.hasDangerousGoods,
    hasTemperatureControl: cargo.hasTemperatureControl,
    packagesJson: JSON.stringify(cargo.packages),
    version: cargo.version,
    createdAt: now,
    updatedAt: now,
  });

  await outboxBus.enqueueEvents(cargo.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return cargo;
}

export async function assignShipmentEquipment(
  input: {
    shipmentId: string;
    consolidationId?: string;
    equipmentCategory: EquipmentAssignmentAggregate["equipmentCategory"];
    isoTypeCode: string;
    equipmentNumber: string;
    seals?: string[];
    tareWeightKg?: number;
    maxPayloadKg?: number;
    vgmWeightKg?: number;
    pickupPin?: string;
    status?: EquipmentAssignmentAggregate["status"];
    cargoAllocations?: CargoEquipmentAllocationLink[];
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<EquipmentAssignmentAggregate> {
  await ensureScmFoundationTables();

  const equip = new EquipmentAssignmentAggregate({
    id: `eqp_${uuidv4().substring(0, 8)}`,
    ...input,
    version: 1,
  });

  equip["recordDomainEvent"]({
    eventType: "cargo_equipment.EquipmentAssigned.v1",
    producerContext: "cargo_equipment",
    aggregateType: "EquipmentAssignment",
    correlationId,
    actor,
    payload: {
      equipmentAssignmentId: equip.id,
      shipmentId: equip.shipmentId,
      consolidationId: equip.consolidationId,
      equipmentCategory: equip.equipmentCategory,
      isoTypeCode: equip.isoTypeCode,
      equipmentNumber: equip.equipmentNumber,
      seals: equip.seals,
      tareWeightKg: equip.tareWeightKg,
      vgmWeightKg: equip.vgmWeightKg,
      pickupPin: equip.pickupPin,
      status: equip.status,
      cargoAllocations: equip.cargoAllocations,
    },
  });

  const now = new Date();
  await db.insert(scmEquipmentAssignments).values({
    id: equip.id,
    shipmentId: equip.shipmentId,
    consolidationId: equip.consolidationId || null,
    equipmentCategory: equip.equipmentCategory,
    isoTypeCode: equip.isoTypeCode,
    equipmentNumber: equip.equipmentNumber,
    sealsJson: JSON.stringify(equip.seals),
    tareWeightKg: equip.tareWeightKg,
    maxPayloadKg: equip.maxPayloadKg,
    vgmWeightKg: equip.vgmWeightKg ?? null,
    pickupPin: equip.pickupPin || null,
    status: equip.status,
    cargoAllocationsJson: JSON.stringify(equip.cargoAllocations),
    version: equip.version,
    createdAt: now,
    updatedAt: now,
  });

  await outboxBus.enqueueEvents(equip.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return equip;
}
