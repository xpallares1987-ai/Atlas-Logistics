"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getNotifications, getPreferences } from "@/lib/notifications";
import {
  LayoutDashboard,
  Anchor,
  FileText,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  User,
  PlusCircle,
  Leaf,
  Check,
  Mail,
  Sliders,
  AlertTriangle,
  Info,
  DollarSign,
  ShieldCheck,
  Warehouse
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  // Notification states
  const [isMounted, setIsMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<any>({
    etdEnabled: true,
    etaEnabled: true,
    customsEnabled: true,
    bookingEnabled: true,
    emailNotifications: true,
    pushNotifications: true,
    emailAddress: "x.pallares1987@gmail.com"
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<"notifs" | "prefs">("notifs");
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    
    // Retrieve initial data
    try {
      setNotifications(getNotifications());
      setPrefs(getPreferences());
    } catch (e) {
      console.error(e);
    }

    // Dynamic browser listeners for system events
    const handleNewNotif = (e: any) => {
      const newNotif = e.detail;
      setNotifications(prev => [newNotif, ...prev]);
      
      // Auto-append live visual Toast
      setToasts(prev => [
        ...prev,
        {
          id: `toast-${Date.now()}-${Math.random()}`,
          title: newNotif.title,
          description: newNotif.description,
          type: newNotif.type,
          isEmail: false
        }
      ]);
    };

    const handleEmailNotificationGroup = (e: any) => {
      const { to, subject } = e.detail;
      setToasts(prev => [
        ...prev,
        {
          id: `toast-email-${Date.now()}-${Math.random()}`,
          title: "✉️ Correo Alerta SCM Enviado",
          description: `Notificado a: ${to}\nSin demoras de red.`,
          isEmail: true
        }
      ]);
    };

    const handleNotifsChanged = () => {
      try {
        setNotifications(getNotifications());
      } catch (e) {}
    };

    window.addEventListener("forwarderos_new_notification", handleNewNotif);
    window.addEventListener("forwarderos_email_sent", handleEmailNotificationGroup);
    window.addEventListener("forwarderos_notifications_changed", handleNotifsChanged);

    return () => {
      window.removeEventListener("forwarderos_new_notification", handleNewNotif);
      window.removeEventListener("forwarderos_email_sent", handleEmailNotificationGroup);
      window.removeEventListener("forwarderos_notifications_changed", handleNotifsChanged);
    };
  }, []);

  // Dismiss a toast
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auto Dismiss logic
  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1];
      const timer = setTimeout(() => {
        removeToast(latest.id);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tracking?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Mark single as read
  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem("forwarderos_notifications_list", JSON.stringify(updated));
  };

  // Mark all count as read
  const handleMarkAllRead = () => {
    try {
      const { markAllAsRead } = require("@/lib/notifications");
      markAllAsRead();
    } catch (e) {}
  };

  // Clear notify stream
  const handleClearAll = () => {
    try {
      const { clearAllNotifications } = require("@/lib/notifications");
      clearAllNotifications();
    } catch (e) {}
  };

  // Toggle preferences
  const handleTogglePref = (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      const { savePreferences } = require("@/lib/notifications");
      savePreferences(updated);
    } catch (e) {}
  };

  // Email input field update
  const handleEmailAddrChange = (val: string) => {
    const updated = { ...prefs, emailAddress: val };
    setPrefs(updated);
    try {
      const { savePreferences } = require("@/lib/notifications");
      savePreferences(updated);
    } catch (e) {}
  };

  const navItems = [
    { name: "Nuevo Embarque", href: "/bookings/new", icon: PlusCircle },
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Cotizaciones", href: "/quotes", icon: FileText },
    { name: "Tarifas", href: "/rates", icon: Anchor },
    { name: "Tracking & Ops", href: "/tracking", icon: Anchor },
    { name: "Finanzas & P&L", href: "/financial", icon: DollarSign },
    { name: "Aduanas & Compliance", href: "/customs", icon: ShieldCheck },
    { name: "WMS & Inventario", href: "/wms", icon: Warehouse },
    { name: "Sostenibilidad CO2", href: "/sustainability", icon: Leaf },
    { name: "Pipeline", href: "/pipeline", icon: LayoutDashboard },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div id="scm-app-layout" className="flex h-screen bg-[#0A0A0B] font-sans antialiased text-gray-200 overflow-hidden relative">
      
      {/* Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 relative transition-all ${
              toast.isEmail 
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100" 
                : "bg-slate-900/95 border-blue-500/30 text-slate-100"
            }`}
          >
            <div className="flex-1">
              <span className="text-xs font-bold block mb-0.5">
                {toast.isEmail ? "✉️ ALERTA ENVIADA POR CORREO" : `🔔 NOTIFICACIÓN SCM: ${toast.type || 'HITO'}`}
              </span>
              <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-line">{toast.description}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-[#111114] border-r border-gray-800/40 flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-800/30">
          <Anchor className="w-6 h-6 text-blue-500 mr-2" />
          <span className="font-bold text-lg tracking-tight text-white">
            Forwarder<span className="text-blue-500">OS</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/10"
                    : "text-gray-400 hover:bg-gray-800/30 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex-shrink-0 bg-[#16161A] border-b border-gray-800/40 px-6 flex items-center justify-between">
          <div className="flex items-center flex-1">
            <button
              className="md:hidden p-2 text-gray-400 hover:text-white mr-4"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block w-full max-w-md">
              <form onSubmit={handleSearch} className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="search-desktop"
                  name="search"
                  placeholder="Buscar BL, Referencia... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0A0A0B] border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </form>
            </div>
          </div>
          
          <div className="flex items-center space-x-5 relative">
            
            {/* Interactive Bell Icon & Dropdown Container */}
            <div className="relative">
              <button 
                id="scm-bell-notification-trigger"
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 text-gray-400 hover:text-white relative transition-colors cursor-pointer"
              >
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[8.5px] font-mono leading-none bg-blue-600 text-white rounded-full font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
                <Bell className="w-5 h-5" />
              </button>

              {/* Collapsed Tray/Popover */}
              {showDropdown && (
                <div 
                  id="scm-notifications-tray-dropdown"
                  className="absolute right-0 mt-3 w-80 bg-[#111114] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-200"
                >
                  {/* Tray Tabs */}
                  <div className="flex bg-[#0A0A0B] border-b border-gray-800/80 text-[10.5px] font-bold uppercase tracking-wider">
                    <button 
                      onClick={() => setDropdownTab("notifs")}
                      className={`flex-1 py-3 text-center border-b-2 transition ${
                        dropdownTab === "notifs" ? "border-blue-500 text-white" : "border-transparent text-gray-500"
                      }`}
                    >
                      Alertas ({unreadCount})
                    </button>
                    <button 
                      onClick={() => setDropdownTab("prefs")}
                      className={`flex-1 py-3 text-center border-b-2 transition ${
                        dropdownTab === "prefs" ? "border-blue-500 text-gold text-white" : "border-transparent text-gray-500"
                      }`}
                    >
                      Ajustes Notificaciones
                    </button>
                  </div>

                  {/* Tray Body */}
                  <div className="max-h-72 overflow-y-auto">
                    {dropdownTab === "notifs" ? (
                      <div className="p-3 space-y-2">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500 italic text-xs">
                            No tienes notificaciones registradas.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => handleMarkAsRead(notif.id)}
                              className={`p-2.5 rounded-lg border text-[10.5px] transition cursor-pointer relative ${
                                notif.read 
                                  ? "bg-transparent border-gray-800/30 text-gray-400" 
                                  : "bg-blue-600/5 border-blue-500/20 text-gray-200"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-white block mb-0.5">{notif.title}</span>
                                {!notif.read && (
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <p className="text-[9.5px] text-gray-400 mt-1 line-clamp-3 leading-relaxed">{notif.description}</p>
                              {notif.shipmentRef && (
                                <span className="text-[8px] font-mono text-blue-400 font-bold tracking-wider mt-1.5 block">REF: {notif.shipmentRef}</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      // Preferences subview
                      <div className="p-4 space-y-3.5 text-xs text-gray-300">
                        <span className="text-[10px] text-gray-500 font-bold uppercase block pb-1 border-b border-gray-800/60">Disparadores Logísticos SCM</span>
                        
                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefs.etdEnabled} 
                            onChange={() => handleTogglePref("etdEnabled")}
                            className="bg-[#0A0A0B] rounded border border-gray-800"
                          />
                          <span>Salidas Marítimas (Alertas de ETD)</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefs.etaEnabled} 
                            onChange={() => handleTogglePref("etaEnabled")}
                          />
                          <span>Llegadas de Buque (Alertas de ETA)</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefs.customsEnabled} 
                            onChange={() => handleTogglePref("customsEnabled")}
                          />
                          <span>Aduana de Puerto (Liberados/Retenidos)</span>
                        </label>

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefs.bookingEnabled} 
                            onChange={() => handleTogglePref("bookingEnabled")}
                          />
                          <span>Altas y Bookings de Carga</span>
                        </label>

                        <span className="text-[10px] text-gray-500 font-bold uppercase block pt-2 pb-1 border-b border-gray-800/60">Canales habilitados</span>
                        
                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefs.emailNotifications} 
                            onChange={() => handleTogglePref("emailNotifications")}
                          />
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-emerald-500" /> Correo de Alerta (Email)</span>
                        </label>

                        {prefs.emailNotifications && (
                          <div className="mt-1 pl-6">
                            <label className="text-[9px] text-gray-500 block mb-0.5">Dirección de correo destinatario</label>
                            <input 
                              type="email"
                              value={prefs.emailAddress}
                              onChange={e => handleEmailAddrChange(e.target.value)}
                              placeholder="ejemplo@logistica.com"
                              className="w-full bg-[#0A0A0B] border border-gray-850 rounded px-2 py-1 text-[11px] focus:outline-none"
                            />
                          </div>
                        )}

                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prefs.pushNotifications} 
                            onChange={() => handleTogglePref("pushNotifications")}
                          />
                          <span>Push Logs en Pantalla</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Tray Footer */}
                  {dropdownTab === "notifs" && notifications.length > 0 && (
                    <div className="p-2 border-t border-gray-800 bg-[#0A0A0B] flex text-[9.5px] text-gray-400 font-bold items-center justify-between">
                      <button 
                        onClick={handleMarkAllRead}
                        className="hover:text-white px-2 py-1"
                      >
                        Marcar todo leído
                      </button>
                      <button 
                        onClick={handleClearAll}
                        className="hover:text-red-400 px-2 py-1"
                      >
                        Limpiar todo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-l border-gray-800 pl-5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-200">Xavier P.</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  Admin
                </p>
              </div>
              <div className="h-9 w-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg border border-gray-800">
                XP
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#0A0A0B]">{children}</main>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="relative w-64 max-w-xs bg-[#111114] flex flex-col pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="p-2 text-gray-400 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center px-6 mb-6">
              <Anchor className="w-6 h-6 text-blue-500 mr-2" />
              <span className="font-bold text-lg tracking-tight text-white">
                Forwarder<span className="text-blue-500">OS</span>
              </span>
            </div>

            <div className="px-6 mb-6">
              <form onSubmit={handleSearch} className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="search-mobile"
                  name="search"
                  placeholder="Buscar BL, Contenedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0A0A0B] border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </form>
            </div>

            <div className="mt-5 flex-1 h-0 overflow-y-auto px-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50"
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
