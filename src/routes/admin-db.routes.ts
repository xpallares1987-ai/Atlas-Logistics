import { FastifyPluginAsync } from "fastify";
import { client } from "../db/index.js";

const adminDbRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // Ensure only admins can access these routes
  fastify.addHook("onRequest", async (request, reply) => {
    // We assume authMiddleware is already running before this via app.ts
    // Check if user is admin
    const user = (request as any).user;
    if (!user || user.role !== "ADMIN") {
      return reply
        .status(403)
        .send({ error: "Forbidden: ADMIN role required" });
    }
  });

  // Get full schema
  fastify.get("/schema", async (request, reply) => {
    try {
      const tablesResult = await client.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
      );
      const schema: any = {};

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
    } catch (error) {
      fastify.log.error(error);
      return reply
        .status(500)
        .send({ success: false, error: "Failed to fetch schema" });
    }
  });

  // Create a new table
  fastify.post("/tables", async (request, reply) => {
    try {
      const { tableName, columns } = request.body as {
        tableName: string;
        columns: any[];
      };

      if (!tableName || !columns || columns.length === 0) {
        return reply
          .status(400)
          .send({
            success: false,
            error: "tableName and columns are required",
          });
      }

      // Very basic sanity check
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return reply
          .status(400)
          .send({ success: false, error: "Invalid table name" });
      }

      const columnDefs = columns
        .map((c) => {
          let def = `"${c.name}" ${c.type}`;
          if (c.pk) def += " PRIMARY KEY";
          if (c.notnull) def += " NOT NULL";
          return def;
        })
        .join(", ");

      const query = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs})`;
      await client.execute(query);

      return reply.send({
        success: true,
        message: `Table ${tableName} created successfully`,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Add a new column to a table
  fastify.post("/tables/:table/columns", async (request, reply) => {
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
        return reply
          .status(400)
          .send({
            success: false,
            error: "columnName and dataType are required",
          });
      }
      if (
        !/^[a-zA-Z0-9_]+$/.test(table) ||
        !/^[a-zA-Z0-9_]+$/.test(columnName)
      ) {
        return reply
          .status(400)
          .send({ success: false, error: "Invalid table or column name" });
      }

      let query = `ALTER TABLE "${table}" ADD COLUMN "${columnName}" ${dataType}`;
      if (!isNullable) {
        query += " NOT NULL";
        if (defaultValue) {
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
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
};

export default adminDbRoutes;
