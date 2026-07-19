import {
  UpsertUserData,
  UpsertUserVariables,
  GetUserRoleData,
  GetUserRoleVariables,
  GetAllUsersData,
  UpdateUserRoleData,
  UpdateUserRoleVariables,
  CreateShipmentData,
  CreateShipmentVariables,
  ListShipmentsData,
  UpdateShipmentStatusData,
  UpdateShipmentStatusVariables,
  DeleteShipmentData,
  DeleteShipmentVariables,
} from "../";
import {
  UseDataConnectQueryResult,
  useDataConnectQueryOptions,
  UseDataConnectMutationResult,
  useDataConnectMutationOptions,
} from "@tanstack-query-firebase/react/data-connect";
import { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { DataConnect } from "firebase/data-connect";
import { FirebaseError } from "firebase/app";

export function useUpsertUser(
  options?: useDataConnectMutationOptions<
    UpsertUserData,
    FirebaseError,
    UpsertUserVariables
  >,
): UseDataConnectMutationResult<UpsertUserData, UpsertUserVariables>;
export function useUpsertUser(
  dc: DataConnect,
  options?: useDataConnectMutationOptions<
    UpsertUserData,
    FirebaseError,
    UpsertUserVariables
  >,
): UseDataConnectMutationResult<UpsertUserData, UpsertUserVariables>;

export function useGetUserRole(
  vars: GetUserRoleVariables,
  options?: useDataConnectQueryOptions<GetUserRoleData>,
): UseDataConnectQueryResult<GetUserRoleData, GetUserRoleVariables>;
export function useGetUserRole(
  dc: DataConnect,
  vars: GetUserRoleVariables,
  options?: useDataConnectQueryOptions<GetUserRoleData>,
): UseDataConnectQueryResult<GetUserRoleData, GetUserRoleVariables>;

export function useGetAllUsers(
  options?: useDataConnectQueryOptions<GetAllUsersData>,
): UseDataConnectQueryResult<GetAllUsersData, undefined>;
export function useGetAllUsers(
  dc: DataConnect,
  options?: useDataConnectQueryOptions<GetAllUsersData>,
): UseDataConnectQueryResult<GetAllUsersData, undefined>;

export function useUpdateUserRole(
  options?: useDataConnectMutationOptions<
    UpdateUserRoleData,
    FirebaseError,
    UpdateUserRoleVariables
  >,
): UseDataConnectMutationResult<UpdateUserRoleData, UpdateUserRoleVariables>;
export function useUpdateUserRole(
  dc: DataConnect,
  options?: useDataConnectMutationOptions<
    UpdateUserRoleData,
    FirebaseError,
    UpdateUserRoleVariables
  >,
): UseDataConnectMutationResult<UpdateUserRoleData, UpdateUserRoleVariables>;

export function useCreateShipment(
  options?: useDataConnectMutationOptions<
    CreateShipmentData,
    FirebaseError,
    CreateShipmentVariables
  >,
): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;
export function useCreateShipment(
  dc: DataConnect,
  options?: useDataConnectMutationOptions<
    CreateShipmentData,
    FirebaseError,
    CreateShipmentVariables
  >,
): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;

export function useListShipments(
  options?: useDataConnectQueryOptions<ListShipmentsData>,
): UseDataConnectQueryResult<ListShipmentsData, undefined>;
export function useListShipments(
  dc: DataConnect,
  options?: useDataConnectQueryOptions<ListShipmentsData>,
): UseDataConnectQueryResult<ListShipmentsData, undefined>;

export function useUpdateShipmentStatus(
  options?: useDataConnectMutationOptions<
    UpdateShipmentStatusData,
    FirebaseError,
    UpdateShipmentStatusVariables
  >,
): UseDataConnectMutationResult<
  UpdateShipmentStatusData,
  UpdateShipmentStatusVariables
>;
export function useUpdateShipmentStatus(
  dc: DataConnect,
  options?: useDataConnectMutationOptions<
    UpdateShipmentStatusData,
    FirebaseError,
    UpdateShipmentStatusVariables
  >,
): UseDataConnectMutationResult<
  UpdateShipmentStatusData,
  UpdateShipmentStatusVariables
>;

export function useDeleteShipment(
  options?: useDataConnectMutationOptions<
    DeleteShipmentData,
    FirebaseError,
    DeleteShipmentVariables
  >,
): UseDataConnectMutationResult<DeleteShipmentData, DeleteShipmentVariables>;
export function useDeleteShipment(
  dc: DataConnect,
  options?: useDataConnectMutationOptions<
    DeleteShipmentData,
    FirebaseError,
    DeleteShipmentVariables
  >,
): UseDataConnectMutationResult<DeleteShipmentData, DeleteShipmentVariables>;
