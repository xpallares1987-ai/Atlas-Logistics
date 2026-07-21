
import { trpc } from '../utils/trpc';
import { Activity } from 'lucide-react';

export function TRPCStatus() {
  const { data, isLoading, error } = trpc.health.check.useQuery();

  if (isLoading) return <div className="text-slate-400">Verificando tRPC...</div>;
  if (error) return <div className="text-rose-500">tRPC Inactivo</div>;

  return (
    <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1 rounded-full border border-indigo-100">
      <Activity size={14} className="text-indigo-500" />
      <span className="text-indigo-700 font-medium">tRPC: {data?.status}</span>
    </div>
  );
}
