/**
 * @file openapi.schemas.ts
 * @description Reusable JSON Schema building blocks for Fastify route OpenAPI/Swagger documentation contracts across Core Operations routes.
 * @module @atlas/api/routes/openapi-schemas
 * @see {@link docs/architecture/atlas-joint-improvement-plan.md}
 */

// ============================================================================
// 1. REUSABLE PARAMETER & PAYLOAD SCHEMA FRAGMENTS
// ============================================================================

export type OpenApiErrorCode =
  400 | 401 | 403 | 404 | 409 | 422 | 423 | 429 | 500 | 502 | 503;

export const OPENAPI_ID_PARAMS_SCHEMA = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      minLength: 1,
      description: "Unique entity identifier or reference key.",
    },
  },
} as const;

export const OPENAPI_ERROR_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    error: { type: "string" },
    code: { type: "string" },
    message: { type: "string" },
    details: {
      anyOf: [
        { type: "object", additionalProperties: true },
        { type: "array", items: {} },
        { type: "string" },
      ],
    },
  },
} as const;

export const OPENAPI_SUCCESS_FLAG_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    success: { type: "boolean" },
    message: { type: "string" },
  },
} as const;

export const OPENAPI_FLEXIBLE_OBJECT_SCHEMA = {
  type: "object",
  additionalProperties: true,
} as const;

export const OPENAPI_FLEXIBLE_ARRAY_SCHEMA = {
  type: "array",
  items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
} as const;

// ============================================================================
// 2. SCHEMA COMPOSITION HELPERS
// ============================================================================

/**
 * Builds a Fastify OpenAPI response map for the specified HTTP error status codes
 * preserving literal status-code keys for Fastify v5 reply.code() type checking.
 */
export function buildErrorResponses<
  const T extends readonly OpenApiErrorCode[],
>(codes: T): { [K in T[number]]: typeof OPENAPI_ERROR_RESPONSE_SCHEMA } {
  const responses: Partial<
    Record<OpenApiErrorCode, typeof OPENAPI_ERROR_RESPONSE_SCHEMA>
  > = {};
  for (const code of codes) {
    responses[code] = OPENAPI_ERROR_RESPONSE_SCHEMA;
  }
  return responses as {
    [K in T[number]]: typeof OPENAPI_ERROR_RESPONSE_SCHEMA;
  };
}

/**
 * Wraps documented core properties in a non-stripping JSON Schema object so
 * OpenAPI exposes rich field contracts while fast-json-stringify preserves
 * full relational payloads.
 */
export function openApiObject(
  properties: Record<string, Record<string, unknown>>,
  description?: string,
): Record<string, unknown> {
  return {
    type: "object",
    ...(description ? { description } : {}),
    additionalProperties: true,
    properties,
  };
}

/**
 * Wraps an array of documented domain records in a non-stripping JSON Schema array.
 */
export function openApiArray(
  itemProperties: Record<string, Record<string, unknown>>,
  description?: string,
): Record<string, unknown> {
  return {
    type: "array",
    ...(description ? { description } : {}),
    items: openApiObject(itemProperties),
  };
}

/**
 * Builds a single-parameter path schema for custom route param names (e.g. :recordId, :code).
 */
export function buildParamSchema(
  paramName: string,
  description = "Unique route parameter identifier.",
): Record<string, unknown> {
  return {
    type: "object",
    required: [paramName],
    properties: {
      [paramName]: {
        type: "string",
        minLength: 1,
        description,
      },
    },
  };
}

/**
 * Builds a multi-parameter path schema for routes with multiple path segments (e.g. :shipmentId/:docId).
 */
export function buildParamsSchema(
  params: Record<string, string>,
): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];
  for (const [name, description] of Object.entries(params)) {
    required.push(name);
    properties[name] = {
      type: "string",
      minLength: 1,
      description,
    };
  }
  return {
    type: "object",
    required,
    properties,
  };
}

/**
 * Safely extracts a human-readable error message from an unknown catch binding without using `any`.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Unexpected server error",
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
