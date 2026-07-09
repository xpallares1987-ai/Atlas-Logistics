import React, { useMemo } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Ship,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Package,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export default function AppLayout() {
  const location = useLocation();
  const { user, role, logout } = useAuth();

  const navItems = useMemo(() => {
    const items = [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "Shipments", path: "/shipments", icon: Ship },
      { name: "Documents", path: "/docs", icon: FileText },
    ];

    if (role === "ADMIN" || role === "SALES") {
      items.push({ name: "CRM", path: "/crm", icon: Users });
      items.push({ name: "Rates", path: "/rates", icon: TrendingUp });
    }

    if (role === "ADMIN" || role === "WAREHOUSE") {
      items.push({ name: "WMS", path: "/wms", icon: Package });
      items.push({ name: "Consolidation", path: "/consolidation", icon: Package });
    }

    if (role === "ADMIN") {
      items.push({ name: "Workflows", path: "/workflows", icon: Settings });
      items.push({ name: "Team & Roles", path: "/settings/users", icon: Users });
    }

    return items;
  }, [role]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-4 bg-slate-950 text-white font-bold text-xl flex items-center gap-2 border-b border-slate-800">
          <Ship className="w-6 h-6 text-blue-500" />
          <span>Atlas Logistics</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">
            {navItems.find(
              (i) =>
                location.pathname === i.path ||
                (i.path !== "/" && location.pathname.startsWith(i.path)),
            )?.name || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-sm font-semibold text-gray-800">
                {user?.email}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {role || "Loading..."}
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold uppercase overflow-hidden ring-2 ring-blue-500/20">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.email?.charAt(0) || "A"
              )}
            </div>
            <button
              onClick={logout}
              className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
