/**
 * @file index.ts
 * @description Canonical barrel for `@atlas/ui` authentication provider and hook.
 * @module @atlas/ui/components/auth
 * @see {@link docs/adr/0020-modular-frontend-decomposition-and-naming-standards.md}
 */

export {
  Provider,
  AuthProvider,
  useAuth,
  type User,
  type AuthContextType,
} from "./Provider";
