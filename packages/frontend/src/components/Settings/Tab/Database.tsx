/**
 * @file Database.tsx
 * @description SQLite DDL schema explorer and dynamic table/column creation management tab.
 * @module @atlas/frontend/components/Settings/Tab/Database
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Plus, TableProperties } from "lucide-react";
import {
  Button,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@atlas/ui";
import { useDatabaseManager } from "../hooks/useDatabaseManager";

export const Database: React.FC = () => {
  const {
    schema,
    loading,
    error,
    newTable,
    setNewTable,
    newColumn,
    setNewColumn,
    handleCreateTable,
    handleAddColumn,
  } = useDatabaseManager();

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Loading schema...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
        Error loading schema: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Current Schema
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {Object.entries(schema || {}).map(
              ([tableName, columns]: [string, any]) => (
                <div
                  key={tableName}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      {tableName}
                    </span>
                  </div>
                  <div className="p-4">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="h-8 py-1">Column</TableHead>
                          <TableHead className="h-8 py-1">Type</TableHead>
                          <TableHead className="h-8 py-1">PK</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columns.map((c: any) => (
                          <TableRow key={c.name}>
                            <TableCell className="py-1 font-medium">
                              {c.name}
                            </TableCell>
                            <TableCell className="py-1">{c.type}</TableCell>
                            <TableCell className="py-1">
                              {c.pk ? "✓" : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Add New Table Form */}
          <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Table
            </h4>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Table Name
                </label>
                <Input
                  required
                  placeholder="e.g. customs_records"
                  value={newTable.name}
                  onChange={(e) =>
                    setNewTable({ ...newTable, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    First Column Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. status"
                    value={newTable.column1Name}
                    onChange={(e) =>
                      setNewTable({ ...newTable, column1Name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Data Type
                  </label>
                  <Select
                    value={newTable.column1Type}
                    onChange={(e) =>
                      setNewTable({ ...newTable, column1Type: e.target.value })
                    }
                  >
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="REAL">REAL</option>
                    <option value="BLOB">BLOB</option>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Create Table
              </Button>
            </form>
          </div>

          {/* Add Column to Existing Table */}
          <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Column to Existing Table
            </h4>
            <form onSubmit={handleAddColumn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Table
                </label>
                <Select
                  required
                  value={newColumn.table}
                  onChange={(e) =>
                    setNewColumn({ ...newColumn, table: e.target.value })
                  }
                >
                  <option value="">Select a table...</option>
                  {Object.keys(schema || {}).map((tableName) => (
                    <option key={tableName} value={tableName}>
                      {tableName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New Column Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. tracking_hash"
                    value={newColumn.name}
                    onChange={(e) =>
                      setNewColumn({ ...newColumn, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Data Type
                  </label>
                  <Select
                    value={newColumn.type}
                    onChange={(e) =>
                      setNewColumn({ ...newColumn, type: e.target.value })
                    }
                  >
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="REAL">REAL</option>
                    <option value="BLOB">BLOB</option>
                  </Select>
                </div>
              </div>
              <Button type="submit" variant="secondary" className="w-full">
                Add Column
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Database;
