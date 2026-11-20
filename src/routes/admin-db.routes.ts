/**
 * @file admin-db.routes.ts
 * @description Administrative SQLite schema introspection and DDL management routes.
 * @module @atlas/api/routes/admin-db
 */

import { FastifyPluginAsync } from "fastify";
import { client } from "../db/index.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
} from "./openapi.schemas.js";

const ADMIN_DB_TAG = ["Admin Database & Seeding"] as const;

const SQL_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
const ALLOWED_SQLITE_TYPES = new Set([
  "TEXT",
  "INTEGER",
  "INT",
  "REAL",
  "FLOAT",
  "DOUBLE",
  "BLOB",
  "NUMERIC",
  "BOOLEAN",
  "DATETIME",
]);
const SAFE_DEFAULT_VALUE_REGEX = /^[a-zA-Z0-9_ .:/-]{0,128}$/;

function isValidSqlIdentifier(name: unknown): name is string {
  return (
    typeof name === "string" &&
    SQL_IDENTIFIER_REGEX.test(name) &&
    !name.toLowerCase().startsWith("sqlite_")
  );
}

function normalizeSqlType(rawType: unknown): string | null {
  if (typeof rawType !== "string") return null;
  const upper = rawType.trim().toUpperCase();
  return ALLOWED_SQLITE_TYPES.has(upper) ? upper : null;
}

interface ColumnInfo {
  cid: unknown;
  name: unknown;
  type: unknown;
  notnull: unknown;
  dflt_value: unknown;
  pk: unknown;
}

interface TableColumnInput {
  name: string;
  type: string;
  pk?: boolean;
  notnull?: boolean;
}

const adminDbRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // Ensure only admins can access these routes
  fastify.addHook("onRequest", async (request, reply) => {
    // We assume authMiddleware is already running before this via app.ts
    // Check if user is admin
    const user = request.user;
    if (!user || user.role !== "ADMIN") {
      return reply
        .status(403)
        .send({ error: "Forbidden: ADMIN role required" });
    }
  });

  // Get full schema
  fastify.get(
    "/schema",
    {
      schema: {
        tags: [...ADMIN_DB_TAG],
        summary: "Inspect full SQLite database tables and column metadata",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const tablesResult = await client.execute(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        );
        const schema: Record<string, ColumnInfo[]> = {};

        for (const row of tablesResult.rows) {
          const tableName = row.name as string;
          const columnsResult = await client.execute(
            `PRAGMA table_info("${tableName}")`,
          );

          schema[tableName] = columnsResult.rows.map((c) => ({
            cid: c.cid,
            name: c.name,
            type: c.type,
            notnull: c.notnull,
            dflt_value: c.dflt_value,
            pk: c.pk,
          }));
        }

        return reply.send({ success: true, schema });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply
          .status(500)
          .send({ success: false, error: "Failed to fetch schema" });
      }
    },
  );

  // Create a new table
  fastify.post(
    "/tables",
    {
      schema: {
        tags: [...ADMIN_DB_TAG],
        summary: "Create a custom SQLite database table",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { tableName, columns } = request.body as {
          tableName: string;
          columns: TableColumnInput[];
        };

        if (!tableName || !Array.isArray(columns) || columns.length === 0) {
          return reply.status(400).send({
            success: false,
            error: "tableName and columns are required",
          });
        }

        if (!isValidSqlIdentifier(tableName)) {
          return reply
            .status(400)
            .send({ success: false, error: "Invalid table name" });
        }

        const validatedColumnDefs: string[] = [];
        for (const c of columns) {
          if (!c || !isValidSqlIdentifier(c.name)) {
            return reply
              .status(400)
              .send({ success: false, error: "Invalid column name" });
          }
          const safeType = normalizeSqlType(c.type);
          if (!safeType) {
            return reply.status(400).send({
              success: false,
              error: `Unsupported SQLite column type: ${String(c.type ?? "")}`,
            });
          }
          let def = `"${c.name}" ${safeType}`;
          if (c.pk) def += " PRIMARY KEY";
          if (c.notnull) def += " NOT NULL";
          validatedColumnDefs.push(def);
        }

        const query = `CREATE TABLE IF NOT EXISTS "${tableName}" (${validatedColumnDefs.join(", ")})`;
        await client.execute(query);

        return reply.send({
          success: true,
          message: `Table ${tableName} created successfully`,
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Table creation failed",
        });
      }
    },
  );

  // Add a new column to a table
  fastify.post(
    "/tables/:table/columns",
    {
      schema: {
        tags: [...ADMIN_DB_TAG],
        summary: "Add a column to an existing SQLite table",
        params: buildParamSchema("table", "Target SQLite table name."),
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { table } = request.params as { table: string };
        const { columnName, dataType, isNullable, defaultValue } =
          request.body as {
            columnName: string;
            dataType: string;
            isNullable?: boolean;
            defaultValue?: string;
          };

        if (!columnName || !dataType) {
          return reply.status(400).send({
            success: false,
            error: "columnName and dataType are required",
          });
        }
        if (!isValidSqlIdentifier(table) || !isValidSqlIdentifier(columnName)) {
          return reply
            .status(400)
            .send({ success: false, error: "Invalid table or column name" });
        }

        const safeType = normalizeSqlType(dataType);
        if (!safeType) {
          return reply.status(400).send({
            success: false,
            error: `Unsupported SQLite dataType: ${String(dataType)}`,
          });
        }

        let query = `ALTER TABLE "${table}" ADD COLUMN "${columnName}" ${safeType}`;
        if (!isNullable) {
          query += " NOT NULL";
          if (defaultValue !== undefined && defaultValue !== "") {
            if (
              typeof defaultValue !== "string" ||
              !SAFE_DEFAULT_VALUE_REGEX.test(defaultValue)
            ) {
              return reply.status(400).send({
                success: false,
                error:
                  "Invalid defaultValue: only safe literal characters are permitted",
              });
            }
            query += ` DEFAULT '${defaultValue}'`;
          } else {
            // If it's not nullable, we usually need a default value to add to existing table
            query += ` DEFAULT ''`;
          }
        }

        await client.execute(query);
        return reply.send({
          success: true,
          message: `Column ${columnName} added to ${table}`,
        });
      } catch (error: unknown) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Column addition failed",
        });
      }
    },
  );
};

export default adminDbRoutes;
