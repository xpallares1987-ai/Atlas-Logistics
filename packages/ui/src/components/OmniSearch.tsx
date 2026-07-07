import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Ship, FileText, Anchor } from 'lucide-react';

export function OmniSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Command label="Global Command Menu" className="w-full" shouldFilter={true}>
          <div className="flex items-center border-b border-slate-800 px-4">
            <Search className="text-slate-400 w-5 h-5 mr-2" />
            <Command.Input 
              placeholder="Search shipments, ports, invoices... (Cmd+K)" 
              className="w-full bg-transparent border-none py-4 text-white placeholder-slate-500 focus:ring-0 outline-none text-lg"
              autoFocus
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-slate-500">No results found.</Command.Empty>
            
            <Command.Group heading="Shipments" className="text-xs font-semibold text-slate-400 mb-2 px-2">
              <Command.Item className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer aria-selected:bg-slate-800">
                <Ship className="text-blue-400 w-4 h-4" />
                SHP-001 (Shanghai → Rotterdam)
              </Command.Item>
              <Command.Item className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer aria-selected:bg-slate-800">
                <Ship className="text-blue-400 w-4 h-4" />
                SHP-002 (Shenzhen → Los Angeles)
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="Documents" className="text-xs font-semibold text-slate-400 mb-2 px-2 mt-4">
              <Command.Item className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer aria-selected:bg-slate-800">
                <FileText className="text-emerald-400 w-4 h-4" />
                Invoice #INV-2026-89
              </Command.Item>
              <Command.Item className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer aria-selected:bg-slate-800">
                <FileText className="text-emerald-400 w-4 h-4" />
                Bill of Lading #BL-9923
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="Ports" className="text-xs font-semibold text-slate-400 mb-2 px-2 mt-4">
              <Command.Item className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer aria-selected:bg-slate-800">
                <Anchor className="text-rose-400 w-4 h-4" />
                Port of Rotterdam (NLRTM)
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
      {/* Clic outside handler para cerrar */}
      <div className="absolute inset-0 z-[-1]" onClick={() => setOpen(false)} />
    </div>
  );
}
