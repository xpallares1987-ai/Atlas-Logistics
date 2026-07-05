import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import Login from './pages/Login';
import { AdminRoute } from './components/auth/AdminRoute';
import ComingSoon from './components/ComingSoon';

// Lazy-loaded route modules — Vite code-splits each into its own async chunk,
// so the initial bundle only includes the auth shell and layout.
const DashboardApp = lazy(() => import('@atlas/dashboard/src/app/DashboardClient'));
const FreightComparerApp = lazy(() => import('@atlas/freight-comparer/src/index'));
const WorkflowsPage = lazy(() => import('./pages/Workflows'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

const RouteLoader = () => (
  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
    Loading…
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;
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
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          {/* Main Landing / Shipment Dashboard */}
          <Route path="/" element={<Suspense fallback={<RouteLoader />}><DashboardApp /></Suspense>} />
          
          {/* Modules */}
          <Route path="/shipments" element={<Suspense fallback={<RouteLoader />}><DashboardApp /></Suspense>} />
          <Route path="/rates" element={<Suspense fallback={<RouteLoader />}><FreightComparerApp /></Suspense>} />
          <Route path="/workflows" element={<Suspense fallback={<RouteLoader />}><WorkflowsPage /></Suspense>} />
          
          {/* Placeholder modules — coming soon */}
          <Route path="/crm" element={<ComingSoon module="CRM Module" description="Manage customer relationships, contacts, and deal pipelines across your logistics network." />} />
          <Route path="/wms" element={<ComingSoon module="Warehouse Management" description="Track inventory, manage warehouse operations, and optimise your fulfilment workflow." />} />
          <Route path="/docs" element={<ComingSoon module="Documents" description="Centralised document management for bills of lading, customs declarations, and shipping instructions." />} />
          
          {/* Admin Routes */}
          <Route path="/settings/users" element={
            <AdminRoute>
              <Suspense fallback={<RouteLoader />}><UserManagement /></Suspense>
            </AdminRoute>
          } />
          <Route path="/settings" element={<ComingSoon module="Settings" description="Configure application preferences, integrations, and account settings." />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

