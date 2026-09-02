import React from "react";
import { BrowserRouter as Router, Link, useNavigate } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import { ApiStatusProvider } from "./contexts/ApiStatusContext";
import { TopNavbar } from "./components/layout/TopNavbar";
import { Sidebar } from "./components/layout/Sidebar";
import { AppRoutes } from "./components/layout/AppRoutes";

import { AuthProvider } from "./contexts/AuthContext";
import { useNotificationsWebSocket } from "./hooks/useNotificationsWebSocket";

function GlobalNavigationListener() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e.detail?.path) {
        navigate(e.detail.path);
      }
    };
    window.addEventListener("app-navigate", handleNavigate);
    return () => window.removeEventListener("app-navigate", handleNavigate);
  }, [navigate]);
  return null;
}

export default function App() {
  useNotificationsWebSocket();
  const { theme, addNotification } = useAppStore();
  const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <AuthProvider>
      <ApiStatusProvider onNotification={addNotification}>
        <Router>
          <GlobalNavigationListener />
          <div
            className={`flex h-screen font-sans overflow-hidden ${theme === "dark" ? "dark bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}
          >
            {/* Sidebar Component */}
            <Sidebar
              isMobileMenuOpen={isMobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 w-full">
              {/* Top Navbar */}
              <TopNavbar setMobileMenuOpen={setMobileMenuOpen} />

              {/* Page Content */}
              <div className="flex-1 overflow-hidden relative p-6">
                <AppRoutes />
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
    </AuthProvider>
  );
}
