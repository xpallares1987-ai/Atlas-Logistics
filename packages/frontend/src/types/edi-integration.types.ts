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

export interface EdiSimulationResult {
  headerReceived?: string;
  action?: string;
  [key: string]: unknown;
}

export interface EdiParsedSegment {
  tag: string;
  elements: string[];
  rawText?: string;
  [key: string]: unknown;
}

export interface EdiParsedEvent {
  milestone?: string;
  bookingReference?: string;
  [key: string]: unknown;
}

export interface EdiParseResult {
  controlNumber?: string;
  senderId?: string;
  receiverId?: string;
  ackStatus?: string;
  standard?: string;
  segmentsCount?: number;
  parsedEvents?: EdiParsedEvent[];
  messages?: Array<Record<string, unknown>>;
  segments?: EdiParsedSegment[];
  [key: string]: unknown;
}

export interface EdiProcessResult {
  interchange?: {
    controlNumber?: string;
    senderId?: string;
    receiverId?: string;
    ackStatus?: string;
    [key: string]: unknown;
  };
  events?: Array<{
    milestone?: string;
    [key: string]: unknown;
  }>;
  acknowledgment?: string;
  [key: string]: unknown;
}

export interface EdiOutboundResult {
  rawPayload: string;
  controlNumber: string;
  format: string;
  [key: string]: unknown;
}

export interface EdiScmShipmentOption {
  id?: string;
  shipmentId?: string;
  referenceNumber?: string;
  shipmentReference?: string;
  serviceType?: string;
  lifecycle?: string;
  equipmentReference?: string;
  originPort?: string;
  destinationPort?: string;
  carrierCode?: "CMDU" | "HLCU" | "MAEU" | "MSCU";
  carrierName?: string;
  cargoWeight?: number | string;
  [key: string]: unknown;
}

export interface EdiDcsaTabProps {
  dcsaEvents: DcsaEventItem[];
  dcsaSubscriptions: DcsaSubscriptionItem[];
  selectedDcsaEvent: DcsaEventItem | null;
  onSelectDcsaEvent: (event: DcsaEventItem | null) => void;
  dcsaFilterType: string;
  onDcsaFilterTypeChange: (filter: string) => void;
  isSimulating: boolean;
  simulationResult: EdiSimulationResult | null;
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
  parseResult: EdiParseResult | null;
  processResult: EdiProcessResult | null;
  selectedSegment: EdiParsedSegment | null;
  onSelectSegment: (segment: EdiParsedSegment | null) => void;
  onParseEdi: () => void;
  onProcessEdi: () => void;
  onLoadSample: (sampleType: string) => void;
}

export interface EdiOutboundTabProps {
  outboundFormat: "304" | "310" | "IFTMIN" | "204";
  onOutboundFormatChange: (format: "304" | "310" | "IFTMIN" | "204") => void;
  scmShipments: EdiScmShipmentOption[];
  onScmPreFill: (shipmentId: string) => void;
  bookingRef: string;
  onBookingRefChange: (ref: string) => void;
  containerNum: string;
  onContainerNumChange: (num: string) => void;
  consignorName: string;
  onConsignorNameChange: (name: string) => void;
  consigneeName: string;
  onConsigneeNameChange: (name: string) => void;
  originLocode: string;
  onOriginLocodeChange: (locode: string) => void;
  destLocode: string;
  onDestLocodeChange: (locode: string) => void;
  invoiceNumber: string;
  onInvoiceNumberChange: (num: string) => void;
  billOfLading: string;
  onBillOfLadingChange: (bl: string) => void;
  currency: string;
  onCurrencyChange: (curr: string) => void;
  vgmWeightKg: number;
  onVgmWeightKgChange: (weight: number) => void;
  vgmMethod: "METHOD_1" | "METHOD_2";
  onVgmMethodChange: (method: "METHOD_1" | "METHOD_2") => void;
  vgmPerson: string;
  onVgmPersonChange: (person: string) => void;
  vesselName: string;
  onVesselNameChange: (name: string) => void;
  voyageNum: string;
  onVoyageNumChange: (num: string) => void;
  sealNum: string;
  onSealNumChange: (seal: string) => void;
  baseFreightRate: number;
  onBaseFreightRateChange: (rate: number) => void;
  bafAmount: number;
  onBafAmountChange: (amount: number) => void;
  thcAmount: number;
  onThcAmountChange: (amount: number) => void;
  cargoDesc: string;
  onCargoDescChange: (desc: string) => void;
  isGenerating: boolean;
  onGenerateOutbound: () => void;
  outboundResult: EdiOutboundResult | null;
  copyToClipboard: (text: string) => void;
  downloadEdiFile: (content: string, filename: string) => void;
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
