export type Role =
  | "GUEST"
  | "OPERATOR"
  | "SALES"
  | "PROCUREMENT"
  | "TEAM_LEADER"
  | "MANAGER"
  | "EXECUTIVE"
  | "ICT"
  | "ADMIN";

// Define the hierarchy. The higher the index, the more permissions.
const ROLE_HIERARCHY: Record<Role, number> = {
  GUEST: 0,
  OPERATOR: 10,
  SALES: 10,
  PROCUREMENT: 10,
  TEAM_LEADER: 20,
  MANAGER: 30,
  EXECUTIVE: 40,
  ICT: 50,
  ADMIN: 100, // Super admin or mock admin
};

/**
 * Verifica si el usuario tiene el rol requerido o uno superior.
 * @param userRole - El rol actual del usuario.
 * @param requiredRole - El rol mínimo requerido.
 * @returns boolean
 */
export const hasPermission = (
  userRole: string | null | undefined,
  requiredRole: Role
): boolean => {
  if (!userRole) return false;
  
  const userLevel = ROLE_HIERARCHY[userRole as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
};
