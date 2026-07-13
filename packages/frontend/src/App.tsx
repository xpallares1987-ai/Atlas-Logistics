import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const DashboardModule = React.lazy(() => import('@atlas/dashboard').then(m => ({ default: m.Dashboard })));
const RateComparerModule = React.lazy(() => import('@atlas/rate-comparer').then(m => ({ default: m.RateComparer })));

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar Shell */}
        <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col gap-4">
          <h1 className="text-2xl font-bold mb-8 tracking-wider">ATLAS<span className="text-blue-500">.SCM</span></h1>
          <nav className="flex flex-col gap-2">
            <Link to="/" className="p-2 hover:bg-gray-800 rounded">Dashboard (Core)</Link>
            <Link to="/quotes" className="p-2 hover:bg-gray-800 rounded">Rate Comparer</Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500">Loading Micro-Frontend...</div>}>
            <Routes>
              <Route path="/" element={<DashboardModule />} />
              <Route path="/quotes" element={<RateComparerModule />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
