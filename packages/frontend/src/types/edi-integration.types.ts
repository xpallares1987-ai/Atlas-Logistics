export interface InterchangeRecord {
  id: string;
  controlNumber: string;
  direction: "INBOUND" | "OUTBOUND";
  standard: "EDIFACT" | "ANSI_X12";
  senderId: string;
  receiverId: string;
  status: string;
  rawPayload: string;
  ackPayload?: string;
  ackStatus?: string;
  createdAt: string | number;
}

export interface PartnerRecord {
  id: string;
  name: string;
  standard: string;
  senderId: string;
  senderQualifier: string;
  receiverId: string;
  receiverQualifier: string;
  transportProtocol: string;
  endpointUrl?: string;
  testMode: boolean;
}

export interface DcsaEventItem {
  id: string;
  eventId: string;
  eventType: "EQUIPMENT" | "TRANSPORT" | "SHIPMENT";
  eventClassifierCode: "ACT" | "EST" | "PLN";
  eventDateTime: string;
  eventTypeCode: string;
  carrierBookingReference?: string;
  transportDocumentReference?: string;
  equipmentReference?: string;
  unLocationCode?: string;
  facilityCode?: string;
  vesselIMONumber?: string;
  vesselName?: string;
  carrierVoyageNumber?: string;
  sealNumber?: string;
  disruptionReason?: string;
  delayHours?: number;
  carrierCode?: string;
  signatureVerified?: boolean;
  createdAt: string;
}

export interface DcsaSubscriptionItem {
  id: string;
  carrierCode: string;
  callbackUrl: string;
  secretToken?: string;
  eventTypeFilters?: string;
  bookingReference?: string;
  equipmentReference?: string;
  isActive: boolean | number;
  createdAt: string;
}

export interface EdiDcsaTabProps {
  dcsaEvents: DcsaEventItem[];
  dcsaSubscriptions: DcsaSubscriptionItem[];
  selectedDcsaEvent: DcsaEventItem | null;
  onSelectDcsaEvent: (event: DcsaEventItem | null) => void;
  dcsaFilterType: string;
  onDcsaFilterTypeChange: (filter: string) => void;
  isSimulating: boolean;
  simulationResult: any;
  simCarrier: "MSCU" | "MAEU" | "CMDU" | "HLCU";
  onSimCarrierChange: (carrier: "MSCU" | "MAEU" | "CMDU" | "HLCU") => void;
  simEventType: "EQUIPMENT" | "TRANSPORT" | "SHIPMENT";
  onSimEventTypeChange: (type: "EQUIPMENT" | "TRANSPORT" | "SHIPMENT") => void;
  simEventTypeCode: string;
  onSimEventTypeCodeChange: (code: string) => void;
  simBookingRef: string;
  onSimBookingRefChange: (ref: string) => void;
  simContainerNum: string;
  onSimContainerNumChange: (num: string) => void;
  simLocode: string;
  onSimLocodeChange: (locode: string) => void;
  simIsDisruption: boolean;
  onSimIsDisruptionChange: (disruption: boolean) => void;
  simDisruptionReason: string;
  onSimDisruptionReasonChange: (reason: string) => void;
  onSimulateEvent: () => void;
  onOpenSubscriptionModal: () => void;
  onToggleSubscription: (subId: string, currentActive: boolean) => void;
  onFetchEvents: () => void;
}

export interface EdiStudioTabProps {
  ediInput: string;
  onEdiInputChange: (input: string) => void;
  isParsing: boolean;
  isProcessing: boolean;
  parseResult: any;
  processResult: any;
  selectedSegment: any;
  onSelectSegment: (segment: any) => void;
  onParseEdi: () => void;
  onProcessEdi: () => void;
  onLoadSample: (sampleType: string) => void;
}

export interface EdiOutboundTabProps {
  outboundFormat: "304" | "310" | "IFTMIN" | "204";
  onOutboundFormatChange: (format: "304" | "310" | "IFTMIN" | "204") => void;
  bookingRef: string;
  onBookingRefChange: (ref: string) => void;
  consignorName: string;
  onConsignorNameChange: (name: string) => void;
  consigneeName: string;
  onConsigneeNameChange: (name: string) => void;
  originPort: string;
  onOriginPortChange: (port: string) => void;
  originLocode: string;
  onOriginLocodeChange: (locode: string) => void;
  destPort: string;
  onDestPortChange: (port: string) => void;
  destLocode: string;
  onDestLocodeChange: (locode: string) => void;
  cargoDesc: string;
  onCargoDescChange: (desc: string) => void;
  grossWeight: number;
  onGrossWeightChange: (weight: number) => void;
  containerNum: string;
  onContainerNumChange: (num: string) => void;
  sealNum: string;
  onSealNumChange: (num: string) => void;
  vesselName: string;
  onVesselNameChange: (name: string) => void;
  voyageNum: string;
  onVoyageNumChange: (num: string) => void;
  vgmWeightKg: number;
  onVgmWeightKgChange: (weight: number) => void;
  vgmMethod: "SM1" | "SM2";
  onVgmMethodChange: (method: "SM1" | "SM2") => void;
  vgmSignatory: string;
  onVgmSignatoryChange: (signatory: string) => void;
  vgmCertNumber: string;
  onVgmCertNumberChange: (num: string) => void;
  selectedPartnerId: string;
  onSelectedPartnerIdChange: (partnerId: string) => void;
  partners: PartnerRecord[];
  isGeneratingOutbound: boolean;
  generatedOutboundPayload: string;
  isDispatching: boolean;
  dispatchResult: any;
  onGenerateOutbound: () => void;
  onDispatchOutbound: () => void;
}

export interface EdiAuditTabProps {
  interchanges: InterchangeRecord[];
  auditSearchQuery: string;
  onAuditSearchQueryChange: (query: string) => void;
  auditDirectionFilter: string;
  onAuditDirectionFilterChange: (dir: string) => void;
  auditStandardFilter: string;
  onAuditStandardFilterChange: (std: string) => void;
  auditStatusFilter: string;
  onAuditStatusFilterChange: (status: string) => void;
  selectedInterchange: InterchangeRecord | null;
  onSelectInterchange: (item: InterchangeRecord | null) => void;
  onFetchInterchanges: () => void;
}

export interface EdiPartnersTabProps {
  partners: PartnerRecord[];
  onAddPartner?: () => void;
}

export interface DcsaSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subCarrier: string;
  onSubCarrierChange: (carrier: string) => void;
  subUrl: string;
  onSubUrlChange: (url: string) => void;
  subSecret: string;
  onSubSecretChange: (secret: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}
