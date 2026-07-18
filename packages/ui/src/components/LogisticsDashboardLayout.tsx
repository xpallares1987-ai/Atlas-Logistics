import React, { ReactNode } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
}

export interface LogisticsDashboardLayoutProps {
  title: string;
  subtitle?: string;
  activeTab: string;
  onTabChange: (id: string) => void;
  navItems: NavItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isSyncing?: boolean;
  children: ReactNode;
}

export const LogisticsDashboardLayout: React.FC<
  LogisticsDashboardLayoutProps
> = ({
  title,
  subtitle,
  activeTab,
  onTabChange,
  navItems,
  searchTerm,
  onSearchChange,
  isSyncing,
  children,
}) => {
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden selection:bg-blue-500/30">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] backdrop-blur-md">
            <LayoutDashboard size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-blue-400/80 font-medium tracking-wide uppercase mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-2 px-2 bg-slate-900/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl shadow-inner">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const baseClasses =
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out";
            const activeClasses =
              "bg-slate-800/80 text-white shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-white/10";
            const inactiveClasses =
              "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent";

            if (item.href) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`${baseClasses} ${inactiveClasses}`}
                >
                  {item.icon} {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              >
                {item.icon} {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="relative w-64 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder-slate-500 transition-all backdrop-blur-md shadow-inner"
            />
          </div>
          {isSyncing && (
            <div className="p-2 bg-blue-500/10 rounded-full border border-blue-500/20">
              <RefreshCw size={18} className="animate-spin text-blue-400" />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="h-full p-6">{children}</div>
      </main>
    </div>
  );
};
