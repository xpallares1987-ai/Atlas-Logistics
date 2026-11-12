/**
 * @file settings.types.ts
 * @description Canonical TypeScript types and data models for SettingsModule and its administrative tabs.
 * @module @atlas/frontend/types/settings
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import type { LucideIcon } from "lucide-react";
import type {
  RegisteredPasskeyDevice,
  PasskeyDeviceType,
  StepUpSecurityPolicy,
} from "@atlas/shared";

// Re-export shared security types
export type {
  RegisteredPasskeyDevice,
  PasskeyDeviceType,
  StepUpSecurityPolicy,
};

// ============================================================================
// 1. NAVIGATION & TAB IDENTIFIERS
// ============================================================================

export type SettingsTabId =
  | "Profile"
  | "Company"
  | "Security"
  | "API"
  | "Notifications"
  | "Appearance"
  | "Devices"
  | "Resolutions"
  | "Database"
  | "System Administration";

export interface SettingsTabItem {
  id: SettingsTabId;
  icon: LucideIcon;
  label: string;
}

// ============================================================================
// 2. DATABASE DDL SCHEMA MODELS
// ============================================================================

export interface DatabaseColumnMeta {
  name: string;
  type: string;
  pk?: boolean;
}

export type DatabaseSchemaMap = Record<string, DatabaseColumnMeta[]>;

export interface NewTableInput {
  name: string;
  column1Name: string;
  column1Type: string;
}

export interface NewColumnInput {
  table: string;
  name: string;
  type: string;
}

// ============================================================================
// 3. API & SECURITY MODELS
// ============================================================================

export interface ApiKeyItem {
  id: string;
  name: string;
  created: string;
  lastUsed?: string;
}
