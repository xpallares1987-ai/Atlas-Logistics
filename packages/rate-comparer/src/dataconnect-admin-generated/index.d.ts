import {
  ConnectorConfig,
  DataConnect,
  OperationOptions,
  ExecuteOperationResponse,
} from "firebase-admin/data-connect";

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;

export interface ApproveOcrDocumentData {
  document_update?: Document_Key | null;
}

export interface ApproveOcrDocumentVariables {
  id: UUIDString;
  extractedData?: unknown | null;
  shipmentId?: UUIDString | null;
}

export interface Company_Key {
  id: UUIDString;
  __typename?: "Company_Key";
}

export interface CreateCompanyData {
  company_upsert: Company_Key;
}

export interface CreateCompanyVariables {
  id?: UUIDString | null;
  name: string;
  entityType: string;
  countryCode?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface CreateCrmDealData {
  crmDeal_insert: CrmDeal_Key;
}

export interface CreateCrmDealVariables {
  tenantId: string;
  title: string;
  customerId: UUIDString;
  estimatedValue?: number | null;
  status: string;
  expectedCloseDate?: DateString | null;
  assignedToUid: string;
}

export interface CreateCrmInteractionData {
  crmInteraction_insert: CrmInteraction_Key;
}

export interface CreateCrmInteractionVariables {
  tenantId: string;
  customerId: UUIDString;
  type: string;
  date: TimestampString;
  notes?: string | null;
  outcome?: string | null;
  createdByUid: string;
}

export interface CreateDocumentFromOcrData {
  document_insert: Document_Key;
}

export interface CreateDocumentFromOcrVariables {
  documentNumber?: string | null;
  documentType: string;
  fileName?: string | null;
  fileUrl: string;
  mimeType?: string | null;
  extractedData?: unknown | null;
}

export interface CreateHsCodeData {
  hsCode_upsert: HsCode_Key;
}

export interface CreateHsCodeVariables {
  code: string;
  description: string;
  dutyRate?: number | null;
  isHazardous?: boolean | null;
}

export interface CreateIncotermData {
  incoterm_upsert: Incoterm_Key;
}

export interface CreateIncotermVariables {
  code: string;
  description: string;
  freightPayer: string;
  originCustomsPayer: string;
  destCustomsPayer: string;
}

export interface CreateLocationData {
  location_upsert: Location_Key;
}

export interface CreateLocationVariables {
  locode: string;
  name: string;
  countryCode: string;
  countryName: string;
  type: string;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateMilestoneData {
  milestone_insert: Milestone_Key;
}

export interface CreateMilestoneVariables {
  eventCode: string;
  eventType: string;
  description: string;
  location?: string | null;
  shipmentId: UUIDString;
}

export interface CreateQuoteData {
  quote_insert: Quote_Key;
}

export interface CreateQuoteVariables {
  quoteNumber: string;
  status: string;
  movementType: string;
  origin: string;
  destination: string;
  baseFreightCost: number;
  totalCost: number;
  currency: string;
  validityDate: DateString;
  carrierId?: UUIDString | null;
  customerId?: UUIDString | null;
  createdByUid: string;
}

export interface CreateScheduleData {
  schedule_insert: Schedule_Key;
}

export interface CreateScheduleVariables {
  vesselImoNumber: string;
  voyageNumber: string;
  polLocode: string;
  podLocode: string;
  etd: DateString;
  eta: DateString;
  cutOffDate?: TimestampString | null;
  availableTeu?: number | null;
}

export interface CreateShipmentData {
  shipment_insert: Shipment_Key;
}

export interface CreateShipmentVariables {
  trackingNumber: string;
  status: string;
  movementType: string;
  direction: string;
  incotermCode?: string | null;
  origin: string;
  pol: string;
  pod: string;
  destination: string;
  customerId: UUIDString;
  supplierId?: UUIDString | null;
  shipperAddressShape?: string | null;
  consigneeAddressShape?: string | null;
}

export interface CreateVesselData {
  vessel_upsert: Vessel_Key;
}

export interface CreateVesselVariables {
  imoNumber: string;
  name: string;
  flag?: string | null;
  carrierId: UUIDString;
  capacityTeu?: number | null;
}

export interface CrmDeal_Key {
  id: UUIDString;
  __typename?: "CrmDeal_Key";
}

export interface CrmInteraction_Key {
  id: UUIDString;
  __typename?: "CrmInteraction_Key";
}

export interface CustomsEventLog_Key {
  id: UUIDString;
  __typename?: "CustomsEventLog_Key";
}

export interface DictionaryTerm_Key {
  acronym: string;
  category: string;
  __typename?: "DictionaryTerm_Key";
}

export interface Document_Key {
  id: UUIDString;
  __typename?: "Document_Key";
}

export interface GetAllUsersData {
  users: ({
    uid: string;
    email: string;
    displayName?: string | null;
    role: string;
    tenantId: string;
    isActive: boolean;
  } & User_Key)[];
}

export interface GetShipmentByIdData {
  shipment?: {
    trackingNumber: string;
    status: string;
    origin: string;
    pol: string;
    pod: string;
    destination: string;
    vesselName?: string | null;
    voyageNumber?: string | null;
    movementType: string;
    ets?: TimestampString | null;
    eta?: TimestampString | null;
    packages?: number | null;
    grossWeight?: number | null;
    volume?: number | null;
    shipperAddressShape?: string | null;
    consigneeAddressShape?: string | null;
    customer: {
      name: string;
    };
    supplier?: {
      name: string;
    };
    carrier?: {
      name: string;
    };
  };
}

export interface GetShipmentByIdVariables {
  id: UUIDString;
}

export interface GetUserProfileData {
  user?: {
    role: string;
    tenantId: string;
  };
}

export interface GetUserProfileVariables {
  uid: string;
}

export interface HsCode_Key {
  code: string;
  __typename?: "HsCode_Key";
}

export interface Incoterm_Key {
  code: string;
  __typename?: "Incoterm_Key";
}

export interface InsertDictionaryTermData {
  dictionaryTerm_upsert: DictionaryTerm_Key;
}

export interface InsertDictionaryTermVariables {
  acronym: string;
  meaning: string;
  description?: string | null;
  category: string;
  subCategory?: string | null;
  region?: string | null;
  moduleScope?: string[] | null;
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: "Invoice_Key";
}

export interface ListAgentsData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    countryCode?: string | null;
    paymentTerms?: string | null;
    rating?: number | null;
    isActive: boolean;
  } & Company_Key)[];
}

export interface ListAgentsVariables {
  tenantId: string;
}

export interface ListCarriersData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    scacCode?: string | null;
    paymentTerms?: string | null;
    rating?: number | null;
    isActive: boolean;
  } & Company_Key)[];
}

export interface ListCarriersVariables {
  tenantId: string;
}

export interface ListCompaniesData {
  companies: ({
    id: UUIDString;
    name: string;
    entityType: string;
    countryCode?: string | null;
  } & Company_Key)[];
}

export interface ListCrmDealsData {
  crmDeals: ({
    id: UUIDString;
    title: string;
    customer: {
      id: UUIDString;
      name: string;
    } & Company_Key;
    estimatedValue?: number | null;
    status: string;
    expectedCloseDate?: DateString | null;
    assignedToUid: string;
    createdAt: TimestampString;
  } & CrmDeal_Key)[];
}

export interface ListCrmDealsVariables {
  tenantId: string;
}

export interface ListCrmInteractionsData {
  crmInteractions: ({
    id: UUIDString;
    type: string;
    date: TimestampString;
    notes?: string | null;
    outcome?: string | null;
    createdByUid: string;
  } & CrmInteraction_Key)[];
}

export interface ListCrmInteractionsVariables {
  tenantId: string;
  customerId: UUIDString;
}

export interface ListCustomersData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    creditLimit?: number | null;
    paymentTerms?: string | null;
    rating?: number | null;
  } & Company_Key)[];
}

export interface ListCustomersVariables {
  tenantId: string;
}

export interface ListDictionaryTermsData {
  dictionaryTerms: ({
    acronym: string;
    meaning: string;
    description?: string | null;
    category: string;
    subCategory?: string | null;
    region?: string | null;
    moduleScope?: string[] | null;
    isActive: boolean;
  } & DictionaryTerm_Key)[];
}

export interface ListHauliersData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    taxId?: string | null;
    paymentTerms?: string | null;
    rating?: number | null;
    isActive: boolean;
  } & Company_Key)[];
}

export interface ListHauliersVariables {
  tenantId: string;
}

export interface ListHsCodesData {
  hsCodes: ({
    code: string;
    description?: string | null;
    dutyRate?: number | null;
    isHazardous: boolean;
    isActive: boolean;
  } & HsCode_Key)[];
}

export interface ListIncotermsData {
  incoterms: ({
    code: string;
    description?: string | null;
    freightPayer: string;
    originCustomsPayer: string;
    destCustomsPayer: string;
    isActive: boolean;
  } & Incoterm_Key)[];
}

export interface ListPendingOcrDocumentsData {
  documents: ({
    id: UUIDString;
    documentNumber?: string | null;
    documentType: string;
    fileName?: string | null;
    fileUrl: string;
    mimeType?: string | null;
    uploadDate?: TimestampString | null;
    ocrStatus?: string | null;
    extractedData?: unknown | null;
    shipment?: {
      id: UUIDString;
      trackingNumber: string;
    } & Shipment_Key;
  } & Document_Key)[];
}

export interface ListQuotesData {
  quotes: ({
    id: UUIDString;
    tenantId: string;
    quoteNumber: string;
    status: string;
    movementType: string;
    origin: string;
    destination: string;
    baseFreightCost: number;
    totalCost: number;
    currency: string;
    validityDate: DateString;
    carrier?: {
      name: string;
    };
  } & Quote_Key)[];
}

export interface ListQuotesVariables {
  tenantId: string;
  origin?: string | null;
  destination?: string | null;
}

export interface ListSchedulesData {
  schedules: ({
    id: UUIDString;
    tenantId: string;
    vessel: {
      imoNumber: string;
      name: string;
    } & Vessel_Key;
    voyageNumber: string;
    pol: {
      locode: string;
      name: string;
    } & Location_Key;
    pod: {
      locode: string;
      name: string;
    } & Location_Key;
    etd: DateString;
    eta: DateString;
    cutOffDate?: TimestampString | null;
    availableTeu?: number | null;
    status: string;
  } & Schedule_Key)[];
}

export interface ListSchedulesVariables {
  tenantId: string;
}

export interface ListShipmentsData {
  shipments: {
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    vesselName?: string | null;
    voyageNumber?: string | null;
    movementType: string;
    ets?: TimestampString | null;
    eta?: TimestampString | null;
    customer: {
      name: string;
    };
    supplier?: {
      name: string;
    };
  }[];
}

export interface ListShipmentsVariables {
  tenantId: string;
}

export interface ListVesselsData {
  vessels: ({
    imoNumber: string;
    name: string;
    flag?: string | null;
    capacityTeu?: number | null;
    carrier: {
      id: UUIDString;
      name: string;
    } & Company_Key;
    isActive: boolean;
  } & Vessel_Key)[];
}

export interface Location_Key {
  locode: string;
  __typename?: "Location_Key";
}

export interface LogShipmentEventData {
  shipmentEventLog_insert: ShipmentEventLog_Key;
}

export interface LogShipmentEventVariables {
  shipmentId: UUIDString;
  eventType: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  details?: string | null;
}

export interface Milestone_Key {
  id: UUIDString;
  __typename?: "Milestone_Key";
}

export interface Quote_Key {
  id: UUIDString;
  __typename?: "Quote_Key";
}

export interface RejectOcrDocumentData {
  document_update?: Document_Key | null;
}

export interface RejectOcrDocumentVariables {
  id: UUIDString;
}

export interface Schedule_Key {
  id: UUIDString;
  __typename?: "Schedule_Key";
}

export interface SearchLocationsData {
  locations: ({
    locode: string;
    name: string;
    countryCode?: string | null;
    countryName?: string | null;
    type: string;
  } & Location_Key)[];
}

export interface SearchLocationsVariables {
  query: string;
}

export interface ShipmentEventLog_Key {
  id: UUIDString;
  __typename?: "ShipmentEventLog_Key";
}

export interface Shipment_Key {
  id: UUIDString;
  __typename?: "Shipment_Key";
}

export interface UpdateCrmDealStatusData {
  crmDeal_update?: CrmDeal_Key | null;
}

export interface UpdateCrmDealStatusVariables {
  id: UUIDString;
  status: string;
}

export interface UpdateUserRoleData {
  user_update?: User_Key | null;
}

export interface UpdateUserRoleVariables {
  uid: string;
  role: string;
  tenantId?: string | null;
}

export interface UpsertDictionaryTermData {
  dictionaryTerm_upsert: DictionaryTerm_Key;
}

export interface UpsertDictionaryTermVariables {
  acronym: string;
  category: string;
  meaning: string;
  description?: string | null;
  subCategory?: string | null;
  region?: string | null;
  moduleScope?: string[] | null;
  isActive?: boolean | null;
}

export interface UpsertUserData {
  user_upsert: User_Key;
}

export interface UpsertUserVariables {
  email: string;
  displayName?: string | null;
  tenantId?: string | null;
}

export interface User_Key {
  uid: string;
  __typename?: "User_Key";
}

export interface Vessel_Key {
  imoNumber: string;
  __typename?: "Vessel_Key";
}

export interface Workflow_Key {
  id: UUIDString;
  __typename?: "Workflow_Key";
}

/** Generated Node Admin SDK operation action function for the 'ListCustomers' Query. Allow users to execute without passing in DataConnect. */
export function listCustomers(
  dc: DataConnect,
  vars: ListCustomersVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCustomersData>>;
/** Generated Node Admin SDK operation action function for the 'ListCustomers' Query. Allow users to pass in custom DataConnect instances. */
export function listCustomers(
  vars: ListCustomersVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCustomersData>>;

/** Generated Node Admin SDK operation action function for the 'ListCrmDeals' Query. Allow users to execute without passing in DataConnect. */
export function listCrmDeals(
  dc: DataConnect,
  vars: ListCrmDealsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCrmDealsData>>;
/** Generated Node Admin SDK operation action function for the 'ListCrmDeals' Query. Allow users to pass in custom DataConnect instances. */
export function listCrmDeals(
  vars: ListCrmDealsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCrmDealsData>>;

/** Generated Node Admin SDK operation action function for the 'ListCrmInteractions' Query. Allow users to execute without passing in DataConnect. */
export function listCrmInteractions(
  dc: DataConnect,
  vars: ListCrmInteractionsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCrmInteractionsData>>;
/** Generated Node Admin SDK operation action function for the 'ListCrmInteractions' Query. Allow users to pass in custom DataConnect instances. */
export function listCrmInteractions(
  vars: ListCrmInteractionsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCrmInteractionsData>>;

/** Generated Node Admin SDK operation action function for the 'CreateCrmDeal' Mutation. Allow users to execute without passing in DataConnect. */
export function createCrmDeal(
  dc: DataConnect,
  vars: CreateCrmDealVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateCrmDealData>>;
/** Generated Node Admin SDK operation action function for the 'CreateCrmDeal' Mutation. Allow users to pass in custom DataConnect instances. */
export function createCrmDeal(
  vars: CreateCrmDealVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateCrmDealData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateCrmDealStatus' Mutation. Allow users to execute without passing in DataConnect. */
export function updateCrmDealStatus(
  dc: DataConnect,
  vars: UpdateCrmDealStatusVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpdateCrmDealStatusData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateCrmDealStatus' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateCrmDealStatus(
  vars: UpdateCrmDealStatusVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpdateCrmDealStatusData>>;

/** Generated Node Admin SDK operation action function for the 'CreateCrmInteraction' Mutation. Allow users to execute without passing in DataConnect. */
export function createCrmInteraction(
  dc: DataConnect,
  vars: CreateCrmInteractionVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateCrmInteractionData>>;
/** Generated Node Admin SDK operation action function for the 'CreateCrmInteraction' Mutation. Allow users to pass in custom DataConnect instances. */
export function createCrmInteraction(
  vars: CreateCrmInteractionVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateCrmInteractionData>>;

/** Generated Node Admin SDK operation action function for the 'CreateDocumentFromOcr' Mutation. Allow users to execute without passing in DataConnect. */
export function createDocumentFromOcr(
  dc: DataConnect,
  vars: CreateDocumentFromOcrVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateDocumentFromOcrData>>;
/** Generated Node Admin SDK operation action function for the 'CreateDocumentFromOcr' Mutation. Allow users to pass in custom DataConnect instances. */
export function createDocumentFromOcr(
  vars: CreateDocumentFromOcrVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateDocumentFromOcrData>>;

/** Generated Node Admin SDK operation action function for the 'ApproveOcrDocument' Mutation. Allow users to execute without passing in DataConnect. */
export function approveOcrDocument(
  dc: DataConnect,
  vars: ApproveOcrDocumentVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ApproveOcrDocumentData>>;
/** Generated Node Admin SDK operation action function for the 'ApproveOcrDocument' Mutation. Allow users to pass in custom DataConnect instances. */
export function approveOcrDocument(
  vars: ApproveOcrDocumentVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ApproveOcrDocumentData>>;

/** Generated Node Admin SDK operation action function for the 'RejectOcrDocument' Mutation. Allow users to execute without passing in DataConnect. */
export function rejectOcrDocument(
  dc: DataConnect,
  vars: RejectOcrDocumentVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<RejectOcrDocumentData>>;
/** Generated Node Admin SDK operation action function for the 'RejectOcrDocument' Mutation. Allow users to pass in custom DataConnect instances. */
export function rejectOcrDocument(
  vars: RejectOcrDocumentVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<RejectOcrDocumentData>>;

/** Generated Node Admin SDK operation action function for the 'ListPendingOcrDocuments' Query. Allow users to execute without passing in DataConnect. */
export function listPendingOcrDocuments(
  dc: DataConnect,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListPendingOcrDocumentsData>>;
/** Generated Node Admin SDK operation action function for the 'ListPendingOcrDocuments' Query. Allow users to pass in custom DataConnect instances. */
export function listPendingOcrDocuments(
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListPendingOcrDocumentsData>>;

/** Generated Node Admin SDK operation action function for the 'ListIncoterms' Query. Allow users to execute without passing in DataConnect. */
export function listIncoterms(
  dc: DataConnect,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListIncotermsData>>;
/** Generated Node Admin SDK operation action function for the 'ListIncoterms' Query. Allow users to pass in custom DataConnect instances. */
export function listIncoterms(
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListIncotermsData>>;

/** Generated Node Admin SDK operation action function for the 'ListHsCodes' Query. Allow users to execute without passing in DataConnect. */
export function listHsCodes(
  dc: DataConnect,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListHsCodesData>>;
/** Generated Node Admin SDK operation action function for the 'ListHsCodes' Query. Allow users to pass in custom DataConnect instances. */
export function listHsCodes(
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListHsCodesData>>;

/** Generated Node Admin SDK operation action function for the 'ListVessels' Query. Allow users to execute without passing in DataConnect. */
export function listVessels(
  dc: DataConnect,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListVesselsData>>;
/** Generated Node Admin SDK operation action function for the 'ListVessels' Query. Allow users to pass in custom DataConnect instances. */
export function listVessels(
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListVesselsData>>;

/** Generated Node Admin SDK operation action function for the 'ListSchedules' Query. Allow users to execute without passing in DataConnect. */
export function listSchedules(
  dc: DataConnect,
  vars: ListSchedulesVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListSchedulesData>>;
/** Generated Node Admin SDK operation action function for the 'ListSchedules' Query. Allow users to pass in custom DataConnect instances. */
export function listSchedules(
  vars: ListSchedulesVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListSchedulesData>>;

/** Generated Node Admin SDK operation action function for the 'ListDictionaryTerms' Query. Allow users to execute without passing in DataConnect. */
export function listDictionaryTerms(
  dc: DataConnect,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListDictionaryTermsData>>;
/** Generated Node Admin SDK operation action function for the 'ListDictionaryTerms' Query. Allow users to pass in custom DataConnect instances. */
export function listDictionaryTerms(
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListDictionaryTermsData>>;

/** Generated Node Admin SDK operation action function for the 'UpsertDictionaryTerm' Mutation. Allow users to execute without passing in DataConnect. */
export function upsertDictionaryTerm(
  dc: DataConnect,
  vars: UpsertDictionaryTermVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpsertDictionaryTermData>>;
/** Generated Node Admin SDK operation action function for the 'UpsertDictionaryTerm' Mutation. Allow users to pass in custom DataConnect instances. */
export function upsertDictionaryTerm(
  vars: UpsertDictionaryTermVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpsertDictionaryTermData>>;

/** Generated Node Admin SDK operation action function for the 'ListCarriers' Query. Allow users to execute without passing in DataConnect. */
export function listCarriers(
  dc: DataConnect,
  vars: ListCarriersVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCarriersData>>;
/** Generated Node Admin SDK operation action function for the 'ListCarriers' Query. Allow users to pass in custom DataConnect instances. */
export function listCarriers(
  vars: ListCarriersVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCarriersData>>;

/** Generated Node Admin SDK operation action function for the 'ListHauliers' Query. Allow users to execute without passing in DataConnect. */
export function listHauliers(
  dc: DataConnect,
  vars: ListHauliersVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListHauliersData>>;
/** Generated Node Admin SDK operation action function for the 'ListHauliers' Query. Allow users to pass in custom DataConnect instances. */
export function listHauliers(
  vars: ListHauliersVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListHauliersData>>;

/** Generated Node Admin SDK operation action function for the 'ListAgents' Query. Allow users to execute without passing in DataConnect. */
export function listAgents(
  dc: DataConnect,
  vars: ListAgentsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListAgentsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAgents' Query. Allow users to pass in custom DataConnect instances. */
export function listAgents(
  vars: ListAgentsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListAgentsData>>;

/** Generated Node Admin SDK operation action function for the 'ListCompanies' Query. Allow users to execute without passing in DataConnect. */
export function listCompanies(
  dc: DataConnect,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCompaniesData>>;
/** Generated Node Admin SDK operation action function for the 'ListCompanies' Query. Allow users to pass in custom DataConnect instances. */
export function listCompanies(
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListCompaniesData>>;

/** Generated Node Admin SDK operation action function for the 'SearchLocations' Query. Allow users to execute without passing in DataConnect. */
export function searchLocations(
  dc: DataConnect,
  vars: SearchLocationsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<SearchLocationsData>>;
/** Generated Node Admin SDK operation action function for the 'SearchLocations' Query. Allow users to pass in custom DataConnect instances. */
export function searchLocations(
  vars: SearchLocationsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<SearchLocationsData>>;

/** Generated Node Admin SDK operation action function for the 'ListQuotes' Query. Allow users to execute without passing in DataConnect. */
export function listQuotes(
  dc: DataConnect,
  vars: ListQuotesVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListQuotesData>>;
/** Generated Node Admin SDK operation action function for the 'ListQuotes' Query. Allow users to pass in custom DataConnect instances. */
export function listQuotes(
  vars: ListQuotesVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListQuotesData>>;

/** Generated Node Admin SDK operation action function for the 'CreateCompany' Mutation. Allow users to execute without passing in DataConnect. */
export function createCompany(
  dc: DataConnect,
  vars: CreateCompanyVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateCompanyData>>;
/** Generated Node Admin SDK operation action function for the 'CreateCompany' Mutation. Allow users to pass in custom DataConnect instances. */
export function createCompany(
  vars: CreateCompanyVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateCompanyData>>;

/** Generated Node Admin SDK operation action function for the 'CreateLocation' Mutation. Allow users to execute without passing in DataConnect. */
export function createLocation(
  dc: DataConnect,
  vars: CreateLocationVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateLocationData>>;
/** Generated Node Admin SDK operation action function for the 'CreateLocation' Mutation. Allow users to pass in custom DataConnect instances. */
export function createLocation(
  vars: CreateLocationVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateLocationData>>;

/** Generated Node Admin SDK operation action function for the 'CreateQuote' Mutation. Allow users to execute without passing in DataConnect. */
export function createQuote(
  dc: DataConnect,
  vars: CreateQuoteVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateQuoteData>>;
/** Generated Node Admin SDK operation action function for the 'CreateQuote' Mutation. Allow users to pass in custom DataConnect instances. */
export function createQuote(
  vars: CreateQuoteVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateQuoteData>>;

/** Generated Node Admin SDK operation action function for the 'CreateMilestone' Mutation. Allow users to execute without passing in DataConnect. */
export function createMilestone(
  dc: DataConnect,
  vars: CreateMilestoneVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateMilestoneData>>;
/** Generated Node Admin SDK operation action function for the 'CreateMilestone' Mutation. Allow users to pass in custom DataConnect instances. */
export function createMilestone(
  vars: CreateMilestoneVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateMilestoneData>>;

/** Generated Node Admin SDK operation action function for the 'CreateHsCode' Mutation. Allow users to execute without passing in DataConnect. */
export function createHsCode(
  dc: DataConnect,
  vars: CreateHsCodeVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateHsCodeData>>;
/** Generated Node Admin SDK operation action function for the 'CreateHsCode' Mutation. Allow users to pass in custom DataConnect instances. */
export function createHsCode(
  vars: CreateHsCodeVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateHsCodeData>>;

/** Generated Node Admin SDK operation action function for the 'CreateIncoterm' Mutation. Allow users to execute without passing in DataConnect. */
export function createIncoterm(
  dc: DataConnect,
  vars: CreateIncotermVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateIncotermData>>;
/** Generated Node Admin SDK operation action function for the 'CreateIncoterm' Mutation. Allow users to pass in custom DataConnect instances. */
export function createIncoterm(
  vars: CreateIncotermVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateIncotermData>>;

/** Generated Node Admin SDK operation action function for the 'CreateVessel' Mutation. Allow users to execute without passing in DataConnect. */
export function createVessel(
  dc: DataConnect,
  vars: CreateVesselVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateVesselData>>;
/** Generated Node Admin SDK operation action function for the 'CreateVessel' Mutation. Allow users to pass in custom DataConnect instances. */
export function createVessel(
  vars: CreateVesselVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateVesselData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSchedule' Mutation. Allow users to execute without passing in DataConnect. */
export function createSchedule(
  dc: DataConnect,
  vars: CreateScheduleVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateScheduleData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSchedule' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSchedule(
  vars: CreateScheduleVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateScheduleData>>;

/** Generated Node Admin SDK operation action function for the 'InsertDictionaryTerm' Mutation. Allow users to execute without passing in DataConnect. */
export function insertDictionaryTerm(
  dc: DataConnect,
  vars: InsertDictionaryTermVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<InsertDictionaryTermData>>;
/** Generated Node Admin SDK operation action function for the 'InsertDictionaryTerm' Mutation. Allow users to pass in custom DataConnect instances. */
export function insertDictionaryTerm(
  vars: InsertDictionaryTermVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<InsertDictionaryTermData>>;

/** Generated Node Admin SDK operation action function for the 'ListShipments' Query. Allow users to execute without passing in DataConnect. */
export function listShipments(
  dc: DataConnect,
  vars: ListShipmentsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListShipmentsData>>;
/** Generated Node Admin SDK operation action function for the 'ListShipments' Query. Allow users to pass in custom DataConnect instances. */
export function listShipments(
  vars: ListShipmentsVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<ListShipmentsData>>;

/** Generated Node Admin SDK operation action function for the 'GetShipmentById' Query. Allow users to execute without passing in DataConnect. */
export function getShipmentById(
  dc: DataConnect,
  vars: GetShipmentByIdVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<GetShipmentByIdData>>;
/** Generated Node Admin SDK operation action function for the 'GetShipmentById' Query. Allow users to pass in custom DataConnect instances. */
export function getShipmentById(
  vars: GetShipmentByIdVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<GetShipmentByIdData>>;

/** Generated Node Admin SDK operation action function for the 'CreateShipment' Mutation. Allow users to execute without passing in DataConnect. */
export function createShipment(
  dc: DataConnect,
  vars: CreateShipmentVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateShipmentData>>;
/** Generated Node Admin SDK operation action function for the 'CreateShipment' Mutation. Allow users to pass in custom DataConnect instances. */
export function createShipment(
  vars: CreateShipmentVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<CreateShipmentData>>;

/** Generated Node Admin SDK operation action function for the 'LogShipmentEvent' Mutation. Allow users to execute without passing in DataConnect. */
export function logShipmentEvent(
  dc: DataConnect,
  vars: LogShipmentEventVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<LogShipmentEventData>>;
/** Generated Node Admin SDK operation action function for the 'LogShipmentEvent' Mutation. Allow users to pass in custom DataConnect instances. */
export function logShipmentEvent(
  vars: LogShipmentEventVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<LogShipmentEventData>>;

/** Generated Node Admin SDK operation action function for the 'UpsertUser' Mutation. Allow users to execute without passing in DataConnect. */
export function upsertUser(
  dc: DataConnect,
  vars: UpsertUserVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpsertUserData>>;
/** Generated Node Admin SDK operation action function for the 'UpsertUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function upsertUser(
  vars: UpsertUserVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpsertUserData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserProfile' Query. Allow users to execute without passing in DataConnect. */
export function getUserProfile(
  dc: DataConnect,
  vars: GetUserProfileVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<GetUserProfileData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserProfile' Query. Allow users to pass in custom DataConnect instances. */
export function getUserProfile(
  vars: GetUserProfileVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<GetUserProfileData>>;

/** Generated Node Admin SDK operation action function for the 'GetAllUsers' Query. Allow users to execute without passing in DataConnect. */
export function getAllUsers(
  dc: DataConnect,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<GetAllUsersData>>;
/** Generated Node Admin SDK operation action function for the 'GetAllUsers' Query. Allow users to pass in custom DataConnect instances. */
export function getAllUsers(
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<GetAllUsersData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateUserRole' Mutation. Allow users to execute without passing in DataConnect. */
export function updateUserRole(
  dc: DataConnect,
  vars: UpdateUserRoleVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpdateUserRoleData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateUserRole' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateUserRole(
  vars: UpdateUserRoleVariables,
  options?: OperationOptions,
): Promise<ExecuteOperationResponse<UpdateUserRoleData>>;
