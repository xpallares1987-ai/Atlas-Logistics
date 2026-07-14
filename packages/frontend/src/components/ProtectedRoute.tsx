import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

type Role = 'ADMIN' | 'EXECUTIVE' | 'MANAGER' | 'SALES' | 'OPERATIONS' | 'CUSTOMER';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAppStore();
  const location = useLocation();

  if (!user) {
    // Si no hay usuario, mandamos a login o a portal (para este MVP, no hay login, pero mandamos al portal o bloqueamos)
    return <Navigate to="/portal" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // Usuario no tiene el rol necesario
      // Mostramos un componente de "Acceso Denegado" o redirigimos
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md">
            You do not have the required permissions to view this module. 
            Current role: <span className="font-bold text-indigo-500">{user.role}</span>
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
};
