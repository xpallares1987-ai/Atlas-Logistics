import React, { useMemo, useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Ship,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Package,
  TrendingUp,
  LogOut,
  X,
  Menu,
  Bell,
  MessageSquare,
  Search,
  Database,
  Briefcase
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import TenantSwitcher from "./TenantSwitcher";
// @ts-ignore
import { hasPermission } from "../../core/auth/rbac";

interface Tab {
  id: string;
  name: string;
  path: string;
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  
  // Persistent Tabs State
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "/", name: "Dashboard", path: "/" }
  ]);

  const navItems = useMemo(() => {
    const items = [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "Shipments", path: "/shipments", icon: Ship },
      { name: "Rates & Quotes", path: "/rates", icon: TrendingUp },
      { name: "Documents", path: "/docs", icon: FileText },
    ];

    if (hasPermission(role, "SALES") || hasPermission(role, "MANAGER")) {
      items.push({ name: "CRM", path: "/crm", icon: Users });
    }

    if (hasPermission(role, "PROCUREMENT") || hasPermission(role, "MANAGER")) {
      items.push({ name: "Procurement", path: "/procurement", icon: Briefcase });
    }

    if (hasPermission(role, "OPERATOR")) {
      items.push({ name: "WMS", path: "/wms", icon: Package });
      items.push({ name: "Consolidation", path: "/consolidation", icon: Package });
    }

    if (hasPermission(role, "EXECUTIVE")) {
      items.push({ name: "Master Data", path: "/master-data", icon: Database });
      items.push({ name: "Workflows", path: "/workflows", icon: Settings });
      items.push({ name: "Team & Roles", path: "/settings/users", icon: Users });
    }

    return items;
  }, [role]);

  // Sync current route to Tabs
  useEffect(() => {
    const currentItem = navItems.find(
      (i) => location.pathname === i.path || (i.path !== "/" && location.pathname.startsWith(i.path))
    );
    
    if (currentItem) {
      setTabs(prev => {
        if (!prev.find(t => t.path === currentItem.path)) {
          return [...prev, { id: currentItem.path, name: currentItem.name, path: currentItem.path }];
        }
        return prev;
      });
    }
  }, [location.pathname, navItems]);

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.path !== path);
    setTabs(newTabs);
    
    // If we closed the active tab, navigate to the last available tab
    if (location.pathname === path && newTabs.length > 0) {
      navigate(newTabs[newTabs.length - 1].path);
    } else if (newTabs.length === 0) {
      navigate("/");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* LEFT SIDEBAR */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-64"} shrink-0 z-20`}>
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <Ship className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && <span className="font-black text-white tracking-wide truncate">ATLAS SCM</span>}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-500 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {!sidebarCollapsed && <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Modules</div>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.name}
                to={item.path}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                  isActive 
                    ? "bg-indigo-500/10 text-indigo-400 font-bold" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full" />}
                <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase shrink-0 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.email?.charAt(0) || "U"
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-200 truncate">{user?.email?.split('@')[0]}</div>
              <div className="text-xs text-slate-500 truncate">{role || "Operator"}</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={logout} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative z-10">
        
        {/* Top Navbar / Tabs Area */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-end px-2 shrink-0 select-none">
          {/* Tabs List */}
          <div className="flex-1 flex items-end gap-1 overflow-x-auto hide-scrollbar h-full pt-2">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path || (tab.path !== "/" && location.pathname.startsWith(tab.path));
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`group relative flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] border-t border-x rounded-t-xl transition-colors ${
                    isActive 
                      ? "bg-slate-950 border-slate-800 text-indigo-400 z-10" 
                      : "bg-slate-900 border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  {isActive && <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-xl" />}
                  <span className="text-sm font-semibold truncate flex-1">{tab.name}</span>
                  {tabs.length > 1 && (
                    <button 
                      onClick={(e) => closeTab(e, tab.path)}
                      className={`p-0.5 rounded-md transition-colors ${isActive ? "hover:bg-slate-800" : "hover:bg-slate-700"} opacity-0 group-hover:opacity-100`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Global Actions */}
          <div className="h-full flex items-center gap-2 px-4 pb-1">
            <div className="mr-4">
              <TenantSwitcher />
            </div>
            <div className="relative hidden md:block mr-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search shipments, quotes..." 
                className="bg-slate-950 border border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors w-64 text-slate-200 placeholder-slate-600"
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900"></span>
            </button>
            <button 
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`p-2 rounded-full transition-colors ${rightPanelOpen ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-auto bg-slate-950 relative">
          <Outlet />
        </main>
      </div>

      {/* RIGHT CONTEXT PANEL */}
      {rightPanelOpen && (
        <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-30 shadow-2xl absolute right-0 top-0 h-full transform transition-transform duration-300">
          <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/50">
            <h3 className="font-bold text-white">Context & Activity</h3>
            <button onClick={() => setRightPanelOpen(false)} className="text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-center text-slate-500 text-sm mt-10">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select a shipment or quote to see context, activity logs, and chat.</p>
            </div>
          </div>
        </aside>
      )}

    </div>
  );
}
