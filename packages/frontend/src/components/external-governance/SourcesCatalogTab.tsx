import React from "react";
import { ExternalLink, Database, Shield, Globe, BookOpen } from "lucide-react";
import { DataSourceDto } from "../../types/external-governance.types";

interface SourcesCatalogTabProps {
  sources: DataSourceDto[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const SourcesCatalogTab: React.FC<SourcesCatalogTabProps> = ({
  sources,
  isLoading,
}) => {
  const getSourceIcon = (code: string) => {
    switch (code) {
      case "UNLOCODE":
        return <Globe className="h-6 w-6 text-sky-400" />;
      case "OPENSTREETMAP":
        return <Globe className="h-6 w-6 text-emerald-400" />;
      case "GEONAMES":
        return <BookOpen className="h-6 w-6 text-indigo-400" />;
      case "GLEIF":
        return <Shield className="h-6 w-6 text-amber-400" />;
      default:
        return <Database className="h-6 w-6 text-slate-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "AUTHORITY":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "OPEN_DATA":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "COMMERCIAL_API":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  if (isLoading && sources.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 text-sm">
        Cargando catálogo de orígenes autorizados...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            Catálogo de Fuentes y Proveedores Externos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro de autoridades geográficas, normativas y APIs abiertas
            integradas bajo el modelo lean de 3 tablas (ADR 0021).
          </p>
        </div>
        <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
          {sources.length} Fuentes Registradas
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => (
          <div
            key={source.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    {getSourceIcon(source.code)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {source.name}
                    </h3>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {source.code}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getTypeBadge(
                    source.type,
                  )}`}
                >
                  {source.type}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {source.description || "Sin descripción proporcionada."}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                {source.websiteUrl && (
                  <a
                    href={source.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                  >
                    <span>Sitio Oficial</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {source.termsUrl && (
                  <a
                    href={source.termsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                  >
                    <span>Términos & Licencia</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                ID: {source.id}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
