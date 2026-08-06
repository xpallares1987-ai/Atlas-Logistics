import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@atlas/ui";
import { motion } from "framer-motion";

type Role =
  "ADMIN" | "EXECUTIVE" | "MANAGER" | "SALES" | "OPERATIONS" | "CUSTOMER";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthLoading } = useAppStore();
  const location = useLocation();

  if (isAuthLoading) {
    return null; // The App component handles the global loading state
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role as Role)
  ) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 absolute inset-0 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            You do not have the necessary permissions to view this module. Your
            current role is{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {user.role}
            </strong>
            .
          </p>
          <Button
            onClick={() => window.history.back()}
            className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg shadow-slate-900/20 dark:shadow-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};
