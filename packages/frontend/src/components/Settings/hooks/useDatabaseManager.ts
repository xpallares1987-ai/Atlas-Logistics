/**
 * @file useDatabaseManager.ts
 * @description Domain hook for SQLite DDL schema management, table creation, and column extension.
 * @module @atlas/frontend/components/Settings/hooks/useDatabaseManager
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import { useState, useEffect, useCallback } from "react";
import type {
  DatabaseSchemaMap,
  NewColumnInput,
  NewTableInput,
} from "../../../types/settings.types";

export function useDatabaseManager() {
  const [schema, setSchema] = useState<DatabaseSchemaMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTable, setNewTable] = useState<NewTableInput>({
    name: "",
    column1Name: "",
    column1Type: "TEXT",
  });

  const [newColumn, setNewColumn] = useState<NewColumnInput>({
    table: "",
    name: "",
    type: "TEXT",
  });

  const fetchSchema = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/db/schema");
      const data = await res.json();
      if (data.success) {
        setSchema(data.schema);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/db/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName: newTable.name,
          columns: [
            { name: "id", type: "TEXT", pk: true, notnull: true },
            { name: newTable.column1Name, type: newTable.column1Type },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTable({ name: "", column1Name: "", column1Type: "TEXT" });
        await fetchSchema();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumn.table) return alert("Select a table");
    try {
      const res = await fetch(
        `/api/admin/db/tables/${newColumn.table}/columns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            columnName: newColumn.name,
            dataType: newColumn.type,
            isNullable: true,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setNewColumn({ table: "", name: "", type: "TEXT" });
        await fetchSchema();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return {
    schema,
    loading,
    error,
    newTable,
    setNewTable,
    newColumn,
    setNewColumn,
    fetchSchema,
    handleCreateTable,
    handleAddColumn,
  };
}
