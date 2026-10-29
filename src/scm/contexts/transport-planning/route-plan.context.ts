import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmRoutePlans,
  scmRouteVersions,
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

export interface RouteStopNode {
  stopId: string;
  sequenceNo: number;
  locationId: string;
  locationName?: string;
  stopRole:
    | "PICKUP"
    | "CONSOLIDATION_HUB"
    | "POL"
    | "TRANSSHIPMENT"
    | "POD"
    | "DECONSOLIDATION_HUB"
    | "DELIVERY";
  cutOffs?: {
    siCutOffAt?: string;
    vgmCutOffAt?: string;
    gateInCutOffAt?: string;
  };
}

export interface TransportLegSpec {
  legId: string;
  sequenceNo: number;
  originStopId: string;
  destinationStopId: string;
  originLocode: string;
  destinationLocode: string;
  mode: "SEA" | "AIR" | "ROAD" | "RAIL";
  legCategory: "PRE_CARRIAGE" | "MAIN_CARRIAGE" | "ON_CARRIAGE";
  carrierName: string;
  vesselOrFlight?: string;
  voyageNumber?: string;
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  consolidationId?: string;
}

export interface RouteVersionEntity {
  versionId: string;
  versionNo: number;
  status: "DRAFT" | "PUBLISHED" | "SUPERSEDED";
  changeReason?: string;
  stops: RouteStopNode[];
  legs: TransportLegSpec[];
  publishedAt: string;
}

export class RoutePlanAggregate extends AggregateRoot<string> {
  public shipmentId: string;
  public activeVersionNo: number;
  public status: "DRAFT" | "PUBLISHED";
  public versions: RouteVersionEntity[];

  constructor(params: {
    id: string;
    shipmentId: string;
    activeVersionNo: number;
    status?: "DRAFT" | "PUBLISHED";
    versions: RouteVersionEntity[];
    version?: number;
  }) {
    super(params.id, params.version ?? 1);
    this.shipmentId = params.shipmentId;
    this.activeVersionNo = params.activeVersionNo;
    this.status = params.status || "PUBLISHED";
    this.versions = params.versions;
  }

  public static validateRouteTopologyAndSchedule(
    stops: RouteStopNode[],
    legs: TransportLegSpec[],
  ): void {
    assertInvariant(
      stops.length >= 2,
      "transport_planning",
      "ROUTE_MIN_TWO_STOPS",
      "A RouteVersion requires at least 2 stop nodes (origin and destination)",
    );
    assertInvariant(
      legs.length >= 1,
      "transport_planning",
      "ROUTE_MIN_ONE_LEG",
      "A RouteVersion requires at least 1 transport leg",
    );

    const sortedLegs = [...legs].sort((a, b) => a.sequenceNo - b.sequenceNo);

    for (let i = 0; i < sortedLegs.length; i++) {
      const leg = sortedLegs[i];
      const depTime = new Date(leg.plannedDepartureAt).getTime();
      const arrTime = new Date(leg.plannedArrivalAt).getTime();

      assertInvariant(
        !Number.isNaN(depTime) && !Number.isNaN(arrTime) && depTime < arrTime,
        "transport_planning",
        "ROUTE_LEG_INVALID_CHRONOLOGY",
        `Leg #${leg.sequenceNo} (${leg.originLocode} -> ${leg.destinationLocode}) must have plannedDepartureAt strictly before plannedArrivalAt`,
      );

      if (i > 0) {
        const prevLeg = sortedLegs[i - 1];
        assertInvariant(
          leg.originStopId === prevLeg.destinationStopId &&
            leg.originLocode === prevLeg.destinationLocode,
          "transport_planning",
          "ROUTE_DISCONNECTED_TOPOLOGY",
          `Topological discontinuity between Leg #${prevLeg.sequenceNo} (ends at ${prevLeg.destinationStopId}/${prevLeg.destinationLocode}) and Leg #${leg.sequenceNo} (starts at ${leg.originStopId}/${leg.originLocode})`,
        );

        const prevArrTime = new Date(prevLeg.plannedArrivalAt).getTime();
        assertInvariant(
          depTime >= prevArrTime,
          "transport_planning",
          "ROUTE_OVERLAPPING_LEG_SCHEDULE",
          `Chronological overlap: Leg #${leg.sequenceNo} departs (${leg.plannedDepartureAt}) before Leg #${prevLeg.sequenceNo} arrives (${prevLeg.plannedArrivalAt})`,
        );
      }
    }
  }

  public publishNewRouteVersion(
    params: {
      stops: RouteStopNode[];
      legs: TransportLegSpec[];
      changeReason?: string;
    },
    actor: SecurityActorContext,
    correlationId: string,
  ): RouteVersionEntity {
    RoutePlanAggregate.validateRouteTopologyAndSchedule(
      params.stops,
      params.legs,
    );

    // Mark all previously published versions as SUPERSEDED (immutable history)
    for (const v of this.versions) {
      if (v.status === "PUBLISHED") {
        v.status = "SUPERSEDED";
      }
    }

    const nextVersionNo =
      this.versions.length === 0
        ? 1
        : Math.max(...this.versions.map((v) => v.versionNo)) + 1;

    const newVersion: RouteVersionEntity = {
      versionId: `rv_${uuidv4().substring(0, 8)}`,
      versionNo: nextVersionNo,
      status: "PUBLISHED",
      changeReason: params.changeReason || "Initial route plan publication",
      stops: params.stops,
      legs: params.legs,
      publishedAt: new Date().toISOString(),
    };

    this.versions.push(newVersion);
    this.activeVersionNo = nextVersionNo;
    this.status = "PUBLISHED";
    this.incrementVersion();

    this.recordDomainEvent({
      eventType: "transport_planning.RouteVersionPublished.v1",
      producerContext: "transport_planning",
      aggregateType: "RoutePlan",
      correlationId,
      actor,
      payload: {
        routePlanId: this.id,
        shipmentId: this.shipmentId,
        versionId: newVersion.versionId,
        versionNo: newVersion.versionNo,
        changeReason: newVersion.changeReason,
        stops: newVersion.stops,
        legs: newVersion.legs,
        publishedAt: newVersion.publishedAt,
      },
    });

    return newVersion;
  }
}

export async function publishShipmentRoutePlan(
  input: {
    shipmentId: string;
    changeReason?: string;
    stops: RouteStopNode[];
    legs: Array<Omit<TransportLegSpec, "legId"> & { legId?: string }>;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<RoutePlanAggregate> {
  await ensureScmFoundationTables();

  const normalizedLegs: TransportLegSpec[] = input.legs.map((l, idx) => ({
    ...l,
    legId: l.legId || `leg_${uuidv4().substring(0, 8)}`,
    sequenceNo: l.sequenceNo ?? idx + 1,
  }));

  const existingPlanRows = await db
    .select()
    .from(scmRoutePlans)
    .where(eq(scmRoutePlans.shipmentId, input.shipmentId))
    .limit(1);

  const now = new Date();

  if (existingPlanRows.length === 0) {
    const planId = `rtp_${uuidv4().substring(0, 8)}`;
    const plan = new RoutePlanAggregate({
      id: planId,
      shipmentId: input.shipmentId,
      activeVersionNo: 0,
      versions: [],
      version: 0,
    });

    const v1 = plan.publishNewRouteVersion(
      {
        stops: input.stops,
        legs: normalizedLegs,
        changeReason: input.changeReason || "Initial route plan v1",
      },
      actor,
      correlationId,
    );

    await db.insert(scmRoutePlans).values({
      id: plan.id,
      shipmentId: plan.shipmentId,
      activeVersionNo: plan.activeVersionNo,
      status: plan.status,
      version: plan.version,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(scmRouteVersions).values({
      id: v1.versionId,
      routePlanId: plan.id,
      shipmentId: plan.shipmentId,
      versionNo: v1.versionNo,
      status: v1.status,
      changeReason: v1.changeReason || null,
      stopsJson: JSON.stringify(v1.stops),
      legsJson: JSON.stringify(v1.legs),
      publishedAt: new Date(v1.publishedAt),
    });

    await outboxBus.enqueueEvents(plan.pullDomainEvents());
    await outboxBus.relayPendingEvents();

    return plan;
  }

  // Existing RoutePlan: load all historical versions, supersede current, and publish v+1
  const planRow = existingPlanRows[0];
  const versionRows = await db
    .select()
    .from(scmRouteVersions)
    .where(eq(scmRouteVersions.routePlanId, planRow.id));

  const plan = new RoutePlanAggregate({
    id: planRow.id,
    shipmentId: planRow.shipmentId,
    activeVersionNo: planRow.activeVersionNo,
    status: planRow.status as "DRAFT" | "PUBLISHED",
    versions: versionRows.map((vr) => ({
      versionId: vr.id,
      versionNo: vr.versionNo,
      status: vr.status as RouteVersionEntity["status"],
      changeReason: vr.changeReason || undefined,
      stops: JSON.parse(vr.stopsJson),
      legs: JSON.parse(vr.legsJson),
      publishedAt: vr.publishedAt.toISOString(),
    })),
    version: planRow.version,
  });

  const newVer = plan.publishNewRouteVersion(
    {
      stops: input.stops,
      legs: normalizedLegs,
      changeReason: input.changeReason || "Schedule / routing revision",
    },
    actor,
    correlationId,
  );

  // Mark previous versions SUPERSEDED in DB (preserving their rows untouched)
  await db
    .update(scmRouteVersions)
    .set({ status: "SUPERSEDED" })
    .where(eq(scmRouteVersions.routePlanId, plan.id));

  await db.insert(scmRouteVersions).values({
    id: newVer.versionId,
    routePlanId: plan.id,
    shipmentId: plan.shipmentId,
    versionNo: newVer.versionNo,
    status: "PUBLISHED",
    changeReason: newVer.changeReason || null,
    stopsJson: JSON.stringify(newVer.stops),
    legsJson: JSON.stringify(newVer.legs),
    publishedAt: new Date(newVer.publishedAt),
  });

  await db
    .update(scmRoutePlans)
    .set({
      activeVersionNo: plan.activeVersionNo,
      version: plan.version,
      updatedAt: now,
    })
    .where(eq(scmRoutePlans.id, plan.id));

  await outboxBus.enqueueEvents(plan.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return plan;
}
