import { v4 as uuidv4 } from "uuid";

export class DomainInvariantError extends Error {
  public readonly code: string;
  public readonly boundedContext: string;

  constructor(boundedContext: string, code: string, message: string) {
    super(message);
    this.name = "DomainInvariantError";
    this.boundedContext = boundedContext;
    this.code = code;
  }
}

export class AuthorizationAbacError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationAbacError";
  }
}

export interface SecurityActorContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly legalEntityId: string;
  readonly branchId: string;
  readonly departmentId?: string;
  readonly teamIds: readonly string[];
  readonly roles: readonly string[];
}

export const DEFAULT_OPERATOR_ACTOR: SecurityActorContext = {
  userId: "usr_ops_coordinator_01",
  organizationId: "org_atlas_global",
  legalEntityId: "le_atlas_iberia",
  branchId: "br_esbcn",
  departmentId: "dept_multimodal_ops",
  teamIds: ["team_ocean_export", "team_ocean_import"],
  roles: ["OPERATIONS_COORDINATOR", "BOOKING_DESK", "ADMIN"],
};

export interface CommandEnvelope<TPayload = unknown> {
  readonly commandId: string;
  readonly commandType: string;
  readonly targetContext: string;
  readonly targetAggregateId?: string;
  readonly expectedVersion?: number;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly actor: SecurityActorContext;
  readonly issuedAt: string;
  readonly payload: TPayload;
}

export interface DomainEventEnvelope<TPayload = any> {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly producerContext: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly correlationId: string;
  readonly causationId: string;
  readonly actor: SecurityActorContext;
  readonly occurredAt: string;
  readonly payload: TPayload;
}

export function assertInvariant(
  condition: boolean,
  boundedContext: string,
  code: string,
  message: string,
): asserts condition {
  if (!condition) {
    throw new DomainInvariantError(boundedContext, code, message);
  }
}

export function assertAbacScope(
  actor: SecurityActorContext,
  targetOrgId: string,
  targetBranchId?: string,
  allowedRoles?: string[],
): void {
  if (!actor || !actor.userId) {
    throw new AuthorizationAbacError("Missing authenticated actor context");
  }
  if (actor.roles.includes("SUPER_ADMIN") || actor.roles.includes("ADMIN")) {
    if (actor.organizationId === targetOrgId) {
      return;
    }
  }
  if (actor.organizationId !== targetOrgId) {
    throw new AuthorizationAbacError(
      `ABAC Violation: Actor organization '${actor.organizationId}' cannot access organization '${targetOrgId}'`,
    );
  }
  if (
    targetBranchId &&
    actor.branchId !== targetBranchId &&
    !actor.roles.includes("GLOBAL_OPERATIONS")
  ) {
    throw new AuthorizationAbacError(
      `ABAC Violation: Actor branch '${actor.branchId}' cannot access branch '${targetBranchId}'`,
    );
  }
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.some((r) => actor.roles.includes(r))
  ) {
    throw new AuthorizationAbacError(
      `RBAC Violation: Actor lacks required role (${allowedRoles.join(", ")})`,
    );
  }
}

export abstract class AggregateRoot<TId extends string = string> {
  public readonly id: TId;
  protected _version: number;
  private _domainEvents: DomainEventEnvelope[] = [];

  protected constructor(id: TId, version: number = 1) {
    this.id = id;
    this._version = version;
  }

  public get version(): number {
    return this._version;
  }

  protected incrementVersion(): void {
    this._version += 1;
  }

  protected recordDomainEvent<TPayload>(params: {
    eventType: string;
    producerContext: string;
    aggregateType: string;
    correlationId: string;
    causationId?: string;
    actor: SecurityActorContext;
    payload: TPayload;
  }): DomainEventEnvelope<TPayload> {
    const event: DomainEventEnvelope<TPayload> = {
      eventId: `evt_${uuidv4()}`,
      eventType: params.eventType,
      schemaVersion: 1,
      producerContext: params.producerContext,
      aggregateType: params.aggregateType,
      aggregateId: this.id,
      aggregateVersion: this._version,
      correlationId: params.correlationId,
      causationId: params.causationId || params.correlationId,
      actor: params.actor,
      occurredAt: new Date().toISOString(),
      payload: params.payload,
    };
    this._domainEvents.push(event);
    return event;
  }

  public pullDomainEvents(): DomainEventEnvelope[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
