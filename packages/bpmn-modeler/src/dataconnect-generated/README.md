# Generated TypeScript README

This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

_**NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated._

# Table of Contents

- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [_Connecting to the local Emulator_](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [_GetUserRole_](#getuserrole)
  - [_GetAllUsers_](#getallusers)
  - [_ListShipments_](#listshipments)
- [**Mutations**](#mutations)
  - [_UpsertUser_](#upsertuser)
  - [_UpdateUserRole_](#updateuserrole)
  - [_CreateShipment_](#createshipment)
  - [_UpdateShipmentStatus_](#updateshipmentstatus)
  - [_DeleteShipment_](#deleteshipment)

# Accessing the connector

A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator

By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:

- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:

- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetUserRole

You can execute the `GetUserRole` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
getUserRole(vars: GetUserRoleVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserRoleData, GetUserRoleVariables>;

interface GetUserRoleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserRoleVariables): QueryRef<GetUserRoleData, GetUserRoleVariables>;
}
export const getUserRoleRef: GetUserRoleRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.

```typescript
getUserRole(dc: DataConnect, vars: GetUserRoleVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserRoleData, GetUserRoleVariables>;

interface GetUserRoleRef {
  ...
  (dc: DataConnect, vars: GetUserRoleVariables): QueryRef<GetUserRoleData, GetUserRoleVariables>;
}
export const getUserRoleRef: GetUserRoleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserRoleRef:

```typescript
const name = getUserRoleRef.operationName;
console.log(name);
```

### Variables

The `GetUserRole` query requires an argument of type `GetUserRoleVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserRoleVariables {
  uid: string;
}
```

### Return Type

Recall that executing the `GetUserRole` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserRoleData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserRoleData {
  users: {
    role: string;
    email: string;
  }[];
}
```

### Using `GetUserRole`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserRole, GetUserRoleVariables } from '@dataconnect/generated';

// The `GetUserRole` query requires an argument of type `GetUserRoleVariables`:
const getUserRoleVars: GetUserRoleVariables = {
  uid: ...,
};

// Call the `getUserRole()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserRole(getUserRoleVars);
// Variables can be defined inline as well.
const { data } = await getUserRole({ uid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserRole(dataConnect, getUserRoleVars);

console.log(data.users);

// Or, you can use the `Promise` API.
getUserRole(getUserRoleVars).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `GetUserRole`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserRoleRef, GetUserRoleVariables } from '@dataconnect/generated';

// The `GetUserRole` query requires an argument of type `GetUserRoleVariables`:
const getUserRoleVars: GetUserRoleVariables = {
  uid: ...,
};

// Call the `getUserRoleRef()` function to get a reference to the query.
const ref = getUserRoleRef(getUserRoleVars);
// Variables can be defined inline as well.
const ref = getUserRoleRef({ uid: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserRoleRef(dataConnect, getUserRoleVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## GetAllUsers

You can execute the `GetAllUsers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
getAllUsers(options?: ExecuteQueryOptions): QueryPromise<GetAllUsersData, undefined>;

interface GetAllUsersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllUsersData, undefined>;
}
export const getAllUsersRef: GetAllUsersRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.

```typescript
getAllUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetAllUsersData, undefined>;

interface GetAllUsersRef {
  ...
  (dc: DataConnect): QueryRef<GetAllUsersData, undefined>;
}
export const getAllUsersRef: GetAllUsersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAllUsersRef:

```typescript
const name = getAllUsersRef.operationName;
console.log(name);
```

### Variables

The `GetAllUsers` query has no variables.

### Return Type

Recall that executing the `GetAllUsers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAllUsersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAllUsersData {
  users: ({
    uid: string;
    email: string;
    role: string;
  } & User_Key)[];
}
```

### Using `GetAllUsers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAllUsers } from '@dataconnect/generated';

// Call the `getAllUsers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAllUsers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAllUsers(dataConnect);

console.log(data.users);

// Or, you can use the `Promise` API.
getAllUsers().then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `GetAllUsers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAllUsersRef } from '@dataconnect/generated';

// Call the `getAllUsersRef()` function to get a reference to the query.
const ref = getAllUsersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAllUsersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## ListShipments

You can execute the `ListShipments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
listShipments(options?: ExecuteQueryOptions): QueryPromise<ListShipmentsData, undefined>;

interface ListShipmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListShipmentsData, undefined>;
}
export const listShipmentsRef: ListShipmentsRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.

```typescript
listShipments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListShipmentsData, undefined>;

interface ListShipmentsRef {
  ...
  (dc: DataConnect): QueryRef<ListShipmentsData, undefined>;
}
export const listShipmentsRef: ListShipmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listShipmentsRef:

```typescript
const name = listShipmentsRef.operationName;
console.log(name);
```

### Variables

The `ListShipments` query has no variables.

### Return Type

Recall that executing the `ListShipments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListShipmentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```

### Using `ListShipments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listShipments } from '@dataconnect/generated';

// Call the `listShipments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listShipments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listShipments(dataConnect);

console.log(data.shipments);

// Or, you can use the `Promise` API.
listShipments().then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

### Using `ListShipments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listShipmentsRef } from '@dataconnect/generated';

// Call the `listShipmentsRef()` function to get a reference to the query.
const ref = listShipmentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listShipmentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shipments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:

- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:

- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UpsertUser

You can execute the `UpsertUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
upsertUser(vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface UpsertUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
}
export const upsertUserRef: UpsertUserRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.

```typescript
upsertUser(dc: DataConnect, vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface UpsertUserRef {
  ...
  (dc: DataConnect, vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
}
export const upsertUserRef: UpsertUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertUserRef:

```typescript
const name = upsertUserRef.operationName;
console.log(name);
```

### Variables

The `UpsertUser` mutation requires an argument of type `UpsertUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertUserVariables {
  uid: string;
  email: string;
  role: string;
}
```

### Return Type

Recall that executing the `UpsertUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertUserData {
  user_upsert: User_Key;
}
```

### Using `UpsertUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertUser, UpsertUserVariables } from '@dataconnect/generated';

// The `UpsertUser` mutation requires an argument of type `UpsertUserVariables`:
const upsertUserVars: UpsertUserVariables = {
  uid: ...,
  email: ...,
  role: ...,
};

// Call the `upsertUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertUser(upsertUserVars);
// Variables can be defined inline as well.
const { data } = await upsertUser({ uid: ..., email: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertUser(dataConnect, upsertUserVars);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
upsertUser(upsertUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

### Using `UpsertUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertUserRef, UpsertUserVariables } from '@dataconnect/generated';

// The `UpsertUser` mutation requires an argument of type `UpsertUserVariables`:
const upsertUserVars: UpsertUserVariables = {
  uid: ...,
  email: ...,
  role: ...,
};

// Call the `upsertUserRef()` function to get a reference to the mutation.
const ref = upsertUserRef(upsertUserVars);
// Variables can be defined inline as well.
const ref = upsertUserRef({ uid: ..., email: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertUserRef(dataConnect, upsertUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

## UpdateUserRole

You can execute the `UpdateUserRole` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
updateUserRole(vars: UpdateUserRoleVariables): MutationPromise<UpdateUserRoleData, UpdateUserRoleVariables>;

interface UpdateUserRoleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateUserRoleVariables): MutationRef<UpdateUserRoleData, UpdateUserRoleVariables>;
}
export const updateUserRoleRef: UpdateUserRoleRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.

```typescript
updateUserRole(dc: DataConnect, vars: UpdateUserRoleVariables): MutationPromise<UpdateUserRoleData, UpdateUserRoleVariables>;

interface UpdateUserRoleRef {
  ...
  (dc: DataConnect, vars: UpdateUserRoleVariables): MutationRef<UpdateUserRoleData, UpdateUserRoleVariables>;
}
export const updateUserRoleRef: UpdateUserRoleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateUserRoleRef:

```typescript
const name = updateUserRoleRef.operationName;
console.log(name);
```

### Variables

The `UpdateUserRole` mutation requires an argument of type `UpdateUserRoleVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateUserRoleVariables {
  uid: string;
  role: string;
}
```

### Return Type

Recall that executing the `UpdateUserRole` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateUserRoleData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateUserRoleData {
  user_update?: User_Key | null;
}
```

### Using `UpdateUserRole`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateUserRole, UpdateUserRoleVariables } from '@dataconnect/generated';

// The `UpdateUserRole` mutation requires an argument of type `UpdateUserRoleVariables`:
const updateUserRoleVars: UpdateUserRoleVariables = {
  uid: ...,
  role: ...,
};

// Call the `updateUserRole()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateUserRole(updateUserRoleVars);
// Variables can be defined inline as well.
const { data } = await updateUserRole({ uid: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateUserRole(dataConnect, updateUserRoleVars);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateUserRole(updateUserRoleVars).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateUserRole`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateUserRoleRef, UpdateUserRoleVariables } from '@dataconnect/generated';

// The `UpdateUserRole` mutation requires an argument of type `UpdateUserRoleVariables`:
const updateUserRoleVars: UpdateUserRoleVariables = {
  uid: ...,
  role: ...,
};

// Call the `updateUserRoleRef()` function to get a reference to the mutation.
const ref = updateUserRoleRef(updateUserRoleVars);
// Variables can be defined inline as well.
const ref = updateUserRoleRef({ uid: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateUserRoleRef(dataConnect, updateUserRoleVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

## CreateShipment

You can execute the `CreateShipment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
createShipment(vars: CreateShipmentVariables): MutationPromise<CreateShipmentData, CreateShipmentVariables>;

interface CreateShipmentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateShipmentVariables): MutationRef<CreateShipmentData, CreateShipmentVariables>;
}
export const createShipmentRef: CreateShipmentRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.

```typescript
createShipment(dc: DataConnect, vars: CreateShipmentVariables): MutationPromise<CreateShipmentData, CreateShipmentVariables>;

interface CreateShipmentRef {
  ...
  (dc: DataConnect, vars: CreateShipmentVariables): MutationRef<CreateShipmentData, CreateShipmentVariables>;
}
export const createShipmentRef: CreateShipmentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createShipmentRef:

```typescript
const name = createShipmentRef.operationName;
console.log(name);
```

### Variables

The `CreateShipment` mutation requires an argument of type `CreateShipmentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```

### Return Type

Recall that executing the `CreateShipment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateShipmentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateShipmentData {
  shipment_insert: Shipment_Key;
}
```

### Using `CreateShipment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createShipment, CreateShipmentVariables } from '@dataconnect/generated';

// The `CreateShipment` mutation requires an argument of type `CreateShipmentVariables`:
const createShipmentVars: CreateShipmentVariables = {
  trackingNumber: ...,
  shipperId: ...,
  consigneeId: ...,
  origin: ...,
  destination: ...,
  movementType: ...,
  direction: ...,
  incoterm: ...,
  pol: ...,
  pod: ...,
};

// Call the `createShipment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createShipment(createShipmentVars);
// Variables can be defined inline as well.
const { data } = await createShipment({ trackingNumber: ..., shipperId: ..., consigneeId: ..., origin: ..., destination: ..., movementType: ..., direction: ..., incoterm: ..., pol: ..., pod: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createShipment(dataConnect, createShipmentVars);

console.log(data.shipment_insert);

// Or, you can use the `Promise` API.
createShipment(createShipmentVars).then((response) => {
  const data = response.data;
  console.log(data.shipment_insert);
});
```

### Using `CreateShipment`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createShipmentRef, CreateShipmentVariables } from '@dataconnect/generated';

// The `CreateShipment` mutation requires an argument of type `CreateShipmentVariables`:
const createShipmentVars: CreateShipmentVariables = {
  trackingNumber: ...,
  shipperId: ...,
  consigneeId: ...,
  origin: ...,
  destination: ...,
  movementType: ...,
  direction: ...,
  incoterm: ...,
  pol: ...,
  pod: ...,
};

// Call the `createShipmentRef()` function to get a reference to the mutation.
const ref = createShipmentRef(createShipmentVars);
// Variables can be defined inline as well.
const ref = createShipmentRef({ trackingNumber: ..., shipperId: ..., consigneeId: ..., origin: ..., destination: ..., movementType: ..., direction: ..., incoterm: ..., pol: ..., pod: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createShipmentRef(dataConnect, createShipmentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.shipment_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.shipment_insert);
});
```

## UpdateShipmentStatus

You can execute the `UpdateShipmentStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
updateShipmentStatus(vars: UpdateShipmentStatusVariables): MutationPromise<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;

interface UpdateShipmentStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateShipmentStatusVariables): MutationRef<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;
}
export const updateShipmentStatusRef: UpdateShipmentStatusRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.

```typescript
updateShipmentStatus(dc: DataConnect, vars: UpdateShipmentStatusVariables): MutationPromise<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;

interface UpdateShipmentStatusRef {
  ...
  (dc: DataConnect, vars: UpdateShipmentStatusVariables): MutationRef<UpdateShipmentStatusData, UpdateShipmentStatusVariables>;
}
export const updateShipmentStatusRef: UpdateShipmentStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateShipmentStatusRef:

```typescript
const name = updateShipmentStatusRef.operationName;
console.log(name);
```

### Variables

The `UpdateShipmentStatus` mutation requires an argument of type `UpdateShipmentStatusVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateShipmentStatusVariables {
  id: UUIDString;
  status: string;
}
```

### Return Type

Recall that executing the `UpdateShipmentStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateShipmentStatusData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateShipmentStatusData {
  shipment_update?: Shipment_Key | null;
}
```

### Using `UpdateShipmentStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateShipmentStatus, UpdateShipmentStatusVariables } from '@dataconnect/generated';

// The `UpdateShipmentStatus` mutation requires an argument of type `UpdateShipmentStatusVariables`:
const updateShipmentStatusVars: UpdateShipmentStatusVariables = {
  id: ...,
  status: ...,
};

// Call the `updateShipmentStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateShipmentStatus(updateShipmentStatusVars);
// Variables can be defined inline as well.
const { data } = await updateShipmentStatus({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateShipmentStatus(dataConnect, updateShipmentStatusVars);

console.log(data.shipment_update);

// Or, you can use the `Promise` API.
updateShipmentStatus(updateShipmentStatusVars).then((response) => {
  const data = response.data;
  console.log(data.shipment_update);
});
```

### Using `UpdateShipmentStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateShipmentStatusRef, UpdateShipmentStatusVariables } from '@dataconnect/generated';

// The `UpdateShipmentStatus` mutation requires an argument of type `UpdateShipmentStatusVariables`:
const updateShipmentStatusVars: UpdateShipmentStatusVariables = {
  id: ...,
  status: ...,
};

// Call the `updateShipmentStatusRef()` function to get a reference to the mutation.
const ref = updateShipmentStatusRef(updateShipmentStatusVars);
// Variables can be defined inline as well.
const ref = updateShipmentStatusRef({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateShipmentStatusRef(dataConnect, updateShipmentStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.shipment_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.shipment_update);
});
```

## DeleteShipment

You can execute the `DeleteShipment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):

```typescript
deleteShipment(vars: DeleteShipmentVariables): MutationPromise<DeleteShipmentData, DeleteShipmentVariables>;

interface DeleteShipmentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteShipmentVariables): MutationRef<DeleteShipmentData, DeleteShipmentVariables>;
}
export const deleteShipmentRef: DeleteShipmentRef;
```

You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.

```typescript
deleteShipment(dc: DataConnect, vars: DeleteShipmentVariables): MutationPromise<DeleteShipmentData, DeleteShipmentVariables>;

interface DeleteShipmentRef {
  ...
  (dc: DataConnect, vars: DeleteShipmentVariables): MutationRef<DeleteShipmentData, DeleteShipmentVariables>;
}
export const deleteShipmentRef: DeleteShipmentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteShipmentRef:

```typescript
const name = deleteShipmentRef.operationName;
console.log(name);
```

### Variables

The `DeleteShipment` mutation requires an argument of type `DeleteShipmentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteShipmentVariables {
  id: UUIDString;
}
```

### Return Type

Recall that executing the `DeleteShipment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteShipmentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteShipmentData {
  shipment_delete?: Shipment_Key | null;
}
```

### Using `DeleteShipment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteShipment, DeleteShipmentVariables } from '@dataconnect/generated';

// The `DeleteShipment` mutation requires an argument of type `DeleteShipmentVariables`:
const deleteShipmentVars: DeleteShipmentVariables = {
  id: ...,
};

// Call the `deleteShipment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteShipment(deleteShipmentVars);
// Variables can be defined inline as well.
const { data } = await deleteShipment({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteShipment(dataConnect, deleteShipmentVars);

console.log(data.shipment_delete);

// Or, you can use the `Promise` API.
deleteShipment(deleteShipmentVars).then((response) => {
  const data = response.data;
  console.log(data.shipment_delete);
});
```

### Using `DeleteShipment`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteShipmentRef, DeleteShipmentVariables } from '@dataconnect/generated';

// The `DeleteShipment` mutation requires an argument of type `DeleteShipmentVariables`:
const deleteShipmentVars: DeleteShipmentVariables = {
  id: ...,
};

// Call the `deleteShipmentRef()` function to get a reference to the mutation.
const ref = deleteShipmentRef(deleteShipmentVars);
// Variables can be defined inline as well.
const ref = deleteShipmentRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteShipmentRef(dataConnect, deleteShipmentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.shipment_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.shipment_delete);
});
```
