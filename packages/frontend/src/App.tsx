import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  BadgeDollarSign,
  Globe2,
  Activity,
  Leaf,
  Clock,
  Package,
  Cuboid,
  ListTodo,
  FileText,
  Settings,
  Bell,
  Boxes,
  Calendar,
  Book,
  Briefcase,
  ShieldAlert,
  Landmark,
  Users,
  Menu,
  X
} from "lucide-react";
import { OmniSearch } from "@atlas/ui/src/components/OmniSearch";
import { useAppStore } from "./store/useAppStore";
import { useTranslation } from "react-i18next";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { ApiStatusProvider } from "./contexts/ApiStatusContext";
import { ApiStatusIndicator } from "./components/ApiStatusIndicator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const Login = React.lazy(() => import("./pages/Login"));

const DashboardModule = React.lazy(() => import("./pages/DashboardModule"));
// @ts-ignore
const RateComparerModule = React.lazy(() =>
  import("@atlas/rate-comparer").then((m) => ({ default: m.RateComparer })),
);
const ESGCarbonTrackerModule = React.lazy(
  () => import("./pages/ESGCarbonTrackerModule"),
);
const ContainerPlannerModule = React.lazy(
  () => import("./pages/ContainerPlannerModule"),
);
const HumanTasklistModule = React.lazy(
  () => import("./pages/HumanTasklistModule"),
);
const ProfitabilityModule = React.lazy(
  () => import("./pages/ProfitabilityModule"),
);
const GlobeTrackerModule = React.lazy(
  () => import("./pages/GlobeTrackerModule"),
);
const DemurrageAlertsModule = React.lazy(
  () => import("./pages/DemurrageAlertsModule"),
);
const LclConsolidationModule = React.lazy(
  () => import("./pages/LclConsolidationModule"),
);
const DynamicPricingModule = React.lazy(
  () => import("./pages/DynamicPricingModule"),
);
const DocumentVaultModule = React.lazy(
  () => import("./pages/DocumentVaultModule"),
);

const WarehouseOpsModule = React.lazy(
  () => import("./pages/WarehouseOpsModule"),
);
const SailingSchedulesModule = React.lazy(
  () => import("./pages/SailingSchedulesModule"),
);
const BookingManagementModule = React.lazy(
  () => import("./pages/BookingManagementModule"),
);
const CustomsClearanceModule = React.lazy(
  () => import("./pages/CustomsClearanceModule"),
);
const InvoicingModule = React.lazy(() => import("./pages/InvoicingModule"));
const AgentSettlementsModule = React.lazy(() => import("./pages/AgentSettlementsModule"));
const CustomerPortalModule = React.lazy(
  () => import("./pages/CustomerPortalModule"),
);

const WorkflowManagerModule = React.lazy(
  () => import("./pages/WorkflowManagerModule"),
);
const SettingsModule = React.lazy(() => import("./pages/SettingsModule"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const PublicTracking = React.lazy(() => import("./pages/PublicTracking"));

function NavLink({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon: any;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const location = useLocation();
  // Consider a link active if the current path starts with the target path (handles nested routes)
  const isActive = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`p-3 flex items-center gap-3 rounded-xl transition-all font-medium border ${isActive ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-indigo-300 border-transparent"}`}
    >
      <Icon
        size={18}
        className={isActive ? "text-indigo-400" : "text-slate-500"}
      />
      {children}
    </Link>
  );
}

export default function App() {
  const {
    user,
    theme,
    isNotificationsOpen,
    toggleNotifications,
    isSettingsMenuOpen,
    toggleSettingsMenu,
    setSettingsMenuOpen,

    notifications,
    addNotification,
    markAllNotificationsAsRead,
    isAuthLoading,
    checkAuth,
    logout,
  } = useAppStore();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    checkAuth();
  }, []);

  const role = user?.role || "USER";

  const isShipper = role === "CUSTOMER";
  const isCustomsBroker = role === "OPERATIONS";
  const isAdminOrFF =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "EXECUTIVE" ||
    role === "SALES";

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <SkeletonLoader height="8rem" borderRadius="1rem" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ApiStatusProvider onNotification={addNotification}>
        <Router>
          <div
            className={`flex h-screen font-sans overflow-hidden ${theme === "dark" ? "dark bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}
          >
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden" 
                onClick={() => setMobileMenuOpen(false)}
              />
            )}

            {/* Sidebar Shell */}
            <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition duration-200 ease-in-out w-72 bg-slate-950 text-slate-300 p-6 flex flex-col gap-8 z-50 shadow-2xl border-r border-slate-800/60 overflow-y-auto`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Globe2 size={24} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-black tracking-widest text-white">
                    ATLAS<span className="text-indigo-500">.</span>
                  </h1>
                </div>
                <button 
                  className="md:hidden text-slate-400 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
                  Core
                </span>
                {(isAdminOrFF || isCustomsBroker || isShipper) && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/" icon={LayoutDashboard}>
                    {t("sidebar.dashboard")}
                  </NavLink>
                )}
                {(isAdminOrFF || isShipper) && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/quotes" icon={BadgeDollarSign}>
                    {t("sidebar.rateComparer")}
                  </NavLink>
                )}
                {isAdminOrFF && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/pricing" icon={Activity}>
                    {t("sidebar.pricing")}
                  </NavLink>
                )}
                {(isAdminOrFF || isShipper) && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/globe" icon={Globe2}>
                    {t("sidebar.globeTracker")}
                  </NavLink>
                )}
                {isAdminOrFF && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/schedules" icon={Calendar}>
                    {t("sidebar.schedules")}
                  </NavLink>
                )}
                {isAdminOrFF && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/bookings" icon={Book}>
                    {t("sidebar.bookings")}
                  </NavLink>
                )}
              </div>

              {(isAdminOrFF || isCustomsBroker) && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
                    Finance & Compliance
                  </span>
                  {isAdminOrFF && (
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/invoices" icon={Landmark}>
                      {t("sidebar.invoicing")}
                    </NavLink>
                  )}
                  {isAdminOrFF && (
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/settlements" icon={Briefcase}>
                      Agent Settlements
                    </NavLink>
                  )}
                  {(isAdminOrFF || isCustomsBroker) && (
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/customs" icon={ShieldAlert}>
                      {t("sidebar.customs")}
                    </NavLink>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
                  Analytics
                </span>
                {isAdminOrFF && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/profitability" icon={Activity}>
                    {t("sidebar.profitability")}
                  </NavLink>
                )}
                {(isAdminOrFF || isShipper) && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/esg-tracker" icon={Leaf}>
                    {t("sidebar.carbonTracker")}
                  </NavLink>
                )}
                {(isAdminOrFF || isCustomsBroker) && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/demurrage" icon={Clock}>
                    {t("sidebar.demurrage")}
                  </NavLink>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
                  Operations
                </span>
                {isAdminOrFF && (
                  <>
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/planner" icon={Package}>
                      {t("sidebar.planner")}
                    </NavLink>
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/lcl" icon={Cuboid}>
                      {t("sidebar.lclEngine")}
                    </NavLink>
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/warehouse" icon={Boxes}>
                      {t("sidebar.warehouse")}
                    </NavLink>
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/tasks" icon={ListTodo}>
                      {t("sidebar.tasklist")}
                    </NavLink>
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/documents" icon={FileText}>
                      {t("sidebar.documents")}
                    </NavLink>
                    <NavLink onClick={() => setMobileMenuOpen(false)} to="/workflows" icon={Settings}>
                      Workflows Modeler
                    </NavLink>
                  </>
                )}
                {(isAdminOrFF || isCustomsBroker) && (
                  <NavLink onClick={() => setMobileMenuOpen(false)} to="/bookings" icon={FileText}>
                    EDI/XML Parser
                  </NavLink>
                )}

              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest mb-1 px-3">
                  External Views
                </span>
                <NavLink onClick={() => setMobileMenuOpen(false)} to="/portal" icon={Users}>
                  {t("sidebar.customerPortal")}
                </NavLink>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 w-full">
              {/* Top Navbar */}
              <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-30 shrink-0">
                <div className="flex-1 flex items-center gap-4">
                  <button 
                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <Menu size={24} />
                  </button>
                  <div className="max-w-xl hidden md:flex items-center gap-6 w-full">
                    <OmniSearch />
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <ApiStatusIndicator />
                  <div className="relative">
                    <button
                      onClick={toggleNotifications}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative"
                    >
                      <Bell size={20} />
                      {notifications.filter((n) => !n.read).length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                      )}
                    </button>
                    {isNotificationsOpen && (
                      <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                          <h3 className="font-bold text-slate-800">
                            Notifications
                          </h3>
                          <span
                            onClick={markAllNotificationsAsRead}
                            className="text-xs text-indigo-600 cursor-pointer hover:underline font-medium"
                          >
                            Mark all as read
                          </span>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                              No new notifications
                            </div>
                          ) : (
                            notifications.map((n, idx) => (
                              <div
                                key={n.id || idx}
                                className={`p-4 border-b border-slate-50 transition-colors flex gap-3 ${n.read ? "opacity-50 bg-white" : "bg-slate-50"}`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === "warning" ? "bg-amber-100" : n.type === "error" ? "bg-rose-100" : "bg-indigo-100"}`}
                                >
                                  <Bell
                                    size={14}
                                    className={`${n.type === "warning" ? "text-amber-600" : n.type === "error" ? "text-rose-600" : "text-indigo-600"}`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm text-slate-800 font-medium">
                                    {n.title}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {n.message}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {new Date(n.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
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
                          <p className="text-sm font-bold text-slate-800">
                            {user?.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user?.email}
                          </p>
                        </div>
                        <Link
                          to="/settings#profile"
                          onClick={() => setSettingsMenuOpen(false)}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          {t("settings.profile")}
                        </Link>
                        <Link
                          to="/settings#company"
                          onClick={() => setSettingsMenuOpen(false)}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          {t("settings.company")}
                        </Link>
                        <Link
                          to="/settings#apikeys"
                          onClick={() => setSettingsMenuOpen(false)}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          {t("settings.apiKeys")}
                        </Link>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <button
                          onClick={async () => {
                            setSettingsMenuOpen(false);
                            await logout();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          {t("settings.signOut")}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold text-sm ml-2">
                    {user?.avatarInitials}
                  </div>
                </div>
              </header>

              {/* Page Content */}
              <div className="flex-1 overflow-hidden relative p-6">
                <Suspense
                  fallback={
                    <div className="flex flex-col gap-4 h-full w-full">
                      <SkeletonLoader height="8rem" borderRadius="1rem" />
                      <SkeletonLoader
                        height="3rem"
                        borderRadius="0.5rem"
                        count={3}
                      />
                      <div className="flex-1">
                        <SkeletonLoader height="100%" borderRadius="1rem" />
                      </div>
                    </div>
                  }
                >
                  <Routes>
                    {/* Public Route */}
                    <Route path="/login" element={<Login />} />

                    {/* Core Modules - Accessible by internal roles */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                            "OPERATIONS",
                          ]}
                        >
                          <DashboardModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/quotes"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                            "OPERATIONS",
                          ]}
                        >
                          <RateComparerModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pricing"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                          ]}
                        >
                          <DynamicPricingModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/globe"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                            "OPERATIONS",
                          ]}
                        >
                          <GlobeTrackerModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/schedules"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                            "OPERATIONS",
                          ]}
                        >
                          <SailingSchedulesModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bookings"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                            "OPERATIONS",
                          ]}
                        >
                          <BookingManagementModule />
                        </ProtectedRoute>
                      }
                    />

                    {/* Finance & Compliance - High Privilege */}
                    <Route
                      path="/invoices"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER"]}
                        >
                          <InvoicingModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settlements"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER"]}
                        >
                          <AgentSettlementsModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/customs"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}
                        >
                          <CustomsClearanceModule />
                        </ProtectedRoute>
                      }
                    />

                    {/* Analytics */}
                    <Route
                      path="/profitability"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "EXECUTIVE", "MANAGER"]}
                        >
                          <ProfitabilityModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/esg-tracker"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "OPERATIONS",
                          ]}
                        >
                          <ESGCarbonTrackerModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/demurrage"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}
                        >
                          <DemurrageAlertsModule />
                        </ProtectedRoute>
                      }
                    />

                    {/* Operations */}
                    <Route
                      path="/planner"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}
                        >
                          <ContainerPlannerModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/lcl"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}
                        >
                          <LclConsolidationModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/warehouse"
                      element={
                        <ProtectedRoute
                          allowedRoles={["ADMIN", "MANAGER", "OPERATIONS"]}
                        >
                          <WarehouseOpsModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tasks"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                            "OPERATIONS",
                          ]}
                        >
                          <HumanTasklistModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/documents"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "EXECUTIVE",
                            "MANAGER",
                            "SALES",
                            "OPERATIONS",
                          ]}
                        >
                          <DocumentVaultModule />
                        </ProtectedRoute>
                      }
                    />


                    <Route
                      path="/workflows"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                          <WorkflowManagerModule />
                        </ProtectedRoute>
                      }
                    />

                    {/* External Portal */}
                    <Route
                      path="/portal"
                      element={
                        <ProtectedRoute allowedRoles={["ADMIN", "CUSTOMER"]}>
                          <CustomerPortalModule />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/track/:referenceNumber?"
                      element={<PublicTracking />}
                    />

                    {/* Global Settings */}
                    <Route path="/settings" element={<SettingsModule />} />

                    {/* Legal Pages */}
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />

                    {/* Fallback 404 Route */}
                    <Route
                      path="*"
                      element={
                        <div className="flex items-center justify-center h-full text-slate-500 font-medium">
                          404 - Page Not Found
                        </div>
                      }
                    />
                  </Routes>
                </Suspense>
              </div>

              {/* Footer */}
              <footer className="h-12 border-t border-slate-200 bg-white flex items-center justify-between px-8 text-xs text-slate-500 z-40 shrink-0">
                <div>
                  &copy; {new Date().getFullYear()} Atlas Logistics Enterprise.
                  All rights reserved.
                </div>
                <div className="flex gap-4">
                  <Link
                    to="/privacy"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    to="/terms"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </div>
              </footer>
            </main>
          </div>
        </Router>
      </ApiStatusProvider>
    </QueryClientProvider>
  );
}
