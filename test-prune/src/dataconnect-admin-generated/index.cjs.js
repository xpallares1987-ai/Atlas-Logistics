const { validateAdminArgs } = require("firebase-admin/data-connect");

const connectorConfig = {
  connector: "atlas",
  serviceId: "gen-lang-client-0393063451-service",
  location: "europe-west1",
};
exports.connectorConfig = connectorConfig;

function listCustomers(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listCustomers = listCustomers;

function listCrmDeals(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listCrmDeals = listCrmDeals;

function listCrmInteractions(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listCrmInteractions = listCrmInteractions;

function createCrmDeal(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createCrmDeal = createCrmDeal;

function updateCrmDealStatus(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.updateCrmDealStatus = updateCrmDealStatus;

function createCrmInteraction(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createCrmInteraction = createCrmInteraction;

function createDocumentFromOcr(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createDocumentFromOcr = createDocumentFromOcr;

function approveOcrDocument(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.approveOcrDocument = approveOcrDocument;

function rejectOcrDocument(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.rejectOcrDocument = rejectOcrDocument;

function listPendingOcrDocuments(dcOrOptions, options) {
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
exports.listPendingOcrDocuments = listPendingOcrDocuments;

function listIncoterms(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListIncoterms", undefined, inputOpts);
}
exports.listIncoterms = listIncoterms;

function listHsCodes(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListHsCodes", undefined, inputOpts);
}
exports.listHsCodes = listHsCodes;

function listVessels(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListVessels", undefined, inputOpts);
}
exports.listVessels = listVessels;

function listSchedules(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listSchedules = listSchedules;

function listDictionaryTerms(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListDictionaryTerms", undefined, inputOpts);
}
exports.listDictionaryTerms = listDictionaryTerms;

function upsertDictionaryTerm(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.upsertDictionaryTerm = upsertDictionaryTerm;

function listCarriers(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listCarriers = listCarriers;

function listHauliers(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listHauliers = listHauliers;

function listAgents(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listAgents = listAgents;

function listCompanies(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("ListCompanies", undefined, inputOpts);
}
exports.listCompanies = listCompanies;

function searchLocations(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.searchLocations = searchLocations;

function listQuotes(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listQuotes = listQuotes;

function createCompany(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createCompany = createCompany;

function createLocation(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createLocation = createLocation;

function createQuote(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createQuote = createQuote;

function createMilestone(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createMilestone = createMilestone;

function createHsCode(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createHsCode = createHsCode;

function createIncoterm(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createIncoterm = createIncoterm;

function createVessel(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createVessel = createVessel;

function createSchedule(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createSchedule = createSchedule;

function insertDictionaryTerm(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.insertDictionaryTerm = insertDictionaryTerm;

function listShipments(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.listShipments = listShipments;

function getShipmentById(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.getShipmentById = getShipmentById;

function createShipment(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.createShipment = createShipment;

function logShipmentEvent(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.logShipmentEvent = logShipmentEvent;

function upsertUser(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.upsertUser = upsertUser;

function getUserProfile(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.getUserProfile = getUserProfile;

function getAllUsers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateAdminArgs(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
  );
  dcInstance.useGen(true);
  return dcInstance.executeQuery("GetAllUsers", undefined, inputOpts);
}
exports.getAllUsers = getAllUsers;

function updateUserRole(dcOrVarsOrOptions, varsOrOptions, options) {
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
exports.updateUserRole = updateUserRole;
