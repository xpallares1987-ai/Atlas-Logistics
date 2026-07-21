import { ListCustomersData, ListCustomersVariables, ListCrmDealsData, ListCrmDealsVariables, ListCrmInteractionsData, ListCrmInteractionsVariables, CreateCrmDealData, CreateCrmDealVariables, UpdateCrmDealStatusData, UpdateCrmDealStatusVariables, CreateCrmInteractionData, CreateCrmInteractionVariables, CreateDocumentFromOcrData, CreateDocumentFromOcrVariables, ApproveOcrDocumentData, ApproveOcrDocumentVariables, RejectOcrDocumentData, RejectOcrDocumentVariables, ListPendingOcrDocumentsData, ListIncotermsData, ListHsCodesData, ListVesselsData, ListSchedulesData, ListSchedulesVariables, ListDictionaryTermsData, UpsertDictionaryTermData, UpsertDictionaryTermVariables, ListCarriersData, ListCarriersVariables, ListHauliersData, ListHauliersVariables, ListAgentsData, ListAgentsVariables, ListCompaniesData, SearchLocationsData, SearchLocationsVariables, ListQuotesData, ListQuotesVariables, CreateCompanyData, CreateCompanyVariables, CreateLocationData, CreateLocationVariables, CreateQuoteData, CreateQuoteVariables, CreateMilestoneData, CreateMilestoneVariables, CreateHsCodeData, CreateHsCodeVariables, CreateIncotermData, CreateIncotermVariables, CreateVesselData, CreateVesselVariables, CreateScheduleData, CreateScheduleVariables, InsertDictionaryTermData, InsertDictionaryTermVariables, ListShipmentsData, ListShipmentsVariables, GetShipmentByIdData, GetShipmentByIdVariables, CreateShipmentData, CreateShipmentVariables, LogShipmentEventData, LogShipmentEventVariables, UpsertUserData, UpsertUserVariables, GetUserProfileData, GetUserProfileVariables, GetAllUsersData, UpdateUserRoleData, UpdateUserRoleVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListCustomers(vars: ListCustomersVariables, options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, ListCustomersVariables>;
export function useListCustomers(dc: DataConnect, vars: ListCustomersVariables, options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, ListCustomersVariables>;

export function useListCrmDeals(vars: ListCrmDealsVariables, options?: useDataConnectQueryOptions<ListCrmDealsData>): UseDataConnectQueryResult<ListCrmDealsData, ListCrmDealsVariables>;
export function useListCrmDeals(dc: DataConnect, vars: ListCrmDealsVariables, options?: useDataConnectQueryOptions<ListCrmDealsData>): UseDataConnectQueryResult<ListCrmDealsData, ListCrmDealsVariables>;

export function useListCrmInteractions(vars: ListCrmInteractionsVariables, options?: useDataConnectQueryOptions<ListCrmInteractionsData>): UseDataConnectQueryResult<ListCrmInteractionsData, ListCrmInteractionsVariables>;
export function useListCrmInteractions(dc: DataConnect, vars: ListCrmInteractionsVariables, options?: useDataConnectQueryOptions<ListCrmInteractionsData>): UseDataConnectQueryResult<ListCrmInteractionsData, ListCrmInteractionsVariables>;

export function useCreateCrmDeal(options?: useDataConnectMutationOptions<CreateCrmDealData, FirebaseError, CreateCrmDealVariables>): UseDataConnectMutationResult<CreateCrmDealData, CreateCrmDealVariables>;
export function useCreateCrmDeal(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCrmDealData, FirebaseError, CreateCrmDealVariables>): UseDataConnectMutationResult<CreateCrmDealData, CreateCrmDealVariables>;

export function useUpdateCrmDealStatus(options?: useDataConnectMutationOptions<UpdateCrmDealStatusData, FirebaseError, UpdateCrmDealStatusVariables>): UseDataConnectMutationResult<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
export function useUpdateCrmDealStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateCrmDealStatusData, FirebaseError, UpdateCrmDealStatusVariables>): UseDataConnectMutationResult<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;

export function useCreateCrmInteraction(options?: useDataConnectMutationOptions<CreateCrmInteractionData, FirebaseError, CreateCrmInteractionVariables>): UseDataConnectMutationResult<CreateCrmInteractionData, CreateCrmInteractionVariables>;
export function useCreateCrmInteraction(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCrmInteractionData, FirebaseError, CreateCrmInteractionVariables>): UseDataConnectMutationResult<CreateCrmInteractionData, CreateCrmInteractionVariables>;

export function useCreateDocumentFromOcr(options?: useDataConnectMutationOptions<CreateDocumentFromOcrData, FirebaseError, CreateDocumentFromOcrVariables>): UseDataConnectMutationResult<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
export function useCreateDocumentFromOcr(dc: DataConnect, options?: useDataConnectMutationOptions<CreateDocumentFromOcrData, FirebaseError, CreateDocumentFromOcrVariables>): UseDataConnectMutationResult<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;

export function useApproveOcrDocument(options?: useDataConnectMutationOptions<ApproveOcrDocumentData, FirebaseError, ApproveOcrDocumentVariables>): UseDataConnectMutationResult<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
export function useApproveOcrDocument(dc: DataConnect, options?: useDataConnectMutationOptions<ApproveOcrDocumentData, FirebaseError, ApproveOcrDocumentVariables>): UseDataConnectMutationResult<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;

export function useRejectOcrDocument(options?: useDataConnectMutationOptions<RejectOcrDocumentData, FirebaseError, RejectOcrDocumentVariables>): UseDataConnectMutationResult<RejectOcrDocumentData, RejectOcrDocumentVariables>;
export function useRejectOcrDocument(dc: DataConnect, options?: useDataConnectMutationOptions<RejectOcrDocumentData, FirebaseError, RejectOcrDocumentVariables>): UseDataConnectMutationResult<RejectOcrDocumentData, RejectOcrDocumentVariables>;

export function useListPendingOcrDocuments(options?: useDataConnectQueryOptions<ListPendingOcrDocumentsData>): UseDataConnectQueryResult<ListPendingOcrDocumentsData, undefined>;
export function useListPendingOcrDocuments(dc: DataConnect, options?: useDataConnectQueryOptions<ListPendingOcrDocumentsData>): UseDataConnectQueryResult<ListPendingOcrDocumentsData, undefined>;

export function useListIncoterms(options?: useDataConnectQueryOptions<ListIncotermsData>): UseDataConnectQueryResult<ListIncotermsData, undefined>;
export function useListIncoterms(dc: DataConnect, options?: useDataConnectQueryOptions<ListIncotermsData>): UseDataConnectQueryResult<ListIncotermsData, undefined>;

export function useListHsCodes(options?: useDataConnectQueryOptions<ListHsCodesData>): UseDataConnectQueryResult<ListHsCodesData, undefined>;
export function useListHsCodes(dc: DataConnect, options?: useDataConnectQueryOptions<ListHsCodesData>): UseDataConnectQueryResult<ListHsCodesData, undefined>;

export function useListVessels(options?: useDataConnectQueryOptions<ListVesselsData>): UseDataConnectQueryResult<ListVesselsData, undefined>;
export function useListVessels(dc: DataConnect, options?: useDataConnectQueryOptions<ListVesselsData>): UseDataConnectQueryResult<ListVesselsData, undefined>;

export function useListSchedules(vars: ListSchedulesVariables, options?: useDataConnectQueryOptions<ListSchedulesData>): UseDataConnectQueryResult<ListSchedulesData, ListSchedulesVariables>;
export function useListSchedules(dc: DataConnect, vars: ListSchedulesVariables, options?: useDataConnectQueryOptions<ListSchedulesData>): UseDataConnectQueryResult<ListSchedulesData, ListSchedulesVariables>;

export function useListDictionaryTerms(options?: useDataConnectQueryOptions<ListDictionaryTermsData>): UseDataConnectQueryResult<ListDictionaryTermsData, undefined>;
export function useListDictionaryTerms(dc: DataConnect, options?: useDataConnectQueryOptions<ListDictionaryTermsData>): UseDataConnectQueryResult<ListDictionaryTermsData, undefined>;

export function useUpsertDictionaryTerm(options?: useDataConnectMutationOptions<UpsertDictionaryTermData, FirebaseError, UpsertDictionaryTermVariables>): UseDataConnectMutationResult<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
export function useUpsertDictionaryTerm(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertDictionaryTermData, FirebaseError, UpsertDictionaryTermVariables>): UseDataConnectMutationResult<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;

export function useListCarriers(vars: ListCarriersVariables, options?: useDataConnectQueryOptions<ListCarriersData>): UseDataConnectQueryResult<ListCarriersData, ListCarriersVariables>;
export function useListCarriers(dc: DataConnect, vars: ListCarriersVariables, options?: useDataConnectQueryOptions<ListCarriersData>): UseDataConnectQueryResult<ListCarriersData, ListCarriersVariables>;

export function useListHauliers(vars: ListHauliersVariables, options?: useDataConnectQueryOptions<ListHauliersData>): UseDataConnectQueryResult<ListHauliersData, ListHauliersVariables>;
export function useListHauliers(dc: DataConnect, vars: ListHauliersVariables, options?: useDataConnectQueryOptions<ListHauliersData>): UseDataConnectQueryResult<ListHauliersData, ListHauliersVariables>;

export function useListAgents(vars: ListAgentsVariables, options?: useDataConnectQueryOptions<ListAgentsData>): UseDataConnectQueryResult<ListAgentsData, ListAgentsVariables>;
export function useListAgents(dc: DataConnect, vars: ListAgentsVariables, options?: useDataConnectQueryOptions<ListAgentsData>): UseDataConnectQueryResult<ListAgentsData, ListAgentsVariables>;

export function useListCompanies(options?: useDataConnectQueryOptions<ListCompaniesData>): UseDataConnectQueryResult<ListCompaniesData, undefined>;
export function useListCompanies(dc: DataConnect, options?: useDataConnectQueryOptions<ListCompaniesData>): UseDataConnectQueryResult<ListCompaniesData, undefined>;

export function useSearchLocations(vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;
export function useSearchLocations(dc: DataConnect, vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;

export function useListQuotes(vars: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;
export function useListQuotes(dc: DataConnect, vars: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;

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

export function useInsertDictionaryTerm(options?: useDataConnectMutationOptions<InsertDictionaryTermData, FirebaseError, InsertDictionaryTermVariables>): UseDataConnectMutationResult<InsertDictionaryTermData, InsertDictionaryTermVariables>;
export function useInsertDictionaryTerm(dc: DataConnect, options?: useDataConnectMutationOptions<InsertDictionaryTermData, FirebaseError, InsertDictionaryTermVariables>): UseDataConnectMutationResult<InsertDictionaryTermData, InsertDictionaryTermVariables>;

export function useListShipments(vars: ListShipmentsVariables, options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, ListShipmentsVariables>;
export function useListShipments(dc: DataConnect, vars: ListShipmentsVariables, options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, ListShipmentsVariables>;

export function useGetShipmentById(vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;
export function useGetShipmentById(dc: DataConnect, vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;

export function useCreateShipment(options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;
export function useCreateShipment(dc: DataConnect, options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;

export function useLogShipmentEvent(options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;
export function useLogShipmentEvent(dc: DataConnect, options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;

export function useUpsertUser(options?: useDataConnectMutationOptions<UpsertUserData, FirebaseError, UpsertUserVariables>): UseDataConnectMutationResult<UpsertUserData, UpsertUserVariables>;
export function useUpsertUser(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertUserData, FirebaseError, UpsertUserVariables>): UseDataConnectMutationResult<UpsertUserData, UpsertUserVariables>;

export function useGetUserProfile(vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
export function useGetUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;

export function useGetAllUsers(options?: useDataConnectQueryOptions<GetAllUsersData>): UseDataConnectQueryResult<GetAllUsersData, undefined>;
export function useGetAllUsers(dc: DataConnect, options?: useDataConnectQueryOptions<GetAllUsersData>): UseDataConnectQueryResult<GetAllUsersData, undefined>;

export function useUpdateUserRole(options?: useDataConnectMutationOptions<UpdateUserRoleData, FirebaseError, UpdateUserRoleVariables>): UseDataConnectMutationResult<UpdateUserRoleData, UpdateUserRoleVariables>;
export function useUpdateUserRole(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateUserRoleData, FirebaseError, UpdateUserRoleVariables>): UseDataConnectMutationResult<UpdateUserRoleData, UpdateUserRoleVariables>;
