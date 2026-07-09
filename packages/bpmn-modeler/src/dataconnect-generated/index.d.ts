import {
  ConnectorConfig,
  DataConnect,
  QueryRef,
  QueryPromise,
  ExecuteQueryOptions,
  MutationRef,
  MutationPromise,
  DataConnectSettings,
} from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

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
  shipperId: UUIDString;
  consigneeId: UUIDString;
  origin: string;
  destination: string;
  movementType: string;
  direction: string;
  incoterm: string;
  pol: string;
  pod: string;
}

export interface DeleteShipmentData {
  shipment_delete?: Shipment_Key | null;
}

export interface DeleteShipmentVariables {
  id: UUIDString;
}

export interface Document_Key {
  id: UUIDString;
  __typename?: 'Document_Key';
}

export interface GetAllUsersData {
  users: ({
    uid: string;
    email: string;
    role: string;
  } & User_Key)[];
}

export interface GetUserRoleData {
  users: {
    role: string;
    email: string;
  }[];
}

export interface GetUserRoleVariables {
  uid: string;
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: 'Invoice_Key';
}

export interface ListShipmentsData {
  shipments: {
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    shipper: {
      name: string;
    };
  }[];
}

export interface Location_Key {
  locode: string;
  __typename?: 'Location_Key';
}

export interface Milestone_Key {
  id: UUIDString;
  __typename?: 'Milestone_Key';
}

export interface Quote_Key {
  id: UUIDString;
  __typename?: 'Quote_Key';
}

export interface Shipment_Key {
  id: UUIDString;
  __typename?: 'Shipment_Key';
}

export interface UpdateShipmentStatusData {
  shipment_update?: Shipment_Key | null;
}

export interface UpdateShipmentStatusVariables {
  id: UUIDString;
  status: string;
}

export interface UpdateUserRoleData {
  user_update?: User_Key | null;
}

export interface UpdateUserRoleVariables {
  uid: string;
  role: string;
}

export interface UpsertUserData {
  user_upsert: User_Key;
}

export interface UpsertUserVariables {
  uid: string;
  email: string;
  role: string;
}

export interface User_Key {
  uid: string;
  __typename?: 'User_Key';
}

export interface Workflow_Key {
  id: UUIDString;
  __typename?: 'Workflow_Key';
}

interface UpsertUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  operationName: string;
}
export const upsertUserRef: UpsertUserRef;

export function upsertUser(
  vars: UpsertUserVariables
): MutationPromise<UpsertUserData, UpsertUserVariables>;
export function upsertUser(
  dc: DataConnect,
  vars: UpsertUserVariables
): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface GetUserRoleRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserRoleVariables): QueryRef<GetUserRoleData, GetUserRoleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserRoleVariables): QueryRef<GetUserRoleData, GetUserRoleVariables>;
  operationName: string;
}
export const getUserRoleRef: GetUserRoleRef;

export function getUserRole(
  vars: GetUserRoleVariables,
  options?: ExecuteQueryOptions
): QueryPromise<GetUserRoleData, GetUserRoleVariables>;
export function getUserRole(
  dc: DataConnect,
  vars: GetUserRoleVariables,
  options?: ExecuteQueryOptions
): QueryPromise<GetUserRoleData, GetUserRoleVariables>;

interface GetAllUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllUsersData, undefined>;
  operationName: string;
}
export const getAllUsersRef: GetAllUsersRef;

export function getAllUsers(
  options?: ExecuteQueryOptions
): QueryPromise<GetAllUsersData, undefined>;
export function getAllUsers(
  dc: DataConnect,
  options?: ExecuteQueryOptions
): QueryPromise<GetAllUsersData, undefined>;

interface UpdateUserRoleRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserRoleVariables): MutationRef<UpdateUserRoleData, UpdateUserRoleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: UpdateUserRoleVariables
  ): MutationRef<UpdateUserRoleData, UpdateUserRoleVariables>;
  operationName: string;
}
export const updateUserRoleRef: UpdateUserRoleRef;

export function updateUserRole(
  vars: UpdateUserRoleVariables
): MutationPromise<UpdateUserRoleData, UpdateUserRoleVariables>;
export function updateUserRole(
  dc: DataConnect,
  vars: UpdateUserRoleVariables
): MutationPromise<UpdateUserRoleData, UpdateUserRoleVariables>;

interface CreateShipmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateShipmentVariables): MutationRef<CreateShipmentData, CreateShipmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: CreateShipmentVariables
  ): MutationRef<CreateShipmentData, CreateShipmentVariables>;
  operationName: string;
}
export const createShipmentRef: CreateShipmentRef;

export function createShipment(
  vars: CreateShipmentVariables
): MutationPromise<CreateShipmentData, CreateShipmentVariables>;
export function createShipment(
  dc: DataConnect,
  vars: CreateShipmentVariables
): MutationPromise<CreateShipmentData, CreateShipmentVariables>;

interface ListShipmentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListShipmentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListShipmentsData, undefined>;
  operationName: string;
}
export const listShipmentsRef: ListShipmentsRef;

export function listShipments(
  options?: ExecuteQueryOptions
): QueryPromise<ListShipmentsData, undefined>;
export function listShipments(
  dc: DataConnect,
  options?: ExecuteQueryOptions
): QueryPromise<ListShipmentsData, undefined>;

interface UpdateShipmentStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (
    vars: UpdateShipmentStatusVariables
  ): MutationRef<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: UpdateShipmentStatusVariables
  ): MutationRef<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;
  operationName: string;
}
export const updateShipmentStatusRef: UpdateShipmentStatusRef;

export function updateShipmentStatus(
  vars: UpdateShipmentStatusVariables
): MutationPromise<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;
export function updateShipmentStatus(
  dc: DataConnect,
  vars: UpdateShipmentStatusVariables
): MutationPromise<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;

interface DeleteShipmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteShipmentVariables): MutationRef<DeleteShipmentData, DeleteShipmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (
    dc: DataConnect,
    vars: DeleteShipmentVariables
  ): MutationRef<DeleteShipmentData, DeleteShipmentVariables>;
  operationName: string;
}
export const deleteShipmentRef: DeleteShipmentRef;

export function deleteShipment(
  vars: DeleteShipmentVariables
): MutationPromise<DeleteShipmentData, DeleteShipmentVariables>;
export function deleteShipment(
  dc: DataConnect,
  vars: DeleteShipmentVariables
): MutationPromise<DeleteShipmentData, DeleteShipmentVariables>;
