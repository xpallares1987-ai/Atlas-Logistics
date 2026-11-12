/**
 * @file control-tower.types.ts
 * @description Domain types and props contracts for Control Tower Command Center modules.
 * Covers incident radar, Kanban workflow, 3-way match freight audit, ICS2 customs, and spot rate calculator.
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export type ControlTowerTabKey =
  "radar" | "kanban" | "audit" | "customs" | "spot";

export interface ControlTowerKpis {
  totalActiveIncidents?: number;
  criticalCount?: number;
  avgDelayHours?: number;
  estimatedImpactEur?: number;
  activeDisputesCount?: number;
  ics2GreenPercentage?: number;
  autoResolvedPct?: number;
  [key: string]: any;
}

export interface ControlTowerRerouteOption {
  id: string;
  label: string;
  delayDeltaHours: number;
  costDeltaEur: number;
  co2DeltaKg: number;
  recommended?: boolean;
  description?: string;
}

export interface ControlTowerIncident {
  id: string;
  incidentNumber: string;
  incidentType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  status: "OPEN" | "ANALYZING" | "AUTO_RESOLVED" | "RESOLVED" | string;
  title: string;
  description: string;
  locationName: string;
  delayHours: number;
  impactAmountEur: number;
  shipmentId?: string;
  autoResolved?: boolean;
  rerouteOptions?: ControlTowerRerouteOption[];
}

export interface FreightAuditMatch {
  lineId: string;
  carrierName: string;
  invoiceNumber: string;
  documentNumber: string;
  chargeCode: string;
  description: string;
  billedAmount: number;
  expectedAmount: number;
  varianceAmount: number;
  isWithinTolerance: boolean;
  disputeStatus?: string;
  disputeCode?: string;
}

export interface CustomsDeclaration {
  id: string;
  mrn: string;
  shipmentId?: string;
  declarantEori: string;
  customsOfficeCode: string;
  securityAssessmentScore?: number;
  riskCircuit: "GREEN" | "ORANGE" | "RED" | string;
  notes?: string;
}

export interface SpotRateParams {
  origin: string;
  destination: string;
  transportMode: string;
  containerType: string;
  distanceKm: number;
  targetMarginPct: number;
  includeCustoms: boolean;
}

export interface SpotRateQuote {
  totalRateEur: number;
  baseFreightEur: number;
  bafSurchargeEur: number;
  customsFeeEur: number;
  inlandDrayageEur: number;
  marginEur: number;
  estimatedTransitDays: number;
  co2EmissionsKg: number;
  breakdown?: Record<string, number>;
  [key: string]: any;
}

export interface ControlTowerRadarTabProps {
  incidents: ControlTowerIncident[];
  severityFilter: string;
  onSeverityFilterChange: (sev: string) => void;
  statusFilter: string;
  onStatusFilterChange: (st: string) => void;
  onSelectIncident: (inc: ControlTowerIncident) => void;
}

export interface ControlTowerKanbanTabProps {
  incidents: ControlTowerIncident[];
  onSelectIncident: (inc: ControlTowerIncident) => void;
}

export interface ControlTowerAuditTabProps {
  auditMatches: FreightAuditMatch[];
  onDisputeLine: (line: FreightAuditMatch) => void;
}

export interface ControlTowerCustomsTabProps {
  customsRadar: CustomsDeclaration[];
  onOpenNewIcs2Modal: () => void;
}

export interface ControlTowerSpotTabProps {
  spotParams: SpotRateParams;
  onChangeSpotParams: (params: SpotRateParams) => void;
  spotQuote: SpotRateQuote | null;
  onCalculateSpotRate: (e: React.FormEvent) => void;
  isCalculatingSpot: boolean;
}

export interface NewIncidentFormData {
  title: string;
  incidentType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  description: string;
  impactAmountEur: number;
  delayHours: number;
  locationName: string;
  shipmentId?: string;
}

export interface Ics2FormData {
  declarantEori: string;
  customsOfficeCode: string;
  shipmentId: string;
  notes: string;
}
