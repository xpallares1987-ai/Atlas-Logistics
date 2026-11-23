/**
 * @file crdt-sync.routes.ts
 * @description Fastify REST routes for Distributed CRDT Replication, Peer Reconciliation,
 * and Multi-Station Synchronization (ADR 0039 / T-61).
 * @module @atlas/api/routes/crdt-sync
 * @see {@link docs/adr/0039-hybrid-persistence-and-crdt-synchronization.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  crdtSyncService,
  StationPeerInput,
} from "../services/crdt-sync.service.js";
import { CrdtEntityType, CrdtDelta } from "../scm/engines/crdt-sync.engine.js";

export const crdtSyncRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Pull Deltas
  fastify.post(
    "/pull",
    {
      schema: {
        description:
          "Pull CRDT mutation deltas newer than the client's vector clock",
        tags: ["CRDT Sync"],
        body: {
          type: "object",
          required: ["clientNodeId", "clientVectorClock"],
          properties: {
            clientNodeId: { type: "string" },
            clientVectorClock: {
              type: "object",
              additionalProperties: { type: "number" },
            },
            entityTypes: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "SHIPMENT",
                  "CONTAINER",
                  "PURCHASE_ORDER",
                  "CUSTOMS_CLEARANCE",
                ],
              },
            },
            tenantId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              serverNodeId: { type: "string" },
              serverVectorClock: {
                type: "object",
                additionalProperties: { type: "number" },
              },
              deltas: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                },
              },
              pulledCount: { type: "number" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        clientNodeId: string;
        clientVectorClock: Record<string, number>;
        entityTypes?: CrdtEntityType[];
        tenantId?: string;
      };

      const result = await crdtSyncService.pullDeltas({
        clientNodeId: body.clientNodeId,
        clientVectorClock: body.clientVectorClock,
        entityTypes: body.entityTypes,
        tenantId: body.tenantId,
      });

      return reply.code(200).send(result);
    },
  );

  // 2. Push Delta
  fastify.post(
    "/push",
    {
      schema: {
        description:
          "Push a CRDT mutation delta for causal merge and regulatory hold enforcement",
        tags: ["CRDT Sync"],
        body: {
          type: "object",
          required: ["delta"],
          properties: {
            delta: {
              type: "object",
              required: [
                "id",
                "entityType",
                "patch",
                "vectorClock",
                "updatedAt",
                "nodeId",
              ],
              properties: {
                id: { type: "string" },
                entityType: {
                  type: "string",
                  enum: [
                    "SHIPMENT",
                    "CONTAINER",
                    "PURCHASE_ORDER",
                    "CUSTOMS_CLEARANCE",
                  ],
                },
                patch: { type: "object", additionalProperties: true },
                vectorClock: {
                  type: "object",
                  additionalProperties: { type: "number" },
                },
                updatedAt: { type: "string" },
                nodeId: { type: "string" },
                regulatoryHoldPatch: {
                  type: "object",
                  additionalProperties: true,
                },
              },
            },
            appliedNodeId: { type: "string" },
            tenantId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              applied: { type: "boolean" },
              resolvedState: {
                type: "object",
                additionalProperties: true,
              },
              conflicts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        delta: CrdtDelta;
        appliedNodeId?: string;
        tenantId?: string;
      };

      const result = await crdtSyncService.pushDelta({
        delta: body.delta,
        appliedNodeId: body.appliedNodeId,
        tenantId: body.tenantId,
      });

      return reply.code(200).send(result);
    },
  );

  // 3. List Station Peers
  fastify.get(
    "/peers",
    {
      schema: {
        description: "List all registered station peers and their sync health",
        tags: ["CRDT Sync"],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const peers = await crdtSyncService.listPeers();
      return reply.code(200).send(peers);
    },
  );

  // 4. Register Station Peer
  fastify.post(
    "/peers",
    {
      schema: {
        description: "Register or update a distributed station peer",
        tags: ["CRDT Sync"],
        body: {
          type: "object",
          required: ["nodeId", "stationCode", "stationName"],
          properties: {
            nodeId: { type: "string" },
            stationCode: { type: "string" },
            stationName: { type: "string" },
            role: {
              type: "string",
              enum: ["EDGE_STATION", "REGIONAL_HUB", "CENTRAL_CONSOLIDATOR"],
            },
            endpointUrl: { type: "string" },
            lastKnownVectorClock: {
              type: "object",
              additionalProperties: { type: "number" },
            },
            syncStatus: {
              type: "string",
              enum: [
                "ONLINE_SYNCED",
                "OFFLINE_DIRTY",
                "SYNCING",
                "CONFLICT_LOCKED",
              ],
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as StationPeerInput;
      await crdtSyncService.registerPeer(body);
      return reply.code(200).send({ success: true });
    },
  );

  // 5. Get Aggregate Entity State
  fastify.get(
    "/states/:entityType/:id",
    {
      schema: {
        description: "Get current CRDT state for an aggregate entity",
        tags: ["CRDT Sync"],
        params: {
          type: "object",
          required: ["entityType", "id"],
          properties: {
            entityType: {
              type: "string",
              enum: [
                "SHIPMENT",
                "CONTAINER",
                "PURCHASE_ORDER",
                "CUSTOMS_CLEARANCE",
              ],
            },
            id: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            additionalProperties: true,
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const params = request.params as {
        entityType: CrdtEntityType;
        id: string;
      };
      const query = request.query as { tenantId?: string };
      const tenant =
        query?.tenantId ||
        (request as { tenantId?: string }).tenantId ||
        "tenant-default";
      const state = await crdtSyncService.getState(
        params.entityType,
        params.id,
        tenant,
      );
      if (!state) {
        return reply.code(404).send({
          error: "Not Found",
          message: `CRDT state for ${params.entityType}:${params.id} does not exist.`,
        });
      }
      return reply.code(200).send(state);
    },
  );
};
