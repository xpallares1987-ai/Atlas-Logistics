import { ListCompaniesData, SearchLocationsData, SearchLocationsVariables, ListQuotesData, ListQuotesVariables, CreateCompanyData, CreateCompanyVariables, CreateLocationData, CreateLocationVariables, CreateQuoteData, CreateQuoteVariables, CreateMilestoneData, CreateMilestoneVariables, CreateHsCodeData, CreateHsCodeVariables, CreateIncotermData, CreateIncotermVariables, CreateVesselData, CreateVesselVariables, CreateScheduleData, CreateScheduleVariables, ListShipmentsData, GetShipmentByIdData, GetShipmentByIdVariables, CreateShipmentData, CreateShipmentVariables, LogShipmentEventData, LogShipmentEventVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListCompanies(options?: useDataConnectQueryOptions<ListCompaniesData>): UseDataConnectQueryResult<ListCompaniesData, undefined>;
export function useListCompanies(dc: DataConnect, options?: useDataConnectQueryOptions<ListCompaniesData>): UseDataConnectQueryResult<ListCompaniesData, undefined>;

export function useSearchLocations(vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;
export function useSearchLocations(dc: DataConnect, vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;

export function useListQuotes(vars?: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;
export function useListQuotes(dc: DataConnect, vars?: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;

export function useCreateCompany(options?: useDataConnectMutationOptions<CreateCompanyData, FirebaseError, CreateCompanyVariables>): UseDataConnectMutationResult<CreateCompanyData, CreateCompanyVariables>;
export function useCreateCompany(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCompanyData, FirebaseError, CreateCompanyVariables>): UseDataConnectMutationResult<CreateCompanyData, CreateCompanyVariables>;

export function useCreateLocation(options?: useDataConnectMutationOptions<CreateLocationData, FirebaseError, CreateLocationVariables>): UseDataConnectMutationResult<CreateLocationData, CreateLocationVariables>;
export function useCreateLocation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateLocationData, FirebaseError, CreateLocationVariables>): UseDataConnectMutationResult<CreateLocationData, CreateLocationVariables>;

export function useCreateQuote(options?: useDataConnectMutationOptions<CreateQuoteData, FirebaseError, CreateQuoteVariables>): UseDataConnectMutationResult<CreateQuoteData, CreateQuoteVariables>;
export function useCreateQuote(dc: DataConnect, options?: useDataConnectMutationOptions<CreateQuoteData, FirebaseError, CreateQuoteVariables>): UseDataConnectMutationResult<CreateQuoteData, CreateQuoteVariables>;

export function useCreateMilestone(options?: useDataConnectMutationOptions<CreateMilestoneData, FirebaseError, CreateMilestoneVariables>): UseDataConnectMutationResult<CreateMilestoneData, CreateMilestoneVariables>;
export function useCreateMilestone(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMilestoneData, FirebaseError, CreateMilestoneVariables>): UseDataConnectMutationResult<CreateMilestoneData, CreateMilestoneVariables>;

export function useCreateHsCode(options?: useDataConnectMutationOptions<CreateHsCodeData, FirebaseError, CreateHsCodeVariables>): UseDataConnectMutationResult<CreateHsCodeData, CreateHsCodeVariables>;
export function useCreateHsCode(dc: DataConnect, options?: useDataConnectMutationOptions<CreateHsCodeData, FirebaseError, CreateHsCodeVariables>): UseDataConnectMutationResult<CreateHsCodeData, CreateHsCodeVariables>;

export function useCreateIncoterm(options?: useDataConnectMutationOptions<CreateIncotermData, FirebaseError, CreateIncotermVariables>): UseDataConnectMutationResult<CreateIncotermData, CreateIncotermVariables>;
export function useCreateIncoterm(dc: DataConnect, options?: useDataConnectMutationOptions<CreateIncotermData, FirebaseError, CreateIncotermVariables>): UseDataConnectMutationResult<CreateIncotermData, CreateIncotermVariables>;

export function useCreateVessel(options?: useDataConnectMutationOptions<CreateVesselData, FirebaseError, CreateVesselVariables>): UseDataConnectMutationResult<CreateVesselData, CreateVesselVariables>;
export function useCreateVessel(dc: DataConnect, options?: useDataConnectMutationOptions<CreateVesselData, FirebaseError, CreateVesselVariables>): UseDataConnectMutationResult<CreateVesselData, CreateVesselVariables>;

export function useCreateSchedule(options?: useDataConnectMutationOptions<CreateScheduleData, FirebaseError, CreateScheduleVariables>): UseDataConnectMutationResult<CreateScheduleData, CreateScheduleVariables>;
export function useCreateSchedule(dc: DataConnect, options?: useDataConnectMutationOptions<CreateScheduleData, FirebaseError, CreateScheduleVariables>): UseDataConnectMutationResult<CreateScheduleData, CreateScheduleVariables>;

export function useListShipments(options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, undefined>;
export function useListShipments(dc: DataConnect, options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, undefined>;

export function useGetShipmentById(vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;
export function useGetShipmentById(dc: DataConnect, vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;

export function useCreateShipment(options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;
export function useCreateShipment(dc: DataConnect, options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;

export function useLogShipmentEvent(options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;
export function useLogShipmentEvent(dc: DataConnect, options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;
