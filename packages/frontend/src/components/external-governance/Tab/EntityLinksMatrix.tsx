import React, { useState, useMemo } from "react";
import { Plus, Ship, Box, MapPin, Anchor, Building } from "lucide-react";
import {
  SourceRecordDto,
  CreateEntityLinkFormData,
} from "../../../types/external-governance.types";
import { JoinedEntityLink } from "../../../hooks/useExternalGovernance";
import { CreateEntityLinkModal } from "../Modal/CreateEntityLink";

interface EntityLinksMatrixTabProps {
  entityLinks: JoinedEntityLink[];
  records: SourceRecordDto[];
  isLoading: boolean;
  onLink: (data: CreateEntityLinkFormData) => Promise<void>;
  isLinking: boolean;
}

export const EntityLinksMatrixTab: React.FC<EntityLinksMatrixTabProps> = ({
  entityLinks,
  records,
  isLoading,
  onLink,
  isLinking,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredLinks = useMemo(() => {
    if (selectedTypeFilter === "ALL") return entityLinks;
    return entityLinks.filter((l) => l.link.entityType === selectedTypeFilter);
  }, [entityLinks, selectedTypeFilter]);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "SHIPMENT":
        return <Box className="h-4 w-4 text-indigo-400" />;
      case "CONTAINER":
        return <Box className="h-4 w-4 text-emerald-400" />;
      case "PORT":
        return <Anchor className="h-4 w-4 text-sky-400" />;
      case "VESSEL":
        return <Ship className="h-4 w-4 text-amber-400" />;
      case "LOCATION":
        return <MapPin className="h-4 w-4 text-purple-400" />;
      default:
        return <Building className="h-4 w-4 text-slate-400" />;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "EXACT_CODE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "FUZZY_NAME":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "GEO_PROXIMITY":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">
              Todos los Tipos de Entidad ({entityLinks.length})
            </option>
            <option value="SHIPMENT">Expedientes (SHIPMENT)</option>
            <option value="CONTAINER">Contenedores (CONTAINER)</option>
            <option value="PORT">Puertos (PORT)</option>
            <option value="VESSEL">Buques (VESSEL)</option>
            <option value="LOCATION">Ubicaciones (LOCATION)</option>
          </select>

          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            {filteredLinks.length} cruces activos
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Vincular Nueva Entidad (Outbox)</span>
        </button>
      </div>

      {/* Links Matrix Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tipo Entidad</th>
                <th className="py-3 px-4">Identificador Atlas</th>
                <th className="py-3 px-4">Registro Externo Vinculado</th>
                <th className="py-3 px-4">Método Matching</th>
                <th className="py-3 px-4">Nivel Confianza</th>
                <th className="py-3 px-4">Verificado Por</th>
                <th className="py-3 px-4 text-right">Fecha Vínculo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading && entityLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Cargando matriz de vínculos desde SQLite...
                  </td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No se han configurado vínculos para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((item) => (
                  <tr
                    key={item.link.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-white">
                        {getEntityIcon(item.link.entityType)}
                        <span>{item.link.entityType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {item.link.entityId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-white">
                        {item.sourceRecord?.externalId ||
                          item.link.sourceRecordId}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
                        Hash: {item.sourceRecord?.sha256Hash?.slice(0, 16)}...
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getMethodBadge(
                          item.link.matchMethod,
                        )}`}
                      >
                        {item.link.matchMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.round(item.link.matchConfidence * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-300">
                          {Math.round(item.link.matchConfidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.link.verifiedBy || "sistema"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px] font-mono">
                      {item.link.verifiedAt
                        ? new Date(item.link.verifiedAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <CreateEntityLinkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        records={records}
        onLink={onLink}
        isLinking={isLinking}
      />
    </div>
  );
};
