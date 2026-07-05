import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import Login from './pages/Login';

// Wrappers for Modules
import FreightComparerApp from '@atlas/freight-comparer/src/index';
import DashboardApp from '@atlas/dashboard/src/app/DashboardClient';
import { AdminRoute } from './components/auth/AdminRoute';
import UserManagement from './pages/UserManagement';

// For BPMN Modeler (Vanilla DOM Wrapper)
import WorkflowsPage from './pages/Workflows';

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
          <Route path="/" element={<DashboardApp />} />
          
          {/* Modules */}
          <Route path="/shipments" element={<DashboardApp />} />
          <Route path="/rates" element={<FreightComparerApp />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          
          {/* Placeholders for future modules */}
          <Route path="/crm" element={<div className="p-4">CRM Module (Coming Soon)</div>} />
          <Route path="/wms" element={<div className="p-4">WMS Module (Coming Soon)</div>} />
          <Route path="/docs" element={<div className="p-4">Documents (Coming Soon)</div>} />
          
          {/* Admin Routes */}
          <Route path="/settings/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/settings" element={<div className="p-4">Settings</div>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
