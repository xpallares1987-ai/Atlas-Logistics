const {
  queryRef,
  executeQuery,
  validateArgsWithOptions,
  mutationRef,
  executeMutation,
  validateArgs,
  makeMemoryCacheProvider,
} = require("firebase/data-connect");

const connectorConfig = {
  connector: "default",
  service: "gen-lang-client-0393063451-service",
  location: "europe-west1",
};
exports.connectorConfig = connectorConfig;
const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider(),
  },
};
exports.dataConnectSettings = dataConnectSettings;

const upsertUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, "UpsertUser", inputVars);
};
upsertUserRef.operationName = "UpsertUser";
exports.upsertUserRef = upsertUserRef;

exports.upsertUser = function upsertUser(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  return executeMutation(upsertUserRef(dcInstance, inputVars));
};

const getUserRoleRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, "GetUserRole", inputVars);
};
getUserRoleRef.operationName = "GetUserRole";
exports.getUserRoleRef = getUserRoleRef;

exports.getUserRole = function getUserRole(dcOrVars, varsOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateArgsWithOptions(
    connectorConfig,
    dcOrVars,
    varsOrOptions,
    options,
    true,
    true,
  );
  return executeQuery(
    getUserRoleRef(dcInstance, inputVars),
    inputOpts && { fetchPolicy: inputOpts.fetchPolicy },
  );
};

const getAllUsersRef = (dc) => {
  const { dc: dcInstance } = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, "GetAllUsers");
};
getAllUsersRef.operationName = "GetAllUsers";
exports.getAllUsersRef = getAllUsersRef;

exports.getAllUsers = function getAllUsers(dcOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateArgsWithOptions(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
    false,
    false,
  );
  return executeQuery(
    getAllUsersRef(dcInstance, inputVars),
    inputOpts && { fetchPolicy: inputOpts.fetchPolicy },
  );
};

const updateUserRoleRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, "UpdateUserRole", inputVars);
};
updateUserRoleRef.operationName = "UpdateUserRole";
exports.updateUserRoleRef = updateUserRoleRef;

exports.updateUserRole = function updateUserRole(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  return executeMutation(updateUserRoleRef(dcInstance, inputVars));
};

const createShipmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, "CreateShipment", inputVars);
};
createShipmentRef.operationName = "CreateShipment";
exports.createShipmentRef = createShipmentRef;

exports.createShipment = function createShipment(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  return executeMutation(createShipmentRef(dcInstance, inputVars));
};

const listShipmentsRef = (dc) => {
  const { dc: dcInstance } = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, "ListShipments");
};
listShipmentsRef.operationName = "ListShipments";
exports.listShipmentsRef = listShipmentsRef;

exports.listShipments = function listShipments(dcOrOptions, options) {
  const {
    dc: dcInstance,
    vars: inputVars,
    options: inputOpts,
  } = validateArgsWithOptions(
    connectorConfig,
    dcOrOptions,
    options,
    undefined,
    false,
    false,
  );
  return executeQuery(
    listShipmentsRef(dcInstance, inputVars),
    inputOpts && { fetchPolicy: inputOpts.fetchPolicy },
  );
};

const updateShipmentStatusRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, "UpdateShipmentStatus", inputVars);
};
updateShipmentStatusRef.operationName = "UpdateShipmentStatus";
exports.updateShipmentStatusRef = updateShipmentStatusRef;

exports.updateShipmentStatus = function updateShipmentStatus(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  return executeMutation(updateShipmentStatusRef(dcInstance, inputVars));
};

const deleteShipmentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, "DeleteShipment", inputVars);
};
deleteShipmentRef.operationName = "DeleteShipment";
exports.deleteShipmentRef = deleteShipmentRef;

exports.deleteShipment = function deleteShipment(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(
    connectorConfig,
    dcOrVars,
    vars,
    true,
  );
  return executeMutation(deleteShipmentRef(dcInstance, inputVars));
};
