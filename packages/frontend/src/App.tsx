import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BadgeDollarSign, Globe2, Activity, Leaf, Clock, Package, Cuboid, ListTodo, FileText, Settings, Bell, Bot, Boxes, Calendar, BookOpen, ShieldAlert, Landmark, Users } from 'lucide-react';
import { OmniSearch } from '@atlas/ui/src/components/OmniSearch';
import { useAppStore } from './store/useAppStore';

const DashboardModule = React.lazy(() => import('@atlas/dashboard').then(m => ({ default: m.Dashboard })));
// @ts-ignore
const RateComparerModule = React.lazy(() => import('@atlas/rate-comparer').then(m => ({ default: m.RateComparer })));
const ESGCarbonTrackerModule = React.lazy(() => import('./pages/ESGCarbonTrackerModule'));
const ContainerPlannerModule = React.lazy(() => import('./pages/ContainerPlannerModule'));
const HumanTasklistModule = React.lazy(() => import('./pages/HumanTasklistModule'));
const ProfitabilityModule = React.lazy(() => import('./pages/ProfitabilityModule'));
const GlobeTrackerModule = React.lazy(() => import('./pages/GlobeTrackerModule'));
const DemurrageAlertsModule = React.lazy(() => import('./pages/DemurrageAlertsModule'));
const LclConsolidationModule = React.lazy(() => import('./pages/LclConsolidationModule'));
const DynamicPricingModule = React.lazy(() => import('./pages/DynamicPricingModule'));
const DocumentVaultModule = React.lazy(() => import('./pages/DocumentVaultModule'));
const AIChainAssistantModule = React.lazy(() => import('./pages/AIChainAssistantModule'));
const Warehouse3DModule = React.lazy(() => import('./pages/Warehouse3DModule'));
const SailingSchedulesModule = React.lazy(() => import('./pages/SailingSchedulesModule'));
const BookingManagementModule = React.lazy(() => import('./pages/BookingManagementModule'));
const CustomsClearanceModule = React.lazy(() => import('./pages/CustomsClearanceModule'));
const InvoicingModule = React.lazy(() => import('./pages/InvoicingModule'));
const CustomerPortalModule = React.lazy(() => import('./pages/CustomerPortalModule'));
const SettingsModule = React.lazy(() => import('./pages/SettingsModule'));

const AiCopilot = React.lazy(() => import('@atlas/ui/src/components/AiCopilot').then(m => ({ default: m.AiCopilot })));

function NavLink({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`p-3 flex items-center gap-3 rounded-xl transition-all font-medium border ${isActive ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-indigo-300 border-transparent'}`}
    >
      <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
      {children}
    </Link>
  );
}

export default function App() {
  const { 
    user,
    theme,
    isNotificationsOpen, toggleNotifications,
    isSettingsMenuOpen, toggleSettingsMenu, setSettingsMenuOpen,
    isCopilotOpen, setCopilotOpen
  } = useAppStore();

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className={`flex h-screen font-sans ${theme === 'dark' ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        {/* Sidebar Shell */}
        <aside className="w-72 bg-slate-950 text-slate-300 p-6 flex flex-col gap-8 z-50 shadow-2xl border-r border-slate-800/60 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Globe2 size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-widest text-white">ATLAS<span className="text-indigo-500">.</span></h1>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">Core</span>
            <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/quotes" icon={BadgeDollarSign}>Rate Comparer</NavLink>
            <NavLink to="/pricing" icon={Activity}>Dynamic Pricing</NavLink>
            <NavLink to="/globe" icon={Globe2}>Globe Tracker</NavLink>
            <NavLink to="/schedules" icon={Calendar}>Sailing Schedules</NavLink>
            <NavLink to="/bookings" icon={BookOpen}>Booking & B/L</NavLink>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">Finance & Compliance</span>
            <NavLink to="/invoices" icon={Landmark}>Invoicing</NavLink>
            <NavLink to="/customs" icon={ShieldAlert}>Customs Clearance</NavLink>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">Analytics</span>
            <NavLink to="/profitability" icon={Activity}>Profitability</NavLink>
            <NavLink to="/esg-tracker" icon={Leaf}>Carbon Tracker</NavLink>
            <NavLink to="/demurrage" icon={Clock}>Demurrage Alerts</NavLink>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">Operations</span>
            <NavLink to="/planner" icon={Package}>Container Planner</NavLink>
            <NavLink to="/lcl" icon={Cuboid}>LCL Engine</NavLink>
            <NavLink to="/warehouse" icon={Boxes}>Warehouse 3D</NavLink>
            <NavLink to="/tasks" icon={ListTodo}>Tasklist</NavLink>
            <NavLink to="/documents" icon={FileText}>Document Vault</NavLink>
            <NavLink to="/ai-assistant" icon={Bot}>AI Assistant</NavLink>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">External Views</span>
            <NavLink to="/portal" icon={Users}>Client Portal</NavLink>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
          
          {/* Top Navbar */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-40 shrink-0">
            <div className="flex-1 max-w-xl">
              <OmniSearch />
            </div>
            <div className="flex items-center gap-4 ml-4">
              <div className="relative">
                <button 
                  onClick={toggleNotifications}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative"
                >
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                </button>
                {isNotificationsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">Notifications</h3>
                      <span className="text-xs text-indigo-600 cursor-pointer hover:underline font-medium">Mark all as read</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                          <Activity size={14} className="text-rose-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-800 font-medium">Demurrage Risk High</p>
                          <p className="text-xs text-slate-500 mt-0.5">Container MSK-99238 nearing free time limit at Port of Long Beach.</p>
                          <p className="text-[10px] text-slate-400 mt-1">10 mins ago</p>
                        </div>
                      </div>
                      <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-800 font-medium">Customs Cleared</p>
                          <p className="text-xs text-slate-500 mt-0.5">Shipment BL-44912 has been cleared by customs in Rotterdam.</p>
                          <p className="text-[10px] text-slate-400 mt-1">2 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button 
                  onClick={toggleSettingsMenu}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Settings size={20} />
                </button>
                {isSettingsMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden py-2">
                    <div className="px-4 py-3 border-b border-slate-100 mb-1">
                      <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <Link to="/settings" onClick={() => setSettingsMenuOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">Profile Preferences</Link>
                    <Link to="/settings" onClick={() => setSettingsMenuOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">Company Settings</Link>
                    <Link to="/settings" onClick={() => setSettingsMenuOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">API Keys</Link>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button onClick={() => { setSettingsMenuOpen(false); alert('Signed out successfully'); }} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors">Sign out</button>
                  </div>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold text-sm ml-2">
                {user?.avatarInitials}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-hidden relative">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 font-medium">Loading Module...</div>}>
              <Routes>
                <Route path="/" element={<DashboardModule />} />
                <Route path="/quotes" element={<RateComparerModule />} />
                <Route path="/pricing" element={<DynamicPricingModule />} />
                <Route path="/esg-tracker" element={<ESGCarbonTrackerModule />} />
                <Route path="/planner" element={<ContainerPlannerModule />} />
                <Route path="/profitability" element={<ProfitabilityModule />} />
                <Route path="/tasks" element={<HumanTasklistModule />} />
                <Route path="/globe" element={<GlobeTrackerModule />} />
                <Route path="/demurrage" element={<DemurrageAlertsModule />} />
                <Route path="/lcl" element={<LclConsolidationModule />} />
                <Route path="/documents" element={<DocumentVaultModule />} />
                <Route path="/warehouse" element={<Warehouse3DModule />} />
                <Route path="/ai-assistant" element={<AIChainAssistantModule />} />
                <Route path="/schedules" element={<SailingSchedulesModule />} />
                <Route path="/bookings" element={<BookingManagementModule />} />
                <Route path="/customs" element={<CustomsClearanceModule />} />
                <Route path="/invoices" element={<InvoicingModule />} />
                <Route path="/portal" element={<CustomerPortalModule />} />
                <Route path="/settings" element={<SettingsModule />} />
              </Routes>
            </Suspense>
          </div>

          {/* Floating AI Copilot */}
          <div className="absolute bottom-6 right-6 z-[100]">
            {isCopilotOpen ? (
              <div className="w-[400px] h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-700 bg-slate-900 relative">
                <button 
                  onClick={() => setCopilotOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
                >
                  ✕
                </button>
                <Suspense fallback={<div className="p-4 text-white">Cargando Copilot...</div>}>
                  <AiCopilot />
                </Suspense>
              </div>
            ) : (
              <button 
                onClick={() => setCopilotOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all hover:scale-105 flex items-center justify-center group"
              >
                <div className="absolute -inset-1 bg-indigo-500 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
              </button>
            )}
          </div>
        </main>
      </div>
    </Router>
  );
}
