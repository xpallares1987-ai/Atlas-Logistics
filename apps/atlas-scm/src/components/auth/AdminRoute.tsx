import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Verifying privileges...
      </div>
    );
  }

  const isSuper = role === "ADMIN" || role === "EXECUTIVE" || role === "ICT";

  if (!user || !isSuper) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
