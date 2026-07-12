import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Company_Key {
  id: UUIDString;
  __typename?: 'Company_Key';
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

export interface Document_Key {
  id: UUIDString;
  __typename?: 'Document_Key';
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

export interface HsCode_Key {
  code: string;
  __typename?: 'HsCode_Key';
}

export interface Incoterm_Key {
  code: string;
  __typename?: 'Incoterm_Key';
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: 'Invoice_Key';
}

export interface ListCompaniesData {
  companies: ({
    id: UUIDString;
    name: string;
    entityType: string;
    countryCode?: string | null;
  } & Company_Key)[];
}

export interface ListQuotesData {
  quotes: ({
    id: UUIDString;
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
  origin?: string | null;
  destination?: string | null;
}

export interface ListShipmentsData {
  shipments: ({
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
  })[];
}

export interface Location_Key {
  locode: string;
  __typename?: 'Location_Key';
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
  __typename?: 'Milestone_Key';
}

export interface Quote_Key {
  id: UUIDString;
  __typename?: 'Quote_Key';
}

export interface Schedule_Key {
  id: UUIDString;
  __typename?: 'Schedule_Key';
}

export interface SearchLocationsData {
  locations: ({
    locode: string;
    name: string;
    countryCode: string;
    countryName: string;
    type: string;
  } & Location_Key)[];
}

export interface SearchLocationsVariables {
  query: string;
}

export interface ShipmentEventLog_Key {
  id: UUIDString;
  __typename?: 'ShipmentEventLog_Key';
}

export interface Shipment_Key {
  id: UUIDString;
  __typename?: 'Shipment_Key';
}

export interface User_Key {
  uid: string;
  __typename?: 'User_Key';
}

export interface Vessel_Key {
  imoNumber: string;
  __typename?: 'Vessel_Key';
}

export interface Workflow_Key {
  id: UUIDString;
  __typename?: 'Workflow_Key';
}

interface ListCompaniesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompaniesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCompaniesData, undefined>;
  operationName: string;
}
export const listCompaniesRef: ListCompaniesRef;

export function listCompanies(options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;
export function listCompanies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface SearchLocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SearchLocationsVariables): QueryRef<SearchLocationsData, SearchLocationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SearchLocationsVariables): QueryRef<SearchLocationsData, SearchLocationsVariables>;
  operationName: string;
}
export const searchLocationsRef: SearchLocationsRef;

export function searchLocations(vars: SearchLocationsVariables, options?: ExecuteQueryOptions): QueryPromise<SearchLocationsData, SearchLocationsVariables>;
export function searchLocations(dc: DataConnect, vars: SearchLocationsVariables, options?: ExecuteQueryOptions): QueryPromise<SearchLocationsData, SearchLocationsVariables>;

interface ListQuotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListQuotesVariables): QueryRef<ListQuotesData, ListQuotesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: ListQuotesVariables): QueryRef<ListQuotesData, ListQuotesVariables>;
  operationName: string;
}
export const listQuotesRef: ListQuotesRef;

export function listQuotes(vars?: ListQuotesVariables, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, ListQuotesVariables>;
export function listQuotes(dc: DataConnect, vars?: ListQuotesVariables, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, ListQuotesVariables>;

interface CreateCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCompanyVariables): MutationRef<CreateCompanyData, CreateCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateCompanyVariables): MutationRef<CreateCompanyData, CreateCompanyVariables>;
  operationName: string;
}
export const createCompanyRef: CreateCompanyRef;

export function createCompany(vars: CreateCompanyVariables): MutationPromise<CreateCompanyData, CreateCompanyVariables>;
export function createCompany(dc: DataConnect, vars: CreateCompanyVariables): MutationPromise<CreateCompanyData, CreateCompanyVariables>;

interface CreateLocationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateLocationVariables): MutationRef<CreateLocationData, CreateLocationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateLocationVariables): MutationRef<CreateLocationData, CreateLocationVariables>;
  operationName: string;
}
export const createLocationRef: CreateLocationRef;

export function createLocation(vars: CreateLocationVariables): MutationPromise<CreateLocationData, CreateLocationVariables>;
export function createLocation(dc: DataConnect, vars: CreateLocationVariables): MutationPromise<CreateLocationData, CreateLocationVariables>;

interface CreateQuoteRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateQuoteVariables): MutationRef<CreateQuoteData, CreateQuoteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateQuoteVariables): MutationRef<CreateQuoteData, CreateQuoteVariables>;
  operationName: string;
}
export const createQuoteRef: CreateQuoteRef;

export function createQuote(vars: CreateQuoteVariables): MutationPromise<CreateQuoteData, CreateQuoteVariables>;
export function createQuote(dc: DataConnect, vars: CreateQuoteVariables): MutationPromise<CreateQuoteData, CreateQuoteVariables>;

interface CreateMilestoneRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMilestoneVariables): MutationRef<CreateMilestoneData, CreateMilestoneVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMilestoneVariables): MutationRef<CreateMilestoneData, CreateMilestoneVariables>;
  operationName: string;
}
export const createMilestoneRef: CreateMilestoneRef;

export function createMilestone(vars: CreateMilestoneVariables): MutationPromise<CreateMilestoneData, CreateMilestoneVariables>;
export function createMilestone(dc: DataConnect, vars: CreateMilestoneVariables): MutationPromise<CreateMilestoneData, CreateMilestoneVariables>;

interface CreateHsCodeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateHsCodeVariables): MutationRef<CreateHsCodeData, CreateHsCodeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateHsCodeVariables): MutationRef<CreateHsCodeData, CreateHsCodeVariables>;
  operationName: string;
}
export const createHsCodeRef: CreateHsCodeRef;

export function createHsCode(vars: CreateHsCodeVariables): MutationPromise<CreateHsCodeData, CreateHsCodeVariables>;
export function createHsCode(dc: DataConnect, vars: CreateHsCodeVariables): MutationPromise<CreateHsCodeData, CreateHsCodeVariables>;

interface CreateIncotermRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateIncotermVariables): MutationRef<CreateIncotermData, CreateIncotermVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateIncotermVariables): MutationRef<CreateIncotermData, CreateIncotermVariables>;
  operationName: string;
}
export const createIncotermRef: CreateIncotermRef;

export function createIncoterm(vars: CreateIncotermVariables): MutationPromise<CreateIncotermData, CreateIncotermVariables>;
export function createIncoterm(dc: DataConnect, vars: CreateIncotermVariables): MutationPromise<CreateIncotermData, CreateIncotermVariables>;

interface CreateVesselRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVesselVariables): MutationRef<CreateVesselData, CreateVesselVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateVesselVariables): MutationRef<CreateVesselData, CreateVesselVariables>;
  operationName: string;
}
export const createVesselRef: CreateVesselRef;

export function createVessel(vars: CreateVesselVariables): MutationPromise<CreateVesselData, CreateVesselVariables>;
export function createVessel(dc: DataConnect, vars: CreateVesselVariables): MutationPromise<CreateVesselData, CreateVesselVariables>;

interface CreateScheduleRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
  operationName: string;
}
export const createScheduleRef: CreateScheduleRef;

export function createSchedule(vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;
export function createSchedule(dc: DataConnect, vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;

interface ListShipmentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListShipmentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListShipmentsData, undefined>;
  operationName: string;
}
export const listShipmentsRef: ListShipmentsRef;

export function listShipments(options?: ExecuteQueryOptions): QueryPromise<ListShipmentsData, undefined>;
export function listShipments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListShipmentsData, undefined>;

interface GetShipmentByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetShipmentByIdVariables): QueryRef<GetShipmentByIdData, GetShipmentByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetShipmentByIdVariables): QueryRef<GetShipmentByIdData, GetShipmentByIdVariables>;
  operationName: string;
}
export const getShipmentByIdRef: GetShipmentByIdRef;

export function getShipmentById(vars: GetShipmentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetShipmentByIdData, GetShipmentByIdVariables>;
export function getShipmentById(dc: DataConnect, vars: GetShipmentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetShipmentByIdData, GetShipmentByIdVariables>;

interface CreateShipmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateShipmentVariables): MutationRef<CreateShipmentData, CreateShipmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateShipmentVariables): MutationRef<CreateShipmentData, CreateShipmentVariables>;
  operationName: string;
}
export const createShipmentRef: CreateShipmentRef;

export function createShipment(vars: CreateShipmentVariables): MutationPromise<CreateShipmentData, CreateShipmentVariables>;
export function createShipment(dc: DataConnect, vars: CreateShipmentVariables): MutationPromise<CreateShipmentData, CreateShipmentVariables>;

interface LogShipmentEventRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogShipmentEventVariables): MutationRef<LogShipmentEventData, LogShipmentEventVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: LogShipmentEventVariables): MutationRef<LogShipmentEventData, LogShipmentEventVariables>;
  operationName: string;
}
export const logShipmentEventRef: LogShipmentEventRef;

export function logShipmentEvent(vars: LogShipmentEventVariables): MutationPromise<LogShipmentEventData, LogShipmentEventVariables>;
export function logShipmentEvent(dc: DataConnect, vars: LogShipmentEventVariables): MutationPromise<LogShipmentEventData, LogShipmentEventVariables>;

