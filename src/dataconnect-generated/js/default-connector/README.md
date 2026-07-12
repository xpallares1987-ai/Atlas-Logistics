# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `atlas`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`default-connector/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListCompanies*](#listcompanies)
  - [*SearchLocations*](#searchlocations)
  - [*ListQuotes*](#listquotes)
  - [*ListShipments*](#listshipments)
  - [*GetShipmentById*](#getshipmentbyid)
- [**Mutations**](#mutations)
  - [*CreateCompany*](#createcompany)
  - [*CreateLocation*](#createlocation)
  - [*CreateQuote*](#createquote)
  - [*CreateMilestone*](#createmilestone)
  - [*CreateHsCode*](#createhscode)
  - [*CreateIncoterm*](#createincoterm)
  - [*CreateVessel*](#createvessel)
  - [*CreateSchedule*](#createschedule)
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

## SearchLocations
You can execute the `SearchLocations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
searchLocations(vars: SearchLocationsVariables, options?: ExecuteQueryOptions): QueryPromise<SearchLocationsData, SearchLocationsVariables>;

interface SearchLocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SearchLocationsVariables): QueryRef<SearchLocationsData, SearchLocationsVariables>;
}
export const searchLocationsRef: SearchLocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
searchLocations(dc: DataConnect, vars: SearchLocationsVariables, options?: ExecuteQueryOptions): QueryPromise<SearchLocationsData, SearchLocationsVariables>;

interface SearchLocationsRef {
  ...
  (dc: DataConnect, vars: SearchLocationsVariables): QueryRef<SearchLocationsData, SearchLocationsVariables>;
}
export const searchLocationsRef: SearchLocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the searchLocationsRef:
```typescript
const name = searchLocationsRef.operationName;
console.log(name);
```

### Variables
The `SearchLocations` query requires an argument of type `SearchLocationsVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SearchLocationsVariables {
  query: string;
}
```
### Return Type
Recall that executing the `SearchLocations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SearchLocationsData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SearchLocationsData {
  locations: ({
    locode: string;
    name: string;
    countryCode: string;
    countryName: string;
    type: string;
  } & Location_Key)[];
}
```
### Using `SearchLocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, searchLocations, SearchLocationsVariables } from '@atlas/dataconnect';

// The `SearchLocations` query requires an argument of type `SearchLocationsVariables`:
const searchLocationsVars: SearchLocationsVariables = {
  query: ..., 
};

// Call the `searchLocations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await searchLocations(searchLocationsVars);
// Variables can be defined inline as well.
const { data } = await searchLocations({ query: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await searchLocations(dataConnect, searchLocationsVars);

console.log(data.locations);

// Or, you can use the `Promise` API.
searchLocations(searchLocationsVars).then((response) => {
  const data = response.data;
  console.log(data.locations);
});
```

### Using `SearchLocations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, searchLocationsRef, SearchLocationsVariables } from '@atlas/dataconnect';

// The `SearchLocations` query requires an argument of type `SearchLocationsVariables`:
const searchLocationsVars: SearchLocationsVariables = {
  query: ..., 
};

// Call the `searchLocationsRef()` function to get a reference to the query.
const ref = searchLocationsRef(searchLocationsVars);
// Variables can be defined inline as well.
const ref = searchLocationsRef({ query: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = searchLocationsRef(dataConnect, searchLocationsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.locations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.locations);
});
```

## ListQuotes
You can execute the `ListQuotes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
listQuotes(vars?: ListQuotesVariables, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, ListQuotesVariables>;

interface ListQuotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListQuotesVariables): QueryRef<ListQuotesData, ListQuotesVariables>;
}
export const listQuotesRef: ListQuotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listQuotes(dc: DataConnect, vars?: ListQuotesVariables, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, ListQuotesVariables>;

interface ListQuotesRef {
  ...
  (dc: DataConnect, vars?: ListQuotesVariables): QueryRef<ListQuotesData, ListQuotesVariables>;
}
export const listQuotesRef: ListQuotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listQuotesRef:
```typescript
const name = listQuotesRef.operationName;
console.log(name);
```

### Variables
The `ListQuotes` query has an optional argument of type `ListQuotesVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListQuotesVariables {
  origin?: string | null;
  destination?: string | null;
}
```
### Return Type
Recall that executing the `ListQuotes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListQuotesData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListQuotesData {
  quotes: ({
    id: UUIDString;
    quoteNumber: string;
    status: string;
    movementType: string;
    origin: string;
    destination: string;
    baseFreightCost: number;
    totalCost: number;
    currency: string;
    validityDate: DateString;
    carrier?: {
      name: string;
    };
  } & Quote_Key)[];
}
```
### Using `ListQuotes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listQuotes, ListQuotesVariables } from '@atlas/dataconnect';

// The `ListQuotes` query has an optional argument of type `ListQuotesVariables`:
const listQuotesVars: ListQuotesVariables = {
  origin: ..., // optional
  destination: ..., // optional
};

// Call the `listQuotes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listQuotes(listQuotesVars);
// Variables can be defined inline as well.
const { data } = await listQuotes({ origin: ..., destination: ..., });
// Since all variables are optional for this query, you can omit the `ListQuotesVariables` argument.
const { data } = await listQuotes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listQuotes(dataConnect, listQuotesVars);

console.log(data.quotes);

// Or, you can use the `Promise` API.
listQuotes(listQuotesVars).then((response) => {
  const data = response.data;
  console.log(data.quotes);
});
```

### Using `ListQuotes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listQuotesRef, ListQuotesVariables } from '@atlas/dataconnect';

// The `ListQuotes` query has an optional argument of type `ListQuotesVariables`:
const listQuotesVars: ListQuotesVariables = {
  origin: ..., // optional
  destination: ..., // optional
};

// Call the `listQuotesRef()` function to get a reference to the query.
const ref = listQuotesRef(listQuotesVars);
// Variables can be defined inline as well.
const ref = listQuotesRef({ origin: ..., destination: ..., });
// Since all variables are optional for this query, you can omit the `ListQuotesVariables` argument.
const ref = listQuotesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listQuotesRef(dataConnect, listQuotesVars);

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
    customer: {
      name: string;
    };
    supplier?: {
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
    shipperAddressShape?: string | null;
    consigneeAddressShape?: string | null;
    customer: {
      name: string;
    };
    supplier?: {
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

## CreateCompany
You can execute the `CreateCompany` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createCompany(vars: CreateCompanyVariables): MutationPromise<CreateCompanyData, CreateCompanyVariables>;

interface CreateCompanyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCompanyVariables): MutationRef<CreateCompanyData, CreateCompanyVariables>;
}
export const createCompanyRef: CreateCompanyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createCompany(dc: DataConnect, vars: CreateCompanyVariables): MutationPromise<CreateCompanyData, CreateCompanyVariables>;

interface CreateCompanyRef {
  ...
  (dc: DataConnect, vars: CreateCompanyVariables): MutationRef<CreateCompanyData, CreateCompanyVariables>;
}
export const createCompanyRef: CreateCompanyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createCompanyRef:
```typescript
const name = createCompanyRef.operationName;
console.log(name);
```

### Variables
The `CreateCompany` mutation requires an argument of type `CreateCompanyVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateCompanyVariables {
  id?: UUIDString | null;
  name: string;
  entityType: string;
  countryCode?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
}
```
### Return Type
Recall that executing the `CreateCompany` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateCompanyData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCompanyData {
  company_upsert: Company_Key;
}
```
### Using `CreateCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCompany, CreateCompanyVariables } from '@atlas/dataconnect';

// The `CreateCompany` mutation requires an argument of type `CreateCompanyVariables`:
const createCompanyVars: CreateCompanyVariables = {
  id: ..., // optional
  name: ..., 
  entityType: ..., 
  countryCode: ..., // optional
  email: ..., // optional
  phoneNumber: ..., // optional
  address: ..., // optional
  city: ..., // optional
};

// Call the `createCompany()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createCompany(createCompanyVars);
// Variables can be defined inline as well.
const { data } = await createCompany({ id: ..., name: ..., entityType: ..., countryCode: ..., email: ..., phoneNumber: ..., address: ..., city: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createCompany(dataConnect, createCompanyVars);

console.log(data.company_upsert);

// Or, you can use the `Promise` API.
createCompany(createCompanyVars).then((response) => {
  const data = response.data;
  console.log(data.company_upsert);
});
```

### Using `CreateCompany`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createCompanyRef, CreateCompanyVariables } from '@atlas/dataconnect';

// The `CreateCompany` mutation requires an argument of type `CreateCompanyVariables`:
const createCompanyVars: CreateCompanyVariables = {
  id: ..., // optional
  name: ..., 
  entityType: ..., 
  countryCode: ..., // optional
  email: ..., // optional
  phoneNumber: ..., // optional
  address: ..., // optional
  city: ..., // optional
};

// Call the `createCompanyRef()` function to get a reference to the mutation.
const ref = createCompanyRef(createCompanyVars);
// Variables can be defined inline as well.
const ref = createCompanyRef({ id: ..., name: ..., entityType: ..., countryCode: ..., email: ..., phoneNumber: ..., address: ..., city: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createCompanyRef(dataConnect, createCompanyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.company_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.company_upsert);
});
```

## CreateLocation
You can execute the `CreateLocation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createLocation(vars: CreateLocationVariables): MutationPromise<CreateLocationData, CreateLocationVariables>;

interface CreateLocationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateLocationVariables): MutationRef<CreateLocationData, CreateLocationVariables>;
}
export const createLocationRef: CreateLocationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createLocation(dc: DataConnect, vars: CreateLocationVariables): MutationPromise<CreateLocationData, CreateLocationVariables>;

interface CreateLocationRef {
  ...
  (dc: DataConnect, vars: CreateLocationVariables): MutationRef<CreateLocationData, CreateLocationVariables>;
}
export const createLocationRef: CreateLocationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createLocationRef:
```typescript
const name = createLocationRef.operationName;
console.log(name);
```

### Variables
The `CreateLocation` mutation requires an argument of type `CreateLocationVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateLocationVariables {
  locode: string;
  name: string;
  countryCode: string;
  countryName: string;
  type: string;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
```
### Return Type
Recall that executing the `CreateLocation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateLocationData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateLocationData {
  location_upsert: Location_Key;
}
```
### Using `CreateLocation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createLocation, CreateLocationVariables } from '@atlas/dataconnect';

// The `CreateLocation` mutation requires an argument of type `CreateLocationVariables`:
const createLocationVars: CreateLocationVariables = {
  locode: ..., 
  name: ..., 
  countryCode: ..., 
  countryName: ..., 
  type: ..., 
  region: ..., // optional
  latitude: ..., // optional
  longitude: ..., // optional
};

// Call the `createLocation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createLocation(createLocationVars);
// Variables can be defined inline as well.
const { data } = await createLocation({ locode: ..., name: ..., countryCode: ..., countryName: ..., type: ..., region: ..., latitude: ..., longitude: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createLocation(dataConnect, createLocationVars);

console.log(data.location_upsert);

// Or, you can use the `Promise` API.
createLocation(createLocationVars).then((response) => {
  const data = response.data;
  console.log(data.location_upsert);
});
```

### Using `CreateLocation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createLocationRef, CreateLocationVariables } from '@atlas/dataconnect';

// The `CreateLocation` mutation requires an argument of type `CreateLocationVariables`:
const createLocationVars: CreateLocationVariables = {
  locode: ..., 
  name: ..., 
  countryCode: ..., 
  countryName: ..., 
  type: ..., 
  region: ..., // optional
  latitude: ..., // optional
  longitude: ..., // optional
};

// Call the `createLocationRef()` function to get a reference to the mutation.
const ref = createLocationRef(createLocationVars);
// Variables can be defined inline as well.
const ref = createLocationRef({ locode: ..., name: ..., countryCode: ..., countryName: ..., type: ..., region: ..., latitude: ..., longitude: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createLocationRef(dataConnect, createLocationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.location_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.location_upsert);
});
```

## CreateQuote
You can execute the `CreateQuote` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createQuote(vars: CreateQuoteVariables): MutationPromise<CreateQuoteData, CreateQuoteVariables>;

interface CreateQuoteRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateQuoteVariables): MutationRef<CreateQuoteData, CreateQuoteVariables>;
}
export const createQuoteRef: CreateQuoteRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createQuote(dc: DataConnect, vars: CreateQuoteVariables): MutationPromise<CreateQuoteData, CreateQuoteVariables>;

interface CreateQuoteRef {
  ...
  (dc: DataConnect, vars: CreateQuoteVariables): MutationRef<CreateQuoteData, CreateQuoteVariables>;
}
export const createQuoteRef: CreateQuoteRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createQuoteRef:
```typescript
const name = createQuoteRef.operationName;
console.log(name);
```

### Variables
The `CreateQuote` mutation requires an argument of type `CreateQuoteVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateQuoteVariables {
  quoteNumber: string;
  status: string;
  movementType: string;
  origin: string;
  destination: string;
  baseFreightCost: number;
  totalCost: number;
  currency: string;
  validityDate: DateString;
  carrierId?: UUIDString | null;
  customerId?: UUIDString | null;
  createdByUid: string;
}
```
### Return Type
Recall that executing the `CreateQuote` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateQuoteData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateQuoteData {
  quote_insert: Quote_Key;
}
```
### Using `CreateQuote`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createQuote, CreateQuoteVariables } from '@atlas/dataconnect';

// The `CreateQuote` mutation requires an argument of type `CreateQuoteVariables`:
const createQuoteVars: CreateQuoteVariables = {
  quoteNumber: ..., 
  status: ..., 
  movementType: ..., 
  origin: ..., 
  destination: ..., 
  baseFreightCost: ..., 
  totalCost: ..., 
  currency: ..., 
  validityDate: ..., 
  carrierId: ..., // optional
  customerId: ..., // optional
  createdByUid: ..., 
};

// Call the `createQuote()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createQuote(createQuoteVars);
// Variables can be defined inline as well.
const { data } = await createQuote({ quoteNumber: ..., status: ..., movementType: ..., origin: ..., destination: ..., baseFreightCost: ..., totalCost: ..., currency: ..., validityDate: ..., carrierId: ..., customerId: ..., createdByUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createQuote(dataConnect, createQuoteVars);

console.log(data.quote_insert);

// Or, you can use the `Promise` API.
createQuote(createQuoteVars).then((response) => {
  const data = response.data;
  console.log(data.quote_insert);
});
```

### Using `CreateQuote`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createQuoteRef, CreateQuoteVariables } from '@atlas/dataconnect';

// The `CreateQuote` mutation requires an argument of type `CreateQuoteVariables`:
const createQuoteVars: CreateQuoteVariables = {
  quoteNumber: ..., 
  status: ..., 
  movementType: ..., 
  origin: ..., 
  destination: ..., 
  baseFreightCost: ..., 
  totalCost: ..., 
  currency: ..., 
  validityDate: ..., 
  carrierId: ..., // optional
  customerId: ..., // optional
  createdByUid: ..., 
};

// Call the `createQuoteRef()` function to get a reference to the mutation.
const ref = createQuoteRef(createQuoteVars);
// Variables can be defined inline as well.
const ref = createQuoteRef({ quoteNumber: ..., status: ..., movementType: ..., origin: ..., destination: ..., baseFreightCost: ..., totalCost: ..., currency: ..., validityDate: ..., carrierId: ..., customerId: ..., createdByUid: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createQuoteRef(dataConnect, createQuoteVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.quote_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.quote_insert);
});
```

## CreateMilestone
You can execute the `CreateMilestone` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createMilestone(vars: CreateMilestoneVariables): MutationPromise<CreateMilestoneData, CreateMilestoneVariables>;

interface CreateMilestoneRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMilestoneVariables): MutationRef<CreateMilestoneData, CreateMilestoneVariables>;
}
export const createMilestoneRef: CreateMilestoneRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createMilestone(dc: DataConnect, vars: CreateMilestoneVariables): MutationPromise<CreateMilestoneData, CreateMilestoneVariables>;

interface CreateMilestoneRef {
  ...
  (dc: DataConnect, vars: CreateMilestoneVariables): MutationRef<CreateMilestoneData, CreateMilestoneVariables>;
}
export const createMilestoneRef: CreateMilestoneRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createMilestoneRef:
```typescript
const name = createMilestoneRef.operationName;
console.log(name);
```

### Variables
The `CreateMilestone` mutation requires an argument of type `CreateMilestoneVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateMilestoneVariables {
  eventCode: string;
  eventType: string;
  description: string;
  location?: string | null;
  shipmentId: UUIDString;
}
```
### Return Type
Recall that executing the `CreateMilestone` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateMilestoneData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMilestoneData {
  milestone_insert: Milestone_Key;
}
```
### Using `CreateMilestone`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMilestone, CreateMilestoneVariables } from '@atlas/dataconnect';

// The `CreateMilestone` mutation requires an argument of type `CreateMilestoneVariables`:
const createMilestoneVars: CreateMilestoneVariables = {
  eventCode: ..., 
  eventType: ..., 
  description: ..., 
  location: ..., // optional
  shipmentId: ..., 
};

// Call the `createMilestone()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createMilestone(createMilestoneVars);
// Variables can be defined inline as well.
const { data } = await createMilestone({ eventCode: ..., eventType: ..., description: ..., location: ..., shipmentId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createMilestone(dataConnect, createMilestoneVars);

console.log(data.milestone_insert);

// Or, you can use the `Promise` API.
createMilestone(createMilestoneVars).then((response) => {
  const data = response.data;
  console.log(data.milestone_insert);
});
```

### Using `CreateMilestone`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createMilestoneRef, CreateMilestoneVariables } from '@atlas/dataconnect';

// The `CreateMilestone` mutation requires an argument of type `CreateMilestoneVariables`:
const createMilestoneVars: CreateMilestoneVariables = {
  eventCode: ..., 
  eventType: ..., 
  description: ..., 
  location: ..., // optional
  shipmentId: ..., 
};

// Call the `createMilestoneRef()` function to get a reference to the mutation.
const ref = createMilestoneRef(createMilestoneVars);
// Variables can be defined inline as well.
const ref = createMilestoneRef({ eventCode: ..., eventType: ..., description: ..., location: ..., shipmentId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createMilestoneRef(dataConnect, createMilestoneVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.milestone_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.milestone_insert);
});
```

## CreateHsCode
You can execute the `CreateHsCode` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createHsCode(vars: CreateHsCodeVariables): MutationPromise<CreateHsCodeData, CreateHsCodeVariables>;

interface CreateHsCodeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateHsCodeVariables): MutationRef<CreateHsCodeData, CreateHsCodeVariables>;
}
export const createHsCodeRef: CreateHsCodeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createHsCode(dc: DataConnect, vars: CreateHsCodeVariables): MutationPromise<CreateHsCodeData, CreateHsCodeVariables>;

interface CreateHsCodeRef {
  ...
  (dc: DataConnect, vars: CreateHsCodeVariables): MutationRef<CreateHsCodeData, CreateHsCodeVariables>;
}
export const createHsCodeRef: CreateHsCodeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createHsCodeRef:
```typescript
const name = createHsCodeRef.operationName;
console.log(name);
```

### Variables
The `CreateHsCode` mutation requires an argument of type `CreateHsCodeVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateHsCodeVariables {
  code: string;
  description: string;
  dutyRate?: number | null;
  isHazardous?: boolean | null;
}
```
### Return Type
Recall that executing the `CreateHsCode` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateHsCodeData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateHsCodeData {
  hsCode_upsert: HsCode_Key;
}
```
### Using `CreateHsCode`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createHsCode, CreateHsCodeVariables } from '@atlas/dataconnect';

// The `CreateHsCode` mutation requires an argument of type `CreateHsCodeVariables`:
const createHsCodeVars: CreateHsCodeVariables = {
  code: ..., 
  description: ..., 
  dutyRate: ..., // optional
  isHazardous: ..., // optional
};

// Call the `createHsCode()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createHsCode(createHsCodeVars);
// Variables can be defined inline as well.
const { data } = await createHsCode({ code: ..., description: ..., dutyRate: ..., isHazardous: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createHsCode(dataConnect, createHsCodeVars);

console.log(data.hsCode_upsert);

// Or, you can use the `Promise` API.
createHsCode(createHsCodeVars).then((response) => {
  const data = response.data;
  console.log(data.hsCode_upsert);
});
```

### Using `CreateHsCode`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createHsCodeRef, CreateHsCodeVariables } from '@atlas/dataconnect';

// The `CreateHsCode` mutation requires an argument of type `CreateHsCodeVariables`:
const createHsCodeVars: CreateHsCodeVariables = {
  code: ..., 
  description: ..., 
  dutyRate: ..., // optional
  isHazardous: ..., // optional
};

// Call the `createHsCodeRef()` function to get a reference to the mutation.
const ref = createHsCodeRef(createHsCodeVars);
// Variables can be defined inline as well.
const ref = createHsCodeRef({ code: ..., description: ..., dutyRate: ..., isHazardous: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createHsCodeRef(dataConnect, createHsCodeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.hsCode_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.hsCode_upsert);
});
```

## CreateIncoterm
You can execute the `CreateIncoterm` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createIncoterm(vars: CreateIncotermVariables): MutationPromise<CreateIncotermData, CreateIncotermVariables>;

interface CreateIncotermRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateIncotermVariables): MutationRef<CreateIncotermData, CreateIncotermVariables>;
}
export const createIncotermRef: CreateIncotermRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createIncoterm(dc: DataConnect, vars: CreateIncotermVariables): MutationPromise<CreateIncotermData, CreateIncotermVariables>;

interface CreateIncotermRef {
  ...
  (dc: DataConnect, vars: CreateIncotermVariables): MutationRef<CreateIncotermData, CreateIncotermVariables>;
}
export const createIncotermRef: CreateIncotermRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createIncotermRef:
```typescript
const name = createIncotermRef.operationName;
console.log(name);
```

### Variables
The `CreateIncoterm` mutation requires an argument of type `CreateIncotermVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateIncotermVariables {
  code: string;
  description: string;
  freightPayer: string;
  originCustomsPayer: string;
  destCustomsPayer: string;
}
```
### Return Type
Recall that executing the `CreateIncoterm` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateIncotermData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateIncotermData {
  incoterm_upsert: Incoterm_Key;
}
```
### Using `CreateIncoterm`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createIncoterm, CreateIncotermVariables } from '@atlas/dataconnect';

// The `CreateIncoterm` mutation requires an argument of type `CreateIncotermVariables`:
const createIncotermVars: CreateIncotermVariables = {
  code: ..., 
  description: ..., 
  freightPayer: ..., 
  originCustomsPayer: ..., 
  destCustomsPayer: ..., 
};

// Call the `createIncoterm()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createIncoterm(createIncotermVars);
// Variables can be defined inline as well.
const { data } = await createIncoterm({ code: ..., description: ..., freightPayer: ..., originCustomsPayer: ..., destCustomsPayer: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createIncoterm(dataConnect, createIncotermVars);

console.log(data.incoterm_upsert);

// Or, you can use the `Promise` API.
createIncoterm(createIncotermVars).then((response) => {
  const data = response.data;
  console.log(data.incoterm_upsert);
});
```

### Using `CreateIncoterm`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createIncotermRef, CreateIncotermVariables } from '@atlas/dataconnect';

// The `CreateIncoterm` mutation requires an argument of type `CreateIncotermVariables`:
const createIncotermVars: CreateIncotermVariables = {
  code: ..., 
  description: ..., 
  freightPayer: ..., 
  originCustomsPayer: ..., 
  destCustomsPayer: ..., 
};

// Call the `createIncotermRef()` function to get a reference to the mutation.
const ref = createIncotermRef(createIncotermVars);
// Variables can be defined inline as well.
const ref = createIncotermRef({ code: ..., description: ..., freightPayer: ..., originCustomsPayer: ..., destCustomsPayer: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createIncotermRef(dataConnect, createIncotermVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.incoterm_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.incoterm_upsert);
});
```

## CreateVessel
You can execute the `CreateVessel` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createVessel(vars: CreateVesselVariables): MutationPromise<CreateVesselData, CreateVesselVariables>;

interface CreateVesselRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVesselVariables): MutationRef<CreateVesselData, CreateVesselVariables>;
}
export const createVesselRef: CreateVesselRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createVessel(dc: DataConnect, vars: CreateVesselVariables): MutationPromise<CreateVesselData, CreateVesselVariables>;

interface CreateVesselRef {
  ...
  (dc: DataConnect, vars: CreateVesselVariables): MutationRef<CreateVesselData, CreateVesselVariables>;
}
export const createVesselRef: CreateVesselRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createVesselRef:
```typescript
const name = createVesselRef.operationName;
console.log(name);
```

### Variables
The `CreateVessel` mutation requires an argument of type `CreateVesselVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateVesselVariables {
  imoNumber: string;
  name: string;
  flag?: string | null;
  carrierId: UUIDString;
  capacityTeu?: number | null;
}
```
### Return Type
Recall that executing the `CreateVessel` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateVesselData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateVesselData {
  vessel_upsert: Vessel_Key;
}
```
### Using `CreateVessel`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createVessel, CreateVesselVariables } from '@atlas/dataconnect';

// The `CreateVessel` mutation requires an argument of type `CreateVesselVariables`:
const createVesselVars: CreateVesselVariables = {
  imoNumber: ..., 
  name: ..., 
  flag: ..., // optional
  carrierId: ..., 
  capacityTeu: ..., // optional
};

// Call the `createVessel()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createVessel(createVesselVars);
// Variables can be defined inline as well.
const { data } = await createVessel({ imoNumber: ..., name: ..., flag: ..., carrierId: ..., capacityTeu: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createVessel(dataConnect, createVesselVars);

console.log(data.vessel_upsert);

// Or, you can use the `Promise` API.
createVessel(createVesselVars).then((response) => {
  const data = response.data;
  console.log(data.vessel_upsert);
});
```

### Using `CreateVessel`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createVesselRef, CreateVesselVariables } from '@atlas/dataconnect';

// The `CreateVessel` mutation requires an argument of type `CreateVesselVariables`:
const createVesselVars: CreateVesselVariables = {
  imoNumber: ..., 
  name: ..., 
  flag: ..., // optional
  carrierId: ..., 
  capacityTeu: ..., // optional
};

// Call the `createVesselRef()` function to get a reference to the mutation.
const ref = createVesselRef(createVesselVars);
// Variables can be defined inline as well.
const ref = createVesselRef({ imoNumber: ..., name: ..., flag: ..., carrierId: ..., capacityTeu: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createVesselRef(dataConnect, createVesselVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.vessel_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.vessel_upsert);
});
```

## CreateSchedule
You can execute the `CreateSchedule` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createSchedule(vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;

interface CreateScheduleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
}
export const createScheduleRef: CreateScheduleRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createSchedule(dc: DataConnect, vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;

interface CreateScheduleRef {
  ...
  (dc: DataConnect, vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
}
export const createScheduleRef: CreateScheduleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createScheduleRef:
```typescript
const name = createScheduleRef.operationName;
console.log(name);
```

### Variables
The `CreateSchedule` mutation requires an argument of type `CreateScheduleVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateScheduleVariables {
  vesselImoNumber: string;
  voyageNumber: string;
  polLocode: string;
  podLocode: string;
  etd: DateString;
  eta: DateString;
  cutOffDate?: TimestampString | null;
  availableTeu?: number | null;
}
```
### Return Type
Recall that executing the `CreateSchedule` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateScheduleData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateScheduleData {
  schedule_insert: Schedule_Key;
}
```
### Using `CreateSchedule`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createSchedule, CreateScheduleVariables } from '@atlas/dataconnect';

// The `CreateSchedule` mutation requires an argument of type `CreateScheduleVariables`:
const createScheduleVars: CreateScheduleVariables = {
  vesselImoNumber: ..., 
  voyageNumber: ..., 
  polLocode: ..., 
  podLocode: ..., 
  etd: ..., 
  eta: ..., 
  cutOffDate: ..., // optional
  availableTeu: ..., // optional
};

// Call the `createSchedule()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createSchedule(createScheduleVars);
// Variables can be defined inline as well.
const { data } = await createSchedule({ vesselImoNumber: ..., voyageNumber: ..., polLocode: ..., podLocode: ..., etd: ..., eta: ..., cutOffDate: ..., availableTeu: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createSchedule(dataConnect, createScheduleVars);

console.log(data.schedule_insert);

// Or, you can use the `Promise` API.
createSchedule(createScheduleVars).then((response) => {
  const data = response.data;
  console.log(data.schedule_insert);
});
```

### Using `CreateSchedule`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createScheduleRef, CreateScheduleVariables } from '@atlas/dataconnect';

// The `CreateSchedule` mutation requires an argument of type `CreateScheduleVariables`:
const createScheduleVars: CreateScheduleVariables = {
  vesselImoNumber: ..., 
  voyageNumber: ..., 
  polLocode: ..., 
  podLocode: ..., 
  etd: ..., 
  eta: ..., 
  cutOffDate: ..., // optional
  availableTeu: ..., // optional
};

// Call the `createScheduleRef()` function to get a reference to the mutation.
const ref = createScheduleRef(createScheduleVars);
// Variables can be defined inline as well.
const ref = createScheduleRef({ vesselImoNumber: ..., voyageNumber: ..., polLocode: ..., podLocode: ..., etd: ..., eta: ..., cutOffDate: ..., availableTeu: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createScheduleRef(dataConnect, createScheduleVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.schedule_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.schedule_insert);
});
```

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
  incotermCode?: string | null;
  origin: string;
  pol: string;
  pod: string;
  destination: string;
  customerId: UUIDString;
  supplierId?: UUIDString | null;
  shipperAddressShape?: string | null;
  consigneeAddressShape?: string | null;
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
  incotermCode: ..., // optional
  origin: ..., 
  pol: ..., 
  pod: ..., 
  destination: ..., 
  customerId: ..., 
  supplierId: ..., // optional
  shipperAddressShape: ..., // optional
  consigneeAddressShape: ..., // optional
};

// Call the `createShipment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createShipment(createShipmentVars);
// Variables can be defined inline as well.
const { data } = await createShipment({ trackingNumber: ..., status: ..., movementType: ..., direction: ..., incotermCode: ..., origin: ..., pol: ..., pod: ..., destination: ..., customerId: ..., supplierId: ..., shipperAddressShape: ..., consigneeAddressShape: ..., });

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
  incotermCode: ..., // optional
  origin: ..., 
  pol: ..., 
  pod: ..., 
  destination: ..., 
  customerId: ..., 
  supplierId: ..., // optional
  shipperAddressShape: ..., // optional
  consigneeAddressShape: ..., // optional
};

// Call the `createShipmentRef()` function to get a reference to the mutation.
const ref = createShipmentRef(createShipmentVars);
// Variables can be defined inline as well.
const ref = createShipmentRef({ trackingNumber: ..., status: ..., movementType: ..., direction: ..., incotermCode: ..., origin: ..., pol: ..., pod: ..., destination: ..., customerId: ..., supplierId: ..., shipperAddressShape: ..., consigneeAddressShape: ..., });

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

