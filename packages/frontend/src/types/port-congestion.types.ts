/**
 * @file port-congestion.types.ts
 * @description Types and interfaces for Predictive Port Congestion & AIS Berth Delay Early Warning Engine.
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import type {
  DDSuspensionCertificate,
  DrayageAppointment,
  IberianPortHub,
  ScheduledBerthCall,
  VesselAisPosition,
  BerthCollision,
} from "@atlas/shared";

export type PortCongestionTab =
  "GEOSPATIAL_MAP" | "BERTH_RADAR" | "LANDSIDE_DRAYAGE" | "DD_SUSPENSION";

export interface CertFormState {
  portCode: string;
  terminalName: string;
  vesselName: string;
  containerNo: string;
  reason:
    | "PORT_CONGESTION_ANCHORAGE_DWELL"
    | "BERTH_COLLISION_DELAY"
    | "TERMINAL_GATE_APPOINTMENT_UNAVAILABLE";
  dwellOrDelayHours: number;
  issuer: "ADMIN (SuperAdmin / Systems Lead)";
}

export interface PortCongestionHeaderProps {
  selectedPortCode: string;
  onSelectPort: (portCode: string) => void;
}

export interface PortCongestionKpiStripProps {
  activeHub: IberianPortHub;
}

export interface PortCongestionNavigationProps {
  activeTab: PortCongestionTab;
  onSelectTab: (tab: PortCongestionTab) => void;
  activeVesselsCount: number;
  activeCollisionsCount: number;
  activeDrayageCount: number;
  certificatesCount: number;
}

export interface GeospatialMapTabProps {
  activeHub: IberianPortHub;
  activeVessels: VesselAisPosition[];
  selectedVessel: VesselAisPosition | null;
  onSelectVessel: (vessel: VesselAisPosition) => void;
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  onInitiateSuspensionFromVessel: (vessel: VesselAisPosition) => void;
}

export interface BerthRadarTabProps {
  activeHub: IberianPortHub;
  activeCollisions: BerthCollision[];
  berthCalls: ScheduledBerthCall[];
  selectedPortCode: string;
  onResolveCollision: (collisionId: string) => void;
}

export interface LandsideDrayageTabProps {
  activeDrayage: DrayageAppointment[];
  onRebalanceDrayage: () => void;
}

export interface DdSuspensionTabProps {
  certForm: CertFormState;
  setCertForm: (form: CertFormState) => void;
  certificates: DDSuspensionCertificate[];
  copiedHash: boolean;
  onGenerateCertificate: (e: React.FormEvent) => void;
  onDownloadPDF: (cert: DDSuspensionCertificate) => void;
  onCopyHash: (hash: string) => void;
}
