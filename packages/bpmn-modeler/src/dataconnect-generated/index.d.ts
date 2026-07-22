import {
  ConnectorConfig,
  DataConnect,
  QueryRef,
  QueryPromise,
  ExecuteQueryOptions,
  MutationRef,
  MutationPromise,
  DataConnectSettings,
} from "firebase/data-connect";

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

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

interface ListCustomersRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ListCustomersVariables,
  ): QueryRef<ListCustomersData, ListCustomersVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListCustomersVariables,
  ): QueryRef<ListCustomersData, ListCustomersVariables>;
  operationName: string;
}
export const listCustomersRef: ListCustomersRef;

export function listCustomers(
  vars: ListCustomersVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCustomersData, ListCustomersVariables>;
export function listCustomers(
  dc: DataConnect,
  vars: ListCustomersVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCustomersData, ListCustomersVariables>;

interface ListCrmDealsRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ListCrmDealsVariables,
  ): QueryRef<ListCrmDealsData, ListCrmDealsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListCrmDealsVariables,
  ): QueryRef<ListCrmDealsData, ListCrmDealsVariables>;
  operationName: string;
}
export const listCrmDealsRef: ListCrmDealsRef;

export function listCrmDeals(
  vars: ListCrmDealsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCrmDealsData, ListCrmDealsVariables>;
export function listCrmDeals(
  dc: DataConnect,
  vars: ListCrmDealsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCrmDealsData, ListCrmDealsVariables>;

interface ListCrmInteractionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ListCrmInteractionsVariables,
  ): QueryRef<ListCrmInteractionsData, ListCrmInteractionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListCrmInteractionsVariables,
  ): QueryRef<ListCrmInteractionsData, ListCrmInteractionsVariables>;
  operationName: string;
}
export const listCrmInteractionsRef: ListCrmInteractionsRef;

export function listCrmInteractions(
  vars: ListCrmInteractionsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCrmInteractionsData, ListCrmInteractionsVariables>;
export function listCrmInteractions(
  dc: DataConnect,
  vars: ListCrmInteractionsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCrmInteractionsData, ListCrmInteractionsVariables>;

interface CreateCrmDealRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateCrmDealVariables,
  ): MutationRef<CreateCrmDealData, CreateCrmDealVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateCrmDealVariables,
  ): MutationRef<CreateCrmDealData, CreateCrmDealVariables>;
  operationName: string;
}
export const createCrmDealRef: CreateCrmDealRef;

export function createCrmDeal(
  vars: CreateCrmDealVariables,
): MutationPromise<CreateCrmDealData, CreateCrmDealVariables>;
export function createCrmDeal(
  dc: DataConnect,
  vars: CreateCrmDealVariables,
): MutationPromise<CreateCrmDealData, CreateCrmDealVariables>;

interface UpdateCrmDealStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: UpdateCrmDealStatusVariables,
  ): MutationRef<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: UpdateCrmDealStatusVariables,
  ): MutationRef<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
  operationName: string;
}
export const updateCrmDealStatusRef: UpdateCrmDealStatusRef;

export function updateCrmDealStatus(
  vars: UpdateCrmDealStatusVariables,
): MutationPromise<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
export function updateCrmDealStatus(
  dc: DataConnect,
  vars: UpdateCrmDealStatusVariables,
): MutationPromise<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;

interface CreateCrmInteractionRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateCrmInteractionVariables,
  ): MutationRef<CreateCrmInteractionData, CreateCrmInteractionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateCrmInteractionVariables,
  ): MutationRef<CreateCrmInteractionData, CreateCrmInteractionVariables>;
  operationName: string;
}
export const createCrmInteractionRef: CreateCrmInteractionRef;

export function createCrmInteraction(
  vars: CreateCrmInteractionVariables,
): MutationPromise<CreateCrmInteractionData, CreateCrmInteractionVariables>;
export function createCrmInteraction(
  dc: DataConnect,
  vars: CreateCrmInteractionVariables,
): MutationPromise<CreateCrmInteractionData, CreateCrmInteractionVariables>;

interface CreateDocumentFromOcrRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateDocumentFromOcrVariables,
  ): MutationRef<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateDocumentFromOcrVariables,
  ): MutationRef<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
  operationName: string;
}
export const createDocumentFromOcrRef: CreateDocumentFromOcrRef;

export function createDocumentFromOcr(
  vars: CreateDocumentFromOcrVariables,
): MutationPromise<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
export function createDocumentFromOcr(
  dc: DataConnect,
  vars: CreateDocumentFromOcrVariables,
): MutationPromise<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;

interface ApproveOcrDocumentRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ApproveOcrDocumentVariables,
  ): MutationRef<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ApproveOcrDocumentVariables,
  ): MutationRef<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
  operationName: string;
}
export const approveOcrDocumentRef: ApproveOcrDocumentRef;

export function approveOcrDocument(
  vars: ApproveOcrDocumentVariables,
): MutationPromise<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
export function approveOcrDocument(
  dc: DataConnect,
  vars: ApproveOcrDocumentVariables,
): MutationPromise<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;

interface RejectOcrDocumentRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: RejectOcrDocumentVariables,
  ): MutationRef<RejectOcrDocumentData, RejectOcrDocumentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: RejectOcrDocumentVariables,
  ): MutationRef<RejectOcrDocumentData, RejectOcrDocumentVariables>;
  operationName: string;
}
export const rejectOcrDocumentRef: RejectOcrDocumentRef;

export function rejectOcrDocument(
  vars: RejectOcrDocumentVariables,
): MutationPromise<RejectOcrDocumentData, RejectOcrDocumentVariables>;
export function rejectOcrDocument(
  dc: DataConnect,
  vars: RejectOcrDocumentVariables,
): MutationPromise<RejectOcrDocumentData, RejectOcrDocumentVariables>;

interface ListPendingOcrDocumentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPendingOcrDocumentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPendingOcrDocumentsData, undefined>;
  operationName: string;
}
export const listPendingOcrDocumentsRef: ListPendingOcrDocumentsRef;

export function listPendingOcrDocuments(
  options?: ExecuteQueryOptions,
): QueryPromise<ListPendingOcrDocumentsData, undefined>;
export function listPendingOcrDocuments(
  dc: DataConnect,
  options?: ExecuteQueryOptions,
): QueryPromise<ListPendingOcrDocumentsData, undefined>;

interface ListIncotermsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListIncotermsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListIncotermsData, undefined>;
  operationName: string;
}
export const listIncotermsRef: ListIncotermsRef;

export function listIncoterms(
  options?: ExecuteQueryOptions,
): QueryPromise<ListIncotermsData, undefined>;
export function listIncoterms(
  dc: DataConnect,
  options?: ExecuteQueryOptions,
): QueryPromise<ListIncotermsData, undefined>;

interface ListHsCodesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListHsCodesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListHsCodesData, undefined>;
  operationName: string;
}
export const listHsCodesRef: ListHsCodesRef;

export function listHsCodes(
  options?: ExecuteQueryOptions,
): QueryPromise<ListHsCodesData, undefined>;
export function listHsCodes(
  dc: DataConnect,
  options?: ExecuteQueryOptions,
): QueryPromise<ListHsCodesData, undefined>;

interface ListVesselsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListVesselsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListVesselsData, undefined>;
  operationName: string;
}
export const listVesselsRef: ListVesselsRef;

export function listVessels(
  options?: ExecuteQueryOptions,
): QueryPromise<ListVesselsData, undefined>;
export function listVessels(
  dc: DataConnect,
  options?: ExecuteQueryOptions,
): QueryPromise<ListVesselsData, undefined>;

interface ListSchedulesRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ListSchedulesVariables,
  ): QueryRef<ListSchedulesData, ListSchedulesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListSchedulesVariables,
  ): QueryRef<ListSchedulesData, ListSchedulesVariables>;
  operationName: string;
}
export const listSchedulesRef: ListSchedulesRef;

export function listSchedules(
  vars: ListSchedulesVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListSchedulesData, ListSchedulesVariables>;
export function listSchedules(
  dc: DataConnect,
  vars: ListSchedulesVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListSchedulesData, ListSchedulesVariables>;

interface ListDictionaryTermsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDictionaryTermsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListDictionaryTermsData, undefined>;
  operationName: string;
}
export const listDictionaryTermsRef: ListDictionaryTermsRef;

export function listDictionaryTerms(
  options?: ExecuteQueryOptions,
): QueryPromise<ListDictionaryTermsData, undefined>;
export function listDictionaryTerms(
  dc: DataConnect,
  options?: ExecuteQueryOptions,
): QueryPromise<ListDictionaryTermsData, undefined>;

interface UpsertDictionaryTermRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: UpsertDictionaryTermVariables,
  ): MutationRef<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: UpsertDictionaryTermVariables,
  ): MutationRef<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
  operationName: string;
}
export const upsertDictionaryTermRef: UpsertDictionaryTermRef;

export function upsertDictionaryTerm(
  vars: UpsertDictionaryTermVariables,
): MutationPromise<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
export function upsertDictionaryTerm(
  dc: DataConnect,
  vars: UpsertDictionaryTermVariables,
): MutationPromise<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;

interface ListCarriersRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ListCarriersVariables,
  ): QueryRef<ListCarriersData, ListCarriersVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListCarriersVariables,
  ): QueryRef<ListCarriersData, ListCarriersVariables>;
  operationName: string;
}
export const listCarriersRef: ListCarriersRef;

export function listCarriers(
  vars: ListCarriersVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCarriersData, ListCarriersVariables>;
export function listCarriers(
  dc: DataConnect,
  vars: ListCarriersVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCarriersData, ListCarriersVariables>;

interface ListHauliersRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ListHauliersVariables,
  ): QueryRef<ListHauliersData, ListHauliersVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListHauliersVariables,
  ): QueryRef<ListHauliersData, ListHauliersVariables>;
  operationName: string;
}
export const listHauliersRef: ListHauliersRef;

export function listHauliers(
  vars: ListHauliersVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListHauliersData, ListHauliersVariables>;
export function listHauliers(
  dc: DataConnect,
  vars: ListHauliersVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListHauliersData, ListHauliersVariables>;

interface ListAgentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAgentsVariables): QueryRef<ListAgentsData, ListAgentsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListAgentsVariables,
  ): QueryRef<ListAgentsData, ListAgentsVariables>;
  operationName: string;
}
export const listAgentsRef: ListAgentsRef;

export function listAgents(
  vars: ListAgentsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListAgentsData, ListAgentsVariables>;
export function listAgents(
  dc: DataConnect,
  vars: ListAgentsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListAgentsData, ListAgentsVariables>;

interface ListCompaniesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompaniesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCompaniesData, undefined>;
  operationName: string;
}
export const listCompaniesRef: ListCompaniesRef;

export function listCompanies(
  options?: ExecuteQueryOptions,
): QueryPromise<ListCompaniesData, undefined>;
export function listCompanies(
  dc: DataConnect,
  options?: ExecuteQueryOptions,
): QueryPromise<ListCompaniesData, undefined>;

interface SearchLocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: SearchLocationsVariables,
  ): QueryRef<SearchLocationsData, SearchLocationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: SearchLocationsVariables,
  ): QueryRef<SearchLocationsData, SearchLocationsVariables>;
  operationName: string;
}
export const searchLocationsRef: SearchLocationsRef;

export function searchLocations(
  vars: SearchLocationsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<SearchLocationsData, SearchLocationsVariables>;
export function searchLocations(
  dc: DataConnect,
  vars: SearchLocationsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<SearchLocationsData, SearchLocationsVariables>;

interface ListQuotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListQuotesVariables): QueryRef<ListQuotesData, ListQuotesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListQuotesVariables,
  ): QueryRef<ListQuotesData, ListQuotesVariables>;
  operationName: string;
}
export const listQuotesRef: ListQuotesRef;

export function listQuotes(
  vars: ListQuotesVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListQuotesData, ListQuotesVariables>;
export function listQuotes(
  dc: DataConnect,
  vars: ListQuotesVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListQuotesData, ListQuotesVariables>;

interface CreateCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateCompanyVariables,
  ): MutationRef<CreateCompanyData, CreateCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateCompanyVariables,
  ): MutationRef<CreateCompanyData, CreateCompanyVariables>;
  operationName: string;
}
export const createCompanyRef: CreateCompanyRef;

export function createCompany(
  vars: CreateCompanyVariables,
): MutationPromise<CreateCompanyData, CreateCompanyVariables>;
export function createCompany(
  dc: DataConnect,
  vars: CreateCompanyVariables,
): MutationPromise<CreateCompanyData, CreateCompanyVariables>;

interface CreateLocationRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateLocationVariables,
  ): MutationRef<CreateLocationData, CreateLocationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateLocationVariables,
  ): MutationRef<CreateLocationData, CreateLocationVariables>;
  operationName: string;
}
export const createLocationRef: CreateLocationRef;

export function createLocation(
  vars: CreateLocationVariables,
): MutationPromise<CreateLocationData, CreateLocationVariables>;
export function createLocation(
  dc: DataConnect,
  vars: CreateLocationVariables,
): MutationPromise<CreateLocationData, CreateLocationVariables>;

interface CreateQuoteRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateQuoteVariables,
  ): MutationRef<CreateQuoteData, CreateQuoteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateQuoteVariables,
  ): MutationRef<CreateQuoteData, CreateQuoteVariables>;
  operationName: string;
}
export const createQuoteRef: CreateQuoteRef;

export function createQuote(
  vars: CreateQuoteVariables,
): MutationPromise<CreateQuoteData, CreateQuoteVariables>;
export function createQuote(
  dc: DataConnect,
  vars: CreateQuoteVariables,
): MutationPromise<CreateQuoteData, CreateQuoteVariables>;

interface CreateMilestoneRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateMilestoneVariables,
  ): MutationRef<CreateMilestoneData, CreateMilestoneVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateMilestoneVariables,
  ): MutationRef<CreateMilestoneData, CreateMilestoneVariables>;
  operationName: string;
}
export const createMilestoneRef: CreateMilestoneRef;

export function createMilestone(
  vars: CreateMilestoneVariables,
): MutationPromise<CreateMilestoneData, CreateMilestoneVariables>;
export function createMilestone(
  dc: DataConnect,
  vars: CreateMilestoneVariables,
): MutationPromise<CreateMilestoneData, CreateMilestoneVariables>;

interface CreateHsCodeRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateHsCodeVariables,
  ): MutationRef<CreateHsCodeData, CreateHsCodeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateHsCodeVariables,
  ): MutationRef<CreateHsCodeData, CreateHsCodeVariables>;
  operationName: string;
}
export const createHsCodeRef: CreateHsCodeRef;

export function createHsCode(
  vars: CreateHsCodeVariables,
): MutationPromise<CreateHsCodeData, CreateHsCodeVariables>;
export function createHsCode(
  dc: DataConnect,
  vars: CreateHsCodeVariables,
): MutationPromise<CreateHsCodeData, CreateHsCodeVariables>;

interface CreateIncotermRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateIncotermVariables,
  ): MutationRef<CreateIncotermData, CreateIncotermVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateIncotermVariables,
  ): MutationRef<CreateIncotermData, CreateIncotermVariables>;
  operationName: string;
}
export const createIncotermRef: CreateIncotermRef;

export function createIncoterm(
  vars: CreateIncotermVariables,
): MutationPromise<CreateIncotermData, CreateIncotermVariables>;
export function createIncoterm(
  dc: DataConnect,
  vars: CreateIncotermVariables,
): MutationPromise<CreateIncotermData, CreateIncotermVariables>;

interface CreateVesselRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateVesselVariables,
  ): MutationRef<CreateVesselData, CreateVesselVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateVesselVariables,
  ): MutationRef<CreateVesselData, CreateVesselVariables>;
  operationName: string;
}
export const createVesselRef: CreateVesselRef;

export function createVessel(
  vars: CreateVesselVariables,
): MutationPromise<CreateVesselData, CreateVesselVariables>;
export function createVessel(
  dc: DataConnect,
  vars: CreateVesselVariables,
): MutationPromise<CreateVesselData, CreateVesselVariables>;

interface CreateScheduleRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateScheduleVariables,
  ): MutationRef<CreateScheduleData, CreateScheduleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateScheduleVariables,
  ): MutationRef<CreateScheduleData, CreateScheduleVariables>;
  operationName: string;
}
export const createScheduleRef: CreateScheduleRef;

export function createSchedule(
  vars: CreateScheduleVariables,
): MutationPromise<CreateScheduleData, CreateScheduleVariables>;
export function createSchedule(
  dc: DataConnect,
  vars: CreateScheduleVariables,
): MutationPromise<CreateScheduleData, CreateScheduleVariables>;

interface InsertDictionaryTermRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: InsertDictionaryTermVariables,
  ): MutationRef<InsertDictionaryTermData, InsertDictionaryTermVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: InsertDictionaryTermVariables,
  ): MutationRef<InsertDictionaryTermData, InsertDictionaryTermVariables>;
  operationName: string;
}
export const insertDictionaryTermRef: InsertDictionaryTermRef;

export function insertDictionaryTerm(
  vars: InsertDictionaryTermVariables,
): MutationPromise<InsertDictionaryTermData, InsertDictionaryTermVariables>;
export function insertDictionaryTerm(
  dc: DataConnect,
  vars: InsertDictionaryTermVariables,
): MutationPromise<InsertDictionaryTermData, InsertDictionaryTermVariables>;

interface ListShipmentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: ListShipmentsVariables,
  ): QueryRef<ListShipmentsData, ListShipmentsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: ListShipmentsVariables,
  ): QueryRef<ListShipmentsData, ListShipmentsVariables>;
  operationName: string;
}
export const listShipmentsRef: ListShipmentsRef;

export function listShipments(
  vars: ListShipmentsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListShipmentsData, ListShipmentsVariables>;
export function listShipments(
  dc: DataConnect,
  vars: ListShipmentsVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<ListShipmentsData, ListShipmentsVariables>;

interface GetShipmentByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: GetShipmentByIdVariables,
  ): QueryRef<GetShipmentByIdData, GetShipmentByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: GetShipmentByIdVariables,
  ): QueryRef<GetShipmentByIdData, GetShipmentByIdVariables>;
  operationName: string;
}
export const getShipmentByIdRef: GetShipmentByIdRef;

export function getShipmentById(
  vars: GetShipmentByIdVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<GetShipmentByIdData, GetShipmentByIdVariables>;
export function getShipmentById(
  dc: DataConnect,
  vars: GetShipmentByIdVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<GetShipmentByIdData, GetShipmentByIdVariables>;

interface CreateShipmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: CreateShipmentVariables,
  ): MutationRef<CreateShipmentData, CreateShipmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateShipmentVariables,
  ): MutationRef<CreateShipmentData, CreateShipmentVariables>;
  operationName: string;
}
export const createShipmentRef: CreateShipmentRef;

export function createShipment(
  vars: CreateShipmentVariables,
): MutationPromise<CreateShipmentData, CreateShipmentVariables>;
export function createShipment(
  dc: DataConnect,
  vars: CreateShipmentVariables,
): MutationPromise<CreateShipmentData, CreateShipmentVariables>;

interface LogShipmentEventRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: LogShipmentEventVariables,
  ): MutationRef<LogShipmentEventData, LogShipmentEventVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: LogShipmentEventVariables,
  ): MutationRef<LogShipmentEventData, LogShipmentEventVariables>;
  operationName: string;
}
export const logShipmentEventRef: LogShipmentEventRef;

export function logShipmentEvent(
  vars: LogShipmentEventVariables,
): MutationPromise<LogShipmentEventData, LogShipmentEventVariables>;
export function logShipmentEvent(
  dc: DataConnect,
  vars: LogShipmentEventVariables,
): MutationPromise<LogShipmentEventData, LogShipmentEventVariables>;

interface UpsertUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: UpsertUserVariables,
  ): MutationRef<UpsertUserData, UpsertUserVariables>;
  operationName: string;
}
export const upsertUserRef: UpsertUserRef;

export function upsertUser(
  vars: UpsertUserVariables,
): MutationPromise<UpsertUserData, UpsertUserVariables>;
export function upsertUser(
  dc: DataConnect,
  vars: UpsertUserVariables,
): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface GetUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: GetUserProfileVariables,
  ): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: GetUserProfileVariables,
  ): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  operationName: string;
}
export const getUserProfileRef: GetUserProfileRef;

export function getUserProfile(
  vars: GetUserProfileVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<GetUserProfileData, GetUserProfileVariables>;
export function getUserProfile(
  dc: DataConnect,
  vars: GetUserProfileVariables,
  options?: ExecuteQueryOptions,
): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetAllUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllUsersData, undefined>;
  operationName: string;
}
export const getAllUsersRef: GetAllUsersRef;

export function getAllUsers(
  options?: ExecuteQueryOptions,
): QueryPromise<GetAllUsersData, undefined>;
export function getAllUsers(
  dc: DataConnect,
  options?: ExecuteQueryOptions,
): QueryPromise<GetAllUsersData, undefined>;

interface UpdateUserRoleRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: UpdateUserRoleVariables,
  ): MutationRef<UpdateUserRoleData, UpdateUserRoleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: UpdateUserRoleVariables,
  ): MutationRef<UpdateUserRoleData, UpdateUserRoleVariables>;
  operationName: string;
}
export const updateUserRoleRef: UpdateUserRoleRef;

export function updateUserRole(
  vars: UpdateUserRoleVariables,
): MutationPromise<UpdateUserRoleData, UpdateUserRoleVariables>;
export function updateUserRole(
  dc: DataConnect,
  vars: UpdateUserRoleVariables,
): MutationPromise<UpdateUserRoleData, UpdateUserRoleVariables>;
