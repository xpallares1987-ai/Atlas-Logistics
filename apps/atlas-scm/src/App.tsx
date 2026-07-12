import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./components/auth/AuthProvider";
import Login from "./pages/Login";
import { AdminRoute } from "./components/auth/AdminRoute";
import ComingSoon from "./components/ComingSoon";

// Lazy-loaded route modules — Vite code-splits each into its own async chunk,
// so the initial bundle only includes the auth shell and layout.
const DashboardApp = lazy(
  () => import("@/modules/dashboard/app/DashboardClient"),
);
const FreightComparerApp = lazy(
  () => import("@/modules/freight-comparer/index"),
);
const WorkflowsPage = lazy(() => import("./pages/Workflows"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const CRMPage = lazy(() => import("./pages/CRM"));
const WMSPage = lazy(() => import("./pages/WMS"));
const DocumentsPage = lazy(() => import("./pages/Documents"));
const ConsolidationPage = lazy(() => import("./pages/Consolidation"));
const MasterDataPage = lazy(() => import("./pages/MasterData").then(m => ({ default: m.MasterData })));
const ProcurementPage = lazy(() => import("./pages/Procurement"));

const RouteLoader = () => (
  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
    Loading…
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Main Landing / Shipment Dashboard */}
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteLoader />}>
                <DashboardApp />
              </Suspense>
            }
          />

          {/* Modules */}
          <Route
            path="/shipments"
            element={
              <Suspense fallback={<RouteLoader />}>
                <DashboardApp />
              </Suspense>
            }
          />
          <Route
            path="/rates"
            element={
              <Suspense fallback={<RouteLoader />}>
                <FreightComparerApp />
              </Suspense>
            }
          />
          <Route
            path="/workflows"
            element={
              <Suspense fallback={<RouteLoader />}>
                <WorkflowsPage />
              </Suspense>
            }
          />

          {/* Modules */}
          <Route
            path="/crm"
            element={
              <Suspense fallback={<RouteLoader />}>
                <CRMPage />
              </Suspense>
            }
          />
          <Route
            path="/procurement"
            element={
              <Suspense fallback={<RouteLoader />}>
                <ProcurementPage />
              </Suspense>
            }
          />
          <Route
            path="/wms"
            element={
              <Suspense fallback={<RouteLoader />}>
                <WMSPage />
              </Suspense>
            }
          />
          <Route
            path="/docs"
            element={
              <Suspense fallback={<RouteLoader />}>
                <DocumentsPage />
              </Suspense>
            }
          />
          <Route
            path="/consolidation"
            element={
              <Suspense fallback={<RouteLoader />}>
                <ConsolidationPage />
              </Suspense>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/settings/users"
            element={
              <AdminRoute>
                <Suspense fallback={<RouteLoader />}>
                  <UserManagement />
                </Suspense>
              </AdminRoute>
            }
          />
          <Route
            path="/master-data"
            element={
              <AdminRoute>
                <Suspense fallback={<RouteLoader />}>
                  <MasterDataPage />
                </Suspense>
              </AdminRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ComingSoon
                module="Settings"
                description="Configure application preferences, integrations, and account settings."
              />
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
