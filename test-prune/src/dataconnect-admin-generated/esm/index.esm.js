import { validateAdminArgs } from "firebase-admin/data-connect";

export const connectorConfig = {
  connector: "atlas",
  serviceId: "gen-lang-client-0393063451-service",
  location: "europe-west1",
};

export function listCustomers(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListCustomers", inputVars, inputOpts);
}

export function listCrmDeals(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListCrmDeals", inputVars, inputOpts);
}

export function listCrmInteractions(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListCrmInteractions", inputVars, inputOpts);
}

export function createCrmDeal(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateCrmDeal", inputVars, inputOpts);
}

export function updateCrmDealStatus(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation(
    "UpdateCrmDealStatus",
    inputVars,
    inputOpts,
  );
}

export function createCrmInteraction(
  dcOrVarsOrOptions,
  varsOrOptions,
  options,
) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation(
    "CreateCrmInteraction",
    inputVars,
    inputOpts,
  );
}

export function createDocumentFromOcr(
  dcOrVarsOrOptions,
  varsOrOptions,
  options,
) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation(
    "CreateDocumentFromOcr",
    inputVars,
    inputOpts,
  );
}

export function approveOcrDocument(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("ApproveOcrDocument", inputVars, inputOpts);
}

export function rejectOcrDocument(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("RejectOcrDocument", inputVars, inputOpts);
}

export function listPendingOcrDocuments(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery(
    "ListPendingOcrDocuments",
    undefined,
    inputOpts,
  );
}

export function listIncoterms(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListIncoterms", undefined, inputOpts);
}

export function listHsCodes(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListHsCodes", undefined, inputOpts);
}

export function listVessels(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListVessels", undefined, inputOpts);
}

export function listSchedules(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListSchedules", inputVars, inputOpts);
}

export function listDictionaryTerms(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListDictionaryTerms", undefined, inputOpts);
}

export function upsertDictionaryTerm(
  dcOrVarsOrOptions,
  varsOrOptions,
  options,
) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation(
    "UpsertDictionaryTerm",
    inputVars,
    inputOpts,
  );
}

export function listCarriers(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListCarriers", inputVars, inputOpts);
}

export function listHauliers(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListHauliers", inputVars, inputOpts);
}

export function listAgents(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListAgents", inputVars, inputOpts);
}

export function listCompanies(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListCompanies", undefined, inputOpts);
}

export function searchLocations(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("SearchLocations", inputVars, inputOpts);
}

export function listQuotes(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListQuotes", inputVars, inputOpts);
}

export function createCompany(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateCompany", inputVars, inputOpts);
}

export function createLocation(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateLocation", inputVars, inputOpts);
}

export function createQuote(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateQuote", inputVars, inputOpts);
}

export function createMilestone(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateMilestone", inputVars, inputOpts);
}

export function createHsCode(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateHsCode", inputVars, inputOpts);
}

export function createIncoterm(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateIncoterm", inputVars, inputOpts);
}

export function createVessel(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateVessel", inputVars, inputOpts);
}

export function createSchedule(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateSchedule", inputVars, inputOpts);
}

export function insertDictionaryTerm(
  dcOrVarsOrOptions,
  varsOrOptions,
  options,
) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation(
    "InsertDictionaryTerm",
    inputVars,
    inputOpts,
  );
}

export function listShipments(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListShipments", inputVars, inputOpts);
}

export function getShipmentById(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("GetShipmentById", inputVars, inputOpts);
}

export function createShipment(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("CreateShipment", inputVars, inputOpts);
}

export function logShipmentEvent(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("LogShipmentEvent", inputVars, inputOpts);
}

export function upsertUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("UpsertUser", inputVars, inputOpts);
}

export function getUserProfile(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("GetUserProfile", inputVars, inputOpts);
}

export function getAllUsers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("GetAllUsers", undefined, inputOpts);
}

export function updateUserRole(dcOrVarsOrOptions, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateAdminArgs(
    connectorConfig,
    dcOrVarsOrOptions,
    varsOrOptions,
    options,
    true,
    true,
  );
  dcInstance.useGen(true);
  return dcInstance.executeMutation("UpdateUserRole", inputVars, inputOpts);
}
