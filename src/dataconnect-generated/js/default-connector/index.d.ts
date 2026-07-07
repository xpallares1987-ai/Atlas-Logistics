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

export interface CreateShipmentData {
  shipment_insert: Shipment_Key;
}

export interface CreateShipmentVariables {
  trackingNumber: string;
  status: string;
  movementType: string;
  direction: string;
  incoterm: string;
  origin: string;
  pol: string;
  pod: string;
  destination: string;
  shipperId: UUIDString;
  consigneeId: UUIDString;
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
    shipper: {
      name: string;
    };
    consignee: {
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
    quoteNumber: string;
    status: string;
    origin: string;
    destination: string;
    totalCost: number;
    currency: string;
    carrier?: {
      name: string;
    };
  })[];
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
    shipper: {
      name: string;
    };
    consignee: {
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

interface ListQuotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListQuotesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListQuotesData, undefined>;
  operationName: string;
}
export const listQuotesRef: ListQuotesRef;

export function listQuotes(options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, undefined>;
export function listQuotes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, undefined>;

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

