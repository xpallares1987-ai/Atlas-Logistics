import React from "react";
import { useAuth } from "./AuthProvider";
// @ts-ignore
import { Role, hasPermission } from "../../core/auth/rbac";

interface RoleGateProps {
  requiredRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional element to show if denied, defaults to completely hidden
}

export const RoleGate: React.FC<RoleGateProps> = ({
  requiredRole,
  children,
  fallback = null,
}) => {
  const { role, loading } = useAuth();

  if (loading) {
    return null; // Avoid flickering during auth state load
  }

  if (hasPermission(role, requiredRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
