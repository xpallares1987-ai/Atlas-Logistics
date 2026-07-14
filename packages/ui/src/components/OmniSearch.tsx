import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Ship, FileText, Settings, LayoutDashboard, Globe2, BookOpen, ShieldAlert, Landmark, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function OmniSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleSelect = (route: string) => {
    navigate(route);
    setOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="w-full flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg border border-slate-200 transition-colors"
      >
        <Search className="w-4 h-4 mr-2" />
        <span className="text-sm">Search anywhere...</span>
        <kbd className="ml-auto text-xs font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 shadow-sm text-slate-400">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <Command label="Global Command Menu" className="w-full" shouldFilter={true}>
              <div className="flex items-center border-b border-slate-100 px-4">
                <Search className="text-slate-400 w-5 h-5 mr-2" />
                <Command.Input 
                  placeholder="Type a command or search..." 
                  className="w-full bg-transparent border-none py-4 text-slate-800 placeholder-slate-400 focus:ring-0 outline-none text-lg"
                  autoFocus
                />
              </div>
              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-slate-500">No results found.</Command.Empty>
                
                <Command.Group heading="Navigation" className="text-xs font-semibold text-slate-400 mb-2 px-2">
                  <Command.Item onSelect={() => handleSelect('/')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => handleSelect('/globe')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700">
                    <Globe2 className="w-4 h-4" />
                    Globe Tracker
                  </Command.Item>
                  <Command.Item onSelect={() => handleSelect('/bookings')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700">
                    <BookOpen className="w-4 h-4" />
                    Bookings & B/L
                  </Command.Item>
                  <Command.Item onSelect={() => handleSelect('/customs')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700">
                    <ShieldAlert className="w-4 h-4" />
                    Customs Clearance
                  </Command.Item>
                  <Command.Item onSelect={() => handleSelect('/invoices')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700">
                    <Landmark className="w-4 h-4" />
                    Invoicing
                  </Command.Item>
                  <Command.Item onSelect={() => handleSelect('/esg-tracker')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700">
                    <Leaf className="w-4 h-4" />
                    Carbon Tracker
                  </Command.Item>
                  <Command.Item onSelect={() => handleSelect('/settings')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Command.Item>
                </Command.Group>
                
                <Command.Group heading="Shipments" className="text-xs font-semibold text-slate-400 mb-2 px-2 mt-4">
                  <Command.Item onSelect={() => handleSelect('/bookings')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer aria-selected:bg-slate-100">
                    <Ship className="text-blue-500 w-4 h-4" />
                    SHP-001 (Shanghai → Rotterdam)
                  </Command.Item>
                  <Command.Item onSelect={() => handleSelect('/bookings')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer aria-selected:bg-slate-100">
                    <Ship className="text-blue-500 w-4 h-4" />
                    SHP-002 (Shenzhen → Los Angeles)
                  </Command.Item>
                </Command.Group>
                
                <Command.Group heading="Documents" className="text-xs font-semibold text-slate-400 mb-2 px-2 mt-4">
                  <Command.Item onSelect={() => handleSelect('/documents')} className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer aria-selected:bg-slate-100">
                    <FileText className="text-emerald-500 w-4 h-4" />
                    Invoice #INV-2026-89
                  </Command.Item>
                </Command.Group>

              </Command.List>
            </Command>
          </div>
          {/* Clic outside handler para cerrar */}
          <div className="absolute inset-0 z-[-1]" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
