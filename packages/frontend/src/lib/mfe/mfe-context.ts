/**
 * @file mfe-context.ts
 * @description Standard contracts and interfaces for Micro-Frontend boundary sharing.
 */

export interface MfeUserContext {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  tenantId?: string;
}

export interface MfeSharedProps {
  user?: MfeUserContext | null;
  authToken?: string | null;
  tenantId?: string;
  isRemoteMode?: boolean;
  onNavigate?: (path: string) => void;
  apiBaseUrl?: string;
}
