# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `atlas`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListCompanies*](#listcompanies)
  - [*ListQuotes*](#listquotes)
  - [*ListShipments*](#listshipments)
  - [*GetShipmentById*](#getshipmentbyid)
- [**Mutations**](#mutations)
  - [*CreateShipment*](#createshipment)
  - [*LogShipmentEvent*](#logshipmentevent)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `atlas`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@atlas/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@atlas/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@atlas/dataconnect';

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

Below are examples of how to use the `atlas` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListCompanies
You can execute the `ListCompanies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
listCompanies(options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface ListCompaniesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompaniesData, undefined>;
}
export const listCompaniesRef: ListCompaniesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCompanies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface ListCompaniesRef {
  ...
  (dc: DataConnect): QueryRef<ListCompaniesData, undefined>;
}
export const listCompaniesRef: ListCompaniesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCompaniesRef:
```typescript
const name = listCompaniesRef.operationName;
console.log(name);
```

### Variables
The `ListCompanies` query has no variables.
### Return Type
Recall that executing the `ListCompanies` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCompaniesData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCompaniesData {
  companies: ({
    id: UUIDString;
    name: string;
    entityType: string;
    countryCode?: string | null;
  } & Company_Key)[];
}
```
### Using `ListCompanies`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCompanies } from '@atlas/dataconnect';


// Call the `listCompanies()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCompanies();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCompanies(dataConnect);

console.log(data.companies);

// Or, you can use the `Promise` API.
listCompanies().then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListCompanies`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCompaniesRef } from '@atlas/dataconnect';


// Call the `listCompaniesRef()` function to get a reference to the query.
const ref = listCompaniesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCompaniesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.companies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

## ListQuotes
You can execute the `ListQuotes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
listQuotes(options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, undefined>;

interface ListQuotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListQuotesData, undefined>;
}
export const listQuotesRef: ListQuotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listQuotes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, undefined>;

interface ListQuotesRef {
  ...
  (dc: DataConnect): QueryRef<ListQuotesData, undefined>;
}
export const listQuotesRef: ListQuotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listQuotesRef:
```typescript
const name = listQuotesRef.operationName;
console.log(name);
```

### Variables
The `ListQuotes` query has no variables.
### Return Type
Recall that executing the `ListQuotes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListQuotesData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListQuotes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listQuotes } from '@atlas/dataconnect';


// Call the `listQuotes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listQuotes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listQuotes(dataConnect);

console.log(data.quotes);

// Or, you can use the `Promise` API.
listQuotes().then((response) => {
  const data = response.data;
  console.log(data.quotes);
});
```

### Using `ListQuotes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listQuotesRef } from '@atlas/dataconnect';


// Call the `listQuotesRef()` function to get a reference to the query.
const ref = listQuotesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listQuotesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.quotes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.quotes);
});
```

## ListShipments
You can execute the `ListShipments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
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

The `data` property is an object of type `ListShipmentsData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListShipments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listShipments } from '@atlas/dataconnect';


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
import { connectorConfig, listShipmentsRef } from '@atlas/dataconnect';


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

## GetShipmentById
You can execute the `GetShipmentById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getShipmentById(vars: GetShipmentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetShipmentByIdData, GetShipmentByIdVariables>;

interface GetShipmentByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetShipmentByIdVariables): QueryRef<GetShipmentByIdData, GetShipmentByIdVariables>;
}
export const getShipmentByIdRef: GetShipmentByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getShipmentById(dc: DataConnect, vars: GetShipmentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetShipmentByIdData, GetShipmentByIdVariables>;

interface GetShipmentByIdRef {
  ...
  (dc: DataConnect, vars: GetShipmentByIdVariables): QueryRef<GetShipmentByIdData, GetShipmentByIdVariables>;
}
export const getShipmentByIdRef: GetShipmentByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getShipmentByIdRef:
```typescript
const name = getShipmentByIdRef.operationName;
console.log(name);
```

### Variables
The `GetShipmentById` query requires an argument of type `GetShipmentByIdVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetShipmentByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetShipmentById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetShipmentByIdData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetShipmentById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getShipmentById, GetShipmentByIdVariables } from '@atlas/dataconnect';

// The `GetShipmentById` query requires an argument of type `GetShipmentByIdVariables`:
const getShipmentByIdVars: GetShipmentByIdVariables = {
  id: ..., 
};

// Call the `getShipmentById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getShipmentById(getShipmentByIdVars);
// Variables can be defined inline as well.
const { data } = await getShipmentById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getShipmentById(dataConnect, getShipmentByIdVars);

console.log(data.shipment);

// Or, you can use the `Promise` API.
getShipmentById(getShipmentByIdVars).then((response) => {
  const data = response.data;
  console.log(data.shipment);
});
```

### Using `GetShipmentById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getShipmentByIdRef, GetShipmentByIdVariables } from '@atlas/dataconnect';

// The `GetShipmentById` query requires an argument of type `GetShipmentByIdVariables`:
const getShipmentByIdVars: GetShipmentByIdVariables = {
  id: ..., 
};

// Call the `getShipmentByIdRef()` function to get a reference to the query.
const ref = getShipmentByIdRef(getShipmentByIdVars);
// Variables can be defined inline as well.
const ref = getShipmentByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getShipmentByIdRef(dataConnect, getShipmentByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shipment);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shipment);
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

Below are examples of how to use the `atlas` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateShipment
You can execute the `CreateShipment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
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
The `CreateShipment` mutation requires an argument of type `CreateShipmentVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `CreateShipment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateShipmentData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateShipmentData {
  shipment_insert: Shipment_Key;
}
```
### Using `CreateShipment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createShipment, CreateShipmentVariables } from '@atlas/dataconnect';

// The `CreateShipment` mutation requires an argument of type `CreateShipmentVariables`:
const createShipmentVars: CreateShipmentVariables = {
  trackingNumber: ..., 
  status: ..., 
  movementType: ..., 
  direction: ..., 
  incoterm: ..., 
  origin: ..., 
  pol: ..., 
  pod: ..., 
  destination: ..., 
  shipperId: ..., 
  consigneeId: ..., 
};

// Call the `createShipment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createShipment(createShipmentVars);
// Variables can be defined inline as well.
const { data } = await createShipment({ trackingNumber: ..., status: ..., movementType: ..., direction: ..., incoterm: ..., origin: ..., pol: ..., pod: ..., destination: ..., shipperId: ..., consigneeId: ..., });

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
import { connectorConfig, createShipmentRef, CreateShipmentVariables } from '@atlas/dataconnect';

// The `CreateShipment` mutation requires an argument of type `CreateShipmentVariables`:
const createShipmentVars: CreateShipmentVariables = {
  trackingNumber: ..., 
  status: ..., 
  movementType: ..., 
  direction: ..., 
  incoterm: ..., 
  origin: ..., 
  pol: ..., 
  pod: ..., 
  destination: ..., 
  shipperId: ..., 
  consigneeId: ..., 
};

// Call the `createShipmentRef()` function to get a reference to the mutation.
const ref = createShipmentRef(createShipmentVars);
// Variables can be defined inline as well.
const ref = createShipmentRef({ trackingNumber: ..., status: ..., movementType: ..., direction: ..., incoterm: ..., origin: ..., pol: ..., pod: ..., destination: ..., shipperId: ..., consigneeId: ..., });

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

## LogShipmentEvent
You can execute the `LogShipmentEvent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
logShipmentEvent(vars: LogShipmentEventVariables): MutationPromise<LogShipmentEventData, LogShipmentEventVariables>;

interface LogShipmentEventRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogShipmentEventVariables): MutationRef<LogShipmentEventData, LogShipmentEventVariables>;
}
export const logShipmentEventRef: LogShipmentEventRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
logShipmentEvent(dc: DataConnect, vars: LogShipmentEventVariables): MutationPromise<LogShipmentEventData, LogShipmentEventVariables>;

interface LogShipmentEventRef {
  ...
  (dc: DataConnect, vars: LogShipmentEventVariables): MutationRef<LogShipmentEventData, LogShipmentEventVariables>;
}
export const logShipmentEventRef: LogShipmentEventRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the logShipmentEventRef:
```typescript
const name = logShipmentEventRef.operationName;
console.log(name);
```

### Variables
The `LogShipmentEvent` mutation requires an argument of type `LogShipmentEventVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface LogShipmentEventVariables {
  shipmentId: UUIDString;
  eventType: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  details?: string | null;
}
```
### Return Type
Recall that executing the `LogShipmentEvent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `LogShipmentEventData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LogShipmentEventData {
  shipmentEventLog_insert: ShipmentEventLog_Key;
}
```
### Using `LogShipmentEvent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, logShipmentEvent, LogShipmentEventVariables } from '@atlas/dataconnect';

// The `LogShipmentEvent` mutation requires an argument of type `LogShipmentEventVariables`:
const logShipmentEventVars: LogShipmentEventVariables = {
  shipmentId: ..., 
  eventType: ..., 
  oldStatus: ..., // optional
  newStatus: ..., // optional
  details: ..., // optional
};

// Call the `logShipmentEvent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await logShipmentEvent(logShipmentEventVars);
// Variables can be defined inline as well.
const { data } = await logShipmentEvent({ shipmentId: ..., eventType: ..., oldStatus: ..., newStatus: ..., details: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await logShipmentEvent(dataConnect, logShipmentEventVars);

console.log(data.shipmentEventLog_insert);

// Or, you can use the `Promise` API.
logShipmentEvent(logShipmentEventVars).then((response) => {
  const data = response.data;
  console.log(data.shipmentEventLog_insert);
});
```

### Using `LogShipmentEvent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, logShipmentEventRef, LogShipmentEventVariables } from '@atlas/dataconnect';

// The `LogShipmentEvent` mutation requires an argument of type `LogShipmentEventVariables`:
const logShipmentEventVars: LogShipmentEventVariables = {
  shipmentId: ..., 
  eventType: ..., 
  oldStatus: ..., // optional
  newStatus: ..., // optional
  details: ..., // optional
};

// Call the `logShipmentEventRef()` function to get a reference to the mutation.
const ref = logShipmentEventRef(logShipmentEventVars);
// Variables can be defined inline as well.
const ref = logShipmentEventRef({ shipmentId: ..., eventType: ..., oldStatus: ..., newStatus: ..., details: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = logShipmentEventRef(dataConnect, logShipmentEventVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.shipmentEventLog_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.shipmentEventLog_insert);
});
```

