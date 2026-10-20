import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Radio, ShieldAlert, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { probeRemoteEndpoint } from '../../lib/mfe/mfe-config';
import { MfeSharedProps, MfeUserContext } from '../../lib/mfe/mfe-context';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MfeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SafeRemoteLoader caught an MFE render error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

export interface SafeRemoteLoaderProps {
  moduleName: string;
  remoteUrl: string;
  remoteLoader: () => Promise<{ default: React.ComponentType<any> }>;
  fallbackLoader: () => Promise<{ default: React.ComponentType<any> }>;
  timeoutMs?: number;
  extraProps?: Record<string, any>;
}

export function SafeRemoteLoader({
  moduleName,
  remoteUrl,
  remoteLoader,
  fallbackLoader,
  timeoutMs = 2500,
  extraProps = {}
}: SafeRemoteLoaderProps) {
  const { user } = useAuth();
  const [loadingMode, setLoadingMode] = useState<'LOADING' | 'REMOTE' | 'FALLBACK' | 'FAILED'>('LOADING');
  const [LoadedComponent, setLoadedComponent] = useState<React.ComponentType<any> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;
    setLoadingMode('LOADING');
    setErrorMessage(null);

    async function resolveMicroFrontend() {
      // 1. Probe remote endpoint connectivity
      const isReachable = await probeRemoteEndpoint(remoteUrl, timeoutMs);

      if (isCancelled) return;

      if (isReachable) {
        try {
          const remoteModule = await remoteLoader();
          if (!isCancelled) {
            setLoadedComponent(() => remoteModule.default);
            setLoadingMode('REMOTE');
            return;
          }
        } catch (err: any) {
          console.warn(`[SafeRemoteLoader] Remote load failed for ${moduleName}, switching to fallback:`, err);
        }
      }

      // 2. If remote unreachable or failed, load local fallback
      try {
        const fallbackModule = await fallbackLoader();
        if (!isCancelled) {
          setLoadedComponent(() => fallbackModule.default);
          setLoadingMode('FALLBACK');
        }
      } catch (fallbackErr: any) {
        if (!isCancelled) {
          console.error(`[SafeRemoteLoader] Both remote and fallback failed for ${moduleName}:`, fallbackErr);
          setLoadingMode('FAILED');
          setErrorMessage(fallbackErr?.message || 'Error cargando módulo local.');
        }
      }
    }

    resolveMicroFrontend();

    return () => {
      isCancelled = true;
    };
  }, [remoteUrl, remoteLoader, fallbackLoader, timeoutMs, moduleName, reloadKey]);

  // Construct shared context props
  const userContext: MfeUserContext | null = user
    ? {
        id: user.id || 'usr-default',
        name: user.name || 'User',
        email: user.email || 'user@atlas.local',
        role: user.role || 'OPERATIONS',
        company: 'Atlas Logistics Corredor Book 012',
        tenantId: 'tenant-atlas-bcn'
      }
    : null;

  const sharedProps: MfeSharedProps = {
    user: userContext,
    authToken: (user as any)?.token || null,
    tenantId: 'tenant-atlas-bcn',
    isRemoteMode: loadingMode === 'REMOTE',
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001',
    ...extraProps
  };

  if (loadingMode === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] p-8 space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <div className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl animate-pulse border border-blue-500/20">
          <Layers className="w-8 h-8 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h4 className="text-base font-semibold text-white tracking-tight">
            Resolviendo Módulo Micro-Frontend: {moduleName}
          </h4>
          <p className="text-xs text-slate-400">
            Conectando con contenedor Edge y validando fallback de contingencia...
          </p>
        </div>
      </div>
    );
  }

  if (loadingMode === 'FAILED' || !LoadedComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-center">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <h4 className="text-lg font-bold text-white">Error de Carga Micro-Frontend ({moduleName})</h4>
        <p className="text-sm text-red-300 max-w-md">{errorMessage || 'No se pudo resolver el módulo remoto ni el paquete local.'}</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Resilient MFE Status Badge */}
      <div className="flex items-center justify-end mb-3">
        {loadingMode === 'REMOTE' ? (
          <span
            id="mfeStatusRemote"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            Edge Remote · Active ({moduleName})
          </span>
        ) : (
          <span
            id="mfeStatusFallback"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Local Fallback Mode · Resilient ({moduleName})
          </span>
        )}
      </div>

      <MfeErrorBoundary
        fallback={(err, reset) => (
          <div className="p-6 bg-amber-950/30 border border-amber-800/40 rounded-xl space-y-3 text-center">
            <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
            <h5 className="text-sm font-bold text-white">Excepción en Ejecución Micro-Frontend</h5>
            <p className="text-xs text-amber-300">{err.message}</p>
            <button
              onClick={reset}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold"
            >
              Recargar Componente
            </button>
          </div>
        )}
      >
        <LoadedComponent {...sharedProps} />
      </MfeErrorBoundary>
    </div>
  );
}
