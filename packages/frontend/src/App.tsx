import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';

// Wrappers for Modules
import FreightComparerApp from '@atlas/freight-comparer/src/App';
import DashboardApp from '@atlas/dashboard/src/app/DashboardClient';

// For BPMN Modeler (Vanilla DOM Wrapper)
import WorkflowsPage from './pages/Workflows';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
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
        <Route path="/settings" element={<div className="p-4">Settings</div>} />
      </Route>
    </Routes>
  );
}
