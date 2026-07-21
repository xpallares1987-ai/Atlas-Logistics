# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `atlas`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListCustomers*](#listcustomers)
  - [*ListCrmDeals*](#listcrmdeals)
  - [*ListCrmInteractions*](#listcrminteractions)
  - [*ListPendingOcrDocuments*](#listpendingocrdocuments)
  - [*ListIncoterms*](#listincoterms)
  - [*ListHsCodes*](#listhscodes)
  - [*ListVessels*](#listvessels)
  - [*ListSchedules*](#listschedules)
  - [*ListDictionaryTerms*](#listdictionaryterms)
  - [*ListCarriers*](#listcarriers)
  - [*ListHauliers*](#listhauliers)
  - [*ListAgents*](#listagents)
  - [*ListCompanies*](#listcompanies)
  - [*SearchLocations*](#searchlocations)
  - [*ListQuotes*](#listquotes)
  - [*ListShipments*](#listshipments)
  - [*GetShipmentById*](#getshipmentbyid)
  - [*GetUserProfile*](#getuserprofile)
  - [*GetAllUsers*](#getallusers)
- [**Mutations**](#mutations)
  - [*CreateCrmDeal*](#createcrmdeal)
  - [*UpdateCrmDealStatus*](#updatecrmdealstatus)
  - [*CreateCrmInteraction*](#createcrminteraction)
  - [*CreateDocumentFromOcr*](#createdocumentfromocr)
  - [*ApproveOcrDocument*](#approveocrdocument)
  - [*RejectOcrDocument*](#rejectocrdocument)
  - [*UpsertDictionaryTerm*](#upsertdictionaryterm)
  - [*CreateCompany*](#createcompany)
  - [*CreateLocation*](#createlocation)
  - [*CreateQuote*](#createquote)
  - [*CreateMilestone*](#createmilestone)
  - [*CreateHsCode*](#createhscode)
  - [*CreateIncoterm*](#createincoterm)
  - [*CreateVessel*](#createvessel)
  - [*CreateSchedule*](#createschedule)
  - [*InsertDictionaryTerm*](#insertdictionaryterm)
  - [*CreateShipment*](#createshipment)
  - [*LogShipmentEvent*](#logshipmentevent)
  - [*UpsertUser*](#upsertuser)
  - [*UpdateUserRole*](#updateuserrole)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `atlas`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

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

Below are examples of how to use the `atlas` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListCustomers
You can execute the `ListCustomers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCustomers(vars: ListCustomersVariables, options?: ExecuteQueryOptions): QueryPromise<ListCustomersData, ListCustomersVariables>;

interface ListCustomersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCustomersVariables): QueryRef<ListCustomersData, ListCustomersVariables>;
}
export const listCustomersRef: ListCustomersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCustomers(dc: DataConnect, vars: ListCustomersVariables, options?: ExecuteQueryOptions): QueryPromise<ListCustomersData, ListCustomersVariables>;

interface ListCustomersRef {
  ...
  (dc: DataConnect, vars: ListCustomersVariables): QueryRef<ListCustomersData, ListCustomersVariables>;
}
export const listCustomersRef: ListCustomersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCustomersRef:
```typescript
const name = listCustomersRef.operationName;
console.log(name);
```

### Variables
The `ListCustomers` query requires an argument of type `ListCustomersVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListCustomersVariables {
  tenantId: string;
}
```
### Return Type
Recall that executing the `ListCustomers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCustomersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCustomersData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    creditLimit?: number | null;
    paymentTerms?: string | null;
    rating?: number | null;
  } & Company_Key)[];
}
```
### Using `ListCustomers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCustomers, ListCustomersVariables } from '@dataconnect/generated';

// The `ListCustomers` query requires an argument of type `ListCustomersVariables`:
const listCustomersVars: ListCustomersVariables = {
  tenantId: ..., 
};

// Call the `listCustomers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCustomers(listCustomersVars);
// Variables can be defined inline as well.
const { data } = await listCustomers({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCustomers(dataConnect, listCustomersVars);

console.log(data.companies);

// Or, you can use the `Promise` API.
listCustomers(listCustomersVars).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListCustomers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCustomersRef, ListCustomersVariables } from '@dataconnect/generated';

// The `ListCustomers` query requires an argument of type `ListCustomersVariables`:
const listCustomersVars: ListCustomersVariables = {
  tenantId: ..., 
};

// Call the `listCustomersRef()` function to get a reference to the query.
const ref = listCustomersRef(listCustomersVars);
// Variables can be defined inline as well.
const ref = listCustomersRef({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCustomersRef(dataConnect, listCustomersVars);

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

## ListCrmDeals
You can execute the `ListCrmDeals` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCrmDeals(vars: ListCrmDealsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCrmDealsData, ListCrmDealsVariables>;

interface ListCrmDealsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCrmDealsVariables): QueryRef<ListCrmDealsData, ListCrmDealsVariables>;
}
export const listCrmDealsRef: ListCrmDealsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCrmDeals(dc: DataConnect, vars: ListCrmDealsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCrmDealsData, ListCrmDealsVariables>;

interface ListCrmDealsRef {
  ...
  (dc: DataConnect, vars: ListCrmDealsVariables): QueryRef<ListCrmDealsData, ListCrmDealsVariables>;
}
export const listCrmDealsRef: ListCrmDealsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCrmDealsRef:
```typescript
const name = listCrmDealsRef.operationName;
console.log(name);
```

### Variables
The `ListCrmDeals` query requires an argument of type `ListCrmDealsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListCrmDealsVariables {
  tenantId: string;
}
```
### Return Type
Recall that executing the `ListCrmDeals` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCrmDealsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCrmDealsData {
  crmDeals: ({
    id: UUIDString;
    title: string;
    customer: {
      id: UUIDString;
      name: string;
    } & Company_Key;
    estimatedValue?: number | null;
    status: string;
    expectedCloseDate?: DateString | null;
    assignedToUid: string;
    createdAt: TimestampString;
  } & CrmDeal_Key)[];
}
```
### Using `ListCrmDeals`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCrmDeals, ListCrmDealsVariables } from '@dataconnect/generated';

// The `ListCrmDeals` query requires an argument of type `ListCrmDealsVariables`:
const listCrmDealsVars: ListCrmDealsVariables = {
  tenantId: ..., 
};

// Call the `listCrmDeals()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCrmDeals(listCrmDealsVars);
// Variables can be defined inline as well.
const { data } = await listCrmDeals({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCrmDeals(dataConnect, listCrmDealsVars);

console.log(data.crmDeals);

// Or, you can use the `Promise` API.
listCrmDeals(listCrmDealsVars).then((response) => {
  const data = response.data;
  console.log(data.crmDeals);
});
```

### Using `ListCrmDeals`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCrmDealsRef, ListCrmDealsVariables } from '@dataconnect/generated';

// The `ListCrmDeals` query requires an argument of type `ListCrmDealsVariables`:
const listCrmDealsVars: ListCrmDealsVariables = {
  tenantId: ..., 
};

// Call the `listCrmDealsRef()` function to get a reference to the query.
const ref = listCrmDealsRef(listCrmDealsVars);
// Variables can be defined inline as well.
const ref = listCrmDealsRef({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCrmDealsRef(dataConnect, listCrmDealsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.crmDeals);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.crmDeals);
});
```

## ListCrmInteractions
You can execute the `ListCrmInteractions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCrmInteractions(vars: ListCrmInteractionsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCrmInteractionsData, ListCrmInteractionsVariables>;

interface ListCrmInteractionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCrmInteractionsVariables): QueryRef<ListCrmInteractionsData, ListCrmInteractionsVariables>;
}
export const listCrmInteractionsRef: ListCrmInteractionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCrmInteractions(dc: DataConnect, vars: ListCrmInteractionsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCrmInteractionsData, ListCrmInteractionsVariables>;

interface ListCrmInteractionsRef {
  ...
  (dc: DataConnect, vars: ListCrmInteractionsVariables): QueryRef<ListCrmInteractionsData, ListCrmInteractionsVariables>;
}
export const listCrmInteractionsRef: ListCrmInteractionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCrmInteractionsRef:
```typescript
const name = listCrmInteractionsRef.operationName;
console.log(name);
```

### Variables
The `ListCrmInteractions` query requires an argument of type `ListCrmInteractionsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListCrmInteractionsVariables {
  tenantId: string;
  customerId: UUIDString;
}
```
### Return Type
Recall that executing the `ListCrmInteractions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCrmInteractionsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCrmInteractionsData {
  crmInteractions: ({
    id: UUIDString;
    type: string;
    date: TimestampString;
    notes?: string | null;
    outcome?: string | null;
    createdByUid: string;
  } & CrmInteraction_Key)[];
}
```
### Using `ListCrmInteractions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCrmInteractions, ListCrmInteractionsVariables } from '@dataconnect/generated';

// The `ListCrmInteractions` query requires an argument of type `ListCrmInteractionsVariables`:
const listCrmInteractionsVars: ListCrmInteractionsVariables = {
  tenantId: ..., 
  customerId: ..., 
};

// Call the `listCrmInteractions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCrmInteractions(listCrmInteractionsVars);
// Variables can be defined inline as well.
const { data } = await listCrmInteractions({ tenantId: ..., customerId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCrmInteractions(dataConnect, listCrmInteractionsVars);

console.log(data.crmInteractions);

// Or, you can use the `Promise` API.
listCrmInteractions(listCrmInteractionsVars).then((response) => {
  const data = response.data;
  console.log(data.crmInteractions);
});
```

### Using `ListCrmInteractions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCrmInteractionsRef, ListCrmInteractionsVariables } from '@dataconnect/generated';

// The `ListCrmInteractions` query requires an argument of type `ListCrmInteractionsVariables`:
const listCrmInteractionsVars: ListCrmInteractionsVariables = {
  tenantId: ..., 
  customerId: ..., 
};

// Call the `listCrmInteractionsRef()` function to get a reference to the query.
const ref = listCrmInteractionsRef(listCrmInteractionsVars);
// Variables can be defined inline as well.
const ref = listCrmInteractionsRef({ tenantId: ..., customerId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCrmInteractionsRef(dataConnect, listCrmInteractionsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.crmInteractions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.crmInteractions);
});
```

## ListPendingOcrDocuments
You can execute the `ListPendingOcrDocuments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPendingOcrDocuments(options?: ExecuteQueryOptions): QueryPromise<ListPendingOcrDocumentsData, undefined>;

interface ListPendingOcrDocumentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPendingOcrDocumentsData, undefined>;
}
export const listPendingOcrDocumentsRef: ListPendingOcrDocumentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPendingOcrDocuments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPendingOcrDocumentsData, undefined>;

interface ListPendingOcrDocumentsRef {
  ...
  (dc: DataConnect): QueryRef<ListPendingOcrDocumentsData, undefined>;
}
export const listPendingOcrDocumentsRef: ListPendingOcrDocumentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPendingOcrDocumentsRef:
```typescript
const name = listPendingOcrDocumentsRef.operationName;
console.log(name);
```

### Variables
The `ListPendingOcrDocuments` query has no variables.
### Return Type
Recall that executing the `ListPendingOcrDocuments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPendingOcrDocumentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPendingOcrDocumentsData {
  documents: ({
    id: UUIDString;
    documentNumber?: string | null;
    documentType: string;
    fileName?: string | null;
    fileUrl: string;
    mimeType?: string | null;
    uploadDate?: TimestampString | null;
    ocrStatus?: string | null;
    extractedData?: unknown | null;
    shipment?: {
      id: UUIDString;
      trackingNumber: string;
    } & Shipment_Key;
  } & Document_Key)[];
}
```
### Using `ListPendingOcrDocuments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPendingOcrDocuments } from '@dataconnect/generated';


// Call the `listPendingOcrDocuments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPendingOcrDocuments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPendingOcrDocuments(dataConnect);

console.log(data.documents);

// Or, you can use the `Promise` API.
listPendingOcrDocuments().then((response) => {
  const data = response.data;
  console.log(data.documents);
});
```

### Using `ListPendingOcrDocuments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPendingOcrDocumentsRef } from '@dataconnect/generated';


// Call the `listPendingOcrDocumentsRef()` function to get a reference to the query.
const ref = listPendingOcrDocumentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPendingOcrDocumentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.documents);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.documents);
});
```

## ListIncoterms
You can execute the `ListIncoterms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listIncoterms(options?: ExecuteQueryOptions): QueryPromise<ListIncotermsData, undefined>;

interface ListIncotermsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListIncotermsData, undefined>;
}
export const listIncotermsRef: ListIncotermsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listIncoterms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListIncotermsData, undefined>;

interface ListIncotermsRef {
  ...
  (dc: DataConnect): QueryRef<ListIncotermsData, undefined>;
}
export const listIncotermsRef: ListIncotermsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listIncotermsRef:
```typescript
const name = listIncotermsRef.operationName;
console.log(name);
```

### Variables
The `ListIncoterms` query has no variables.
### Return Type
Recall that executing the `ListIncoterms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListIncotermsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListIncotermsData {
  incoterms: ({
    code: string;
    description?: string | null;
    freightPayer: string;
    originCustomsPayer: string;
    destCustomsPayer: string;
    isActive: boolean;
  } & Incoterm_Key)[];
}
```
### Using `ListIncoterms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listIncoterms } from '@dataconnect/generated';


// Call the `listIncoterms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listIncoterms();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listIncoterms(dataConnect);

console.log(data.incoterms);

// Or, you can use the `Promise` API.
listIncoterms().then((response) => {
  const data = response.data;
  console.log(data.incoterms);
});
```

### Using `ListIncoterms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listIncotermsRef } from '@dataconnect/generated';


// Call the `listIncotermsRef()` function to get a reference to the query.
const ref = listIncotermsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listIncotermsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.incoterms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.incoterms);
});
```

## ListHsCodes
You can execute the `ListHsCodes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listHsCodes(options?: ExecuteQueryOptions): QueryPromise<ListHsCodesData, undefined>;

interface ListHsCodesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListHsCodesData, undefined>;
}
export const listHsCodesRef: ListHsCodesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listHsCodes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListHsCodesData, undefined>;

interface ListHsCodesRef {
  ...
  (dc: DataConnect): QueryRef<ListHsCodesData, undefined>;
}
export const listHsCodesRef: ListHsCodesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listHsCodesRef:
```typescript
const name = listHsCodesRef.operationName;
console.log(name);
```

### Variables
The `ListHsCodes` query has no variables.
### Return Type
Recall that executing the `ListHsCodes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListHsCodesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListHsCodesData {
  hsCodes: ({
    code: string;
    description?: string | null;
    dutyRate?: number | null;
    isHazardous: boolean;
    isActive: boolean;
  } & HsCode_Key)[];
}
```
### Using `ListHsCodes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listHsCodes } from '@dataconnect/generated';


// Call the `listHsCodes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listHsCodes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listHsCodes(dataConnect);

console.log(data.hsCodes);

// Or, you can use the `Promise` API.
listHsCodes().then((response) => {
  const data = response.data;
  console.log(data.hsCodes);
});
```

### Using `ListHsCodes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listHsCodesRef } from '@dataconnect/generated';


// Call the `listHsCodesRef()` function to get a reference to the query.
const ref = listHsCodesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listHsCodesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.hsCodes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.hsCodes);
});
```

## ListVessels
You can execute the `ListVessels` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listVessels(options?: ExecuteQueryOptions): QueryPromise<ListVesselsData, undefined>;

interface ListVesselsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListVesselsData, undefined>;
}
export const listVesselsRef: ListVesselsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listVessels(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListVesselsData, undefined>;

interface ListVesselsRef {
  ...
  (dc: DataConnect): QueryRef<ListVesselsData, undefined>;
}
export const listVesselsRef: ListVesselsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listVesselsRef:
```typescript
const name = listVesselsRef.operationName;
console.log(name);
```

### Variables
The `ListVessels` query has no variables.
### Return Type
Recall that executing the `ListVessels` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListVesselsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListVesselsData {
  vessels: ({
    imoNumber: string;
    name: string;
    flag?: string | null;
    capacityTeu?: number | null;
    carrier: {
      id: UUIDString;
      name: string;
    } & Company_Key;
    isActive: boolean;
  } & Vessel_Key)[];
}
```
### Using `ListVessels`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listVessels } from '@dataconnect/generated';


// Call the `listVessels()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listVessels();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listVessels(dataConnect);

console.log(data.vessels);

// Or, you can use the `Promise` API.
listVessels().then((response) => {
  const data = response.data;
  console.log(data.vessels);
});
```

### Using `ListVessels`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listVesselsRef } from '@dataconnect/generated';


// Call the `listVesselsRef()` function to get a reference to the query.
const ref = listVesselsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listVesselsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.vessels);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.vessels);
});
```

## ListSchedules
You can execute the `ListSchedules` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listSchedules(vars: ListSchedulesVariables, options?: ExecuteQueryOptions): QueryPromise<ListSchedulesData, ListSchedulesVariables>;

interface ListSchedulesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSchedulesVariables): QueryRef<ListSchedulesData, ListSchedulesVariables>;
}
export const listSchedulesRef: ListSchedulesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listSchedules(dc: DataConnect, vars: ListSchedulesVariables, options?: ExecuteQueryOptions): QueryPromise<ListSchedulesData, ListSchedulesVariables>;

interface ListSchedulesRef {
  ...
  (dc: DataConnect, vars: ListSchedulesVariables): QueryRef<ListSchedulesData, ListSchedulesVariables>;
}
export const listSchedulesRef: ListSchedulesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listSchedulesRef:
```typescript
const name = listSchedulesRef.operationName;
console.log(name);
```

### Variables
The `ListSchedules` query requires an argument of type `ListSchedulesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListSchedulesVariables {
  tenantId: string;
}
```
### Return Type
Recall that executing the `ListSchedules` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListSchedulesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListSchedulesData {
  schedules: ({
    id: UUIDString;
    tenantId: string;
    vessel: {
      imoNumber: string;
      name: string;
    } & Vessel_Key;
    voyageNumber: string;
    pol: {
      locode: string;
      name: string;
    } & Location_Key;
    pod: {
      locode: string;
      name: string;
    } & Location_Key;
    etd: DateString;
    eta: DateString;
    cutOffDate?: TimestampString | null;
    availableTeu?: number | null;
    status: string;
  } & Schedule_Key)[];
}
```
### Using `ListSchedules`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listSchedules, ListSchedulesVariables } from '@dataconnect/generated';

// The `ListSchedules` query requires an argument of type `ListSchedulesVariables`:
const listSchedulesVars: ListSchedulesVariables = {
  tenantId: ..., 
};

// Call the `listSchedules()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listSchedules(listSchedulesVars);
// Variables can be defined inline as well.
const { data } = await listSchedules({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listSchedules(dataConnect, listSchedulesVars);

console.log(data.schedules);

// Or, you can use the `Promise` API.
listSchedules(listSchedulesVars).then((response) => {
  const data = response.data;
  console.log(data.schedules);
});
```

### Using `ListSchedules`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listSchedulesRef, ListSchedulesVariables } from '@dataconnect/generated';

// The `ListSchedules` query requires an argument of type `ListSchedulesVariables`:
const listSchedulesVars: ListSchedulesVariables = {
  tenantId: ..., 
};

// Call the `listSchedulesRef()` function to get a reference to the query.
const ref = listSchedulesRef(listSchedulesVars);
// Variables can be defined inline as well.
const ref = listSchedulesRef({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listSchedulesRef(dataConnect, listSchedulesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.schedules);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.schedules);
});
```

## ListDictionaryTerms
You can execute the `ListDictionaryTerms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listDictionaryTerms(options?: ExecuteQueryOptions): QueryPromise<ListDictionaryTermsData, undefined>;

interface ListDictionaryTermsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDictionaryTermsData, undefined>;
}
export const listDictionaryTermsRef: ListDictionaryTermsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDictionaryTerms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListDictionaryTermsData, undefined>;

interface ListDictionaryTermsRef {
  ...
  (dc: DataConnect): QueryRef<ListDictionaryTermsData, undefined>;
}
export const listDictionaryTermsRef: ListDictionaryTermsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDictionaryTermsRef:
```typescript
const name = listDictionaryTermsRef.operationName;
console.log(name);
```

### Variables
The `ListDictionaryTerms` query has no variables.
### Return Type
Recall that executing the `ListDictionaryTerms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDictionaryTermsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDictionaryTermsData {
  dictionaryTerms: ({
    acronym: string;
    meaning: string;
    description?: string | null;
    category: string;
    subCategory?: string | null;
    region?: string | null;
    moduleScope?: string[] | null;
    isActive: boolean;
  } & DictionaryTerm_Key)[];
}
```
### Using `ListDictionaryTerms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDictionaryTerms } from '@dataconnect/generated';


// Call the `listDictionaryTerms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDictionaryTerms();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDictionaryTerms(dataConnect);

console.log(data.dictionaryTerms);

// Or, you can use the `Promise` API.
listDictionaryTerms().then((response) => {
  const data = response.data;
  console.log(data.dictionaryTerms);
});
```

### Using `ListDictionaryTerms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDictionaryTermsRef } from '@dataconnect/generated';


// Call the `listDictionaryTermsRef()` function to get a reference to the query.
const ref = listDictionaryTermsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDictionaryTermsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dictionaryTerms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dictionaryTerms);
});
```

## ListCarriers
You can execute the `ListCarriers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCarriers(vars: ListCarriersVariables, options?: ExecuteQueryOptions): QueryPromise<ListCarriersData, ListCarriersVariables>;

interface ListCarriersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCarriersVariables): QueryRef<ListCarriersData, ListCarriersVariables>;
}
export const listCarriersRef: ListCarriersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCarriers(dc: DataConnect, vars: ListCarriersVariables, options?: ExecuteQueryOptions): QueryPromise<ListCarriersData, ListCarriersVariables>;

interface ListCarriersRef {
  ...
  (dc: DataConnect, vars: ListCarriersVariables): QueryRef<ListCarriersData, ListCarriersVariables>;
}
export const listCarriersRef: ListCarriersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCarriersRef:
```typescript
const name = listCarriersRef.operationName;
console.log(name);
```

### Variables
The `ListCarriers` query requires an argument of type `ListCarriersVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListCarriersVariables {
  tenantId: string;
}
```
### Return Type
Recall that executing the `ListCarriers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCarriersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCarriersData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    scacCode?: string | null;
    paymentTerms?: string | null;
    rating?: number | null;
    isActive: boolean;
  } & Company_Key)[];
}
```
### Using `ListCarriers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCarriers, ListCarriersVariables } from '@dataconnect/generated';

// The `ListCarriers` query requires an argument of type `ListCarriersVariables`:
const listCarriersVars: ListCarriersVariables = {
  tenantId: ..., 
};

// Call the `listCarriers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCarriers(listCarriersVars);
// Variables can be defined inline as well.
const { data } = await listCarriers({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCarriers(dataConnect, listCarriersVars);

console.log(data.companies);

// Or, you can use the `Promise` API.
listCarriers(listCarriersVars).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListCarriers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCarriersRef, ListCarriersVariables } from '@dataconnect/generated';

// The `ListCarriers` query requires an argument of type `ListCarriersVariables`:
const listCarriersVars: ListCarriersVariables = {
  tenantId: ..., 
};

// Call the `listCarriersRef()` function to get a reference to the query.
const ref = listCarriersRef(listCarriersVars);
// Variables can be defined inline as well.
const ref = listCarriersRef({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCarriersRef(dataConnect, listCarriersVars);

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

## ListHauliers
You can execute the `ListHauliers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listHauliers(vars: ListHauliersVariables, options?: ExecuteQueryOptions): QueryPromise<ListHauliersData, ListHauliersVariables>;

interface ListHauliersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListHauliersVariables): QueryRef<ListHauliersData, ListHauliersVariables>;
}
export const listHauliersRef: ListHauliersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listHauliers(dc: DataConnect, vars: ListHauliersVariables, options?: ExecuteQueryOptions): QueryPromise<ListHauliersData, ListHauliersVariables>;

interface ListHauliersRef {
  ...
  (dc: DataConnect, vars: ListHauliersVariables): QueryRef<ListHauliersData, ListHauliersVariables>;
}
export const listHauliersRef: ListHauliersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listHauliersRef:
```typescript
const name = listHauliersRef.operationName;
console.log(name);
```

### Variables
The `ListHauliers` query requires an argument of type `ListHauliersVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListHauliersVariables {
  tenantId: string;
}
```
### Return Type
Recall that executing the `ListHauliers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListHauliersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListHauliersData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    taxId?: string | null;
    paymentTerms?: string | null;
    rating?: number | null;
    isActive: boolean;
  } & Company_Key)[];
}
```
### Using `ListHauliers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listHauliers, ListHauliersVariables } from '@dataconnect/generated';

// The `ListHauliers` query requires an argument of type `ListHauliersVariables`:
const listHauliersVars: ListHauliersVariables = {
  tenantId: ..., 
};

// Call the `listHauliers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listHauliers(listHauliersVars);
// Variables can be defined inline as well.
const { data } = await listHauliers({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listHauliers(dataConnect, listHauliersVars);

console.log(data.companies);

// Or, you can use the `Promise` API.
listHauliers(listHauliersVars).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListHauliers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listHauliersRef, ListHauliersVariables } from '@dataconnect/generated';

// The `ListHauliers` query requires an argument of type `ListHauliersVariables`:
const listHauliersVars: ListHauliersVariables = {
  tenantId: ..., 
};

// Call the `listHauliersRef()` function to get a reference to the query.
const ref = listHauliersRef(listHauliersVars);
// Variables can be defined inline as well.
const ref = listHauliersRef({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listHauliersRef(dataConnect, listHauliersVars);

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

## ListAgents
You can execute the `ListAgents` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAgents(vars: ListAgentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListAgentsData, ListAgentsVariables>;

interface ListAgentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAgentsVariables): QueryRef<ListAgentsData, ListAgentsVariables>;
}
export const listAgentsRef: ListAgentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAgents(dc: DataConnect, vars: ListAgentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListAgentsData, ListAgentsVariables>;

interface ListAgentsRef {
  ...
  (dc: DataConnect, vars: ListAgentsVariables): QueryRef<ListAgentsData, ListAgentsVariables>;
}
export const listAgentsRef: ListAgentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAgentsRef:
```typescript
const name = listAgentsRef.operationName;
console.log(name);
```

### Variables
The `ListAgents` query requires an argument of type `ListAgentsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListAgentsVariables {
  tenantId: string;
}
```
### Return Type
Recall that executing the `ListAgents` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAgentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAgentsData {
  companies: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    contactPerson?: string | null;
    city?: string | null;
    countryCode?: string | null;
    paymentTerms?: string | null;
    rating?: number | null;
    isActive: boolean;
  } & Company_Key)[];
}
```
### Using `ListAgents`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAgents, ListAgentsVariables } from '@dataconnect/generated';

// The `ListAgents` query requires an argument of type `ListAgentsVariables`:
const listAgentsVars: ListAgentsVariables = {
  tenantId: ..., 
};

// Call the `listAgents()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAgents(listAgentsVars);
// Variables can be defined inline as well.
const { data } = await listAgents({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAgents(dataConnect, listAgentsVars);

console.log(data.companies);

// Or, you can use the `Promise` API.
listAgents(listAgentsVars).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListAgents`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAgentsRef, ListAgentsVariables } from '@dataconnect/generated';

// The `ListAgents` query requires an argument of type `ListAgentsVariables`:
const listAgentsVars: ListAgentsVariables = {
  tenantId: ..., 
};

// Call the `listAgentsRef()` function to get a reference to the query.
const ref = listAgentsRef(listAgentsVars);
// Variables can be defined inline as well.
const ref = listAgentsRef({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAgentsRef(dataConnect, listAgentsVars);

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

## ListCompanies
You can execute the `ListCompanies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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

The `data` property is an object of type `ListCompaniesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
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
import { connectorConfig, listCompanies } from '@dataconnect/generated';


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
import { connectorConfig, listCompaniesRef } from '@dataconnect/generated';


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
You can execute the `SearchLocations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `SearchLocations` query requires an argument of type `SearchLocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SearchLocationsVariables {
  query: string;
}
```
### Return Type
Recall that executing the `SearchLocations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SearchLocationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SearchLocationsData {
  locations: ({
    locode: string;
    name: string;
    countryCode?: string | null;
    countryName?: string | null;
    type: string;
  } & Location_Key)[];
}
```
### Using `SearchLocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, searchLocations, SearchLocationsVariables } from '@dataconnect/generated';

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
import { connectorConfig, searchLocationsRef, SearchLocationsVariables } from '@dataconnect/generated';

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
You can execute the `ListQuotes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listQuotes(vars: ListQuotesVariables, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, ListQuotesVariables>;

interface ListQuotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListQuotesVariables): QueryRef<ListQuotesData, ListQuotesVariables>;
}
export const listQuotesRef: ListQuotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listQuotes(dc: DataConnect, vars: ListQuotesVariables, options?: ExecuteQueryOptions): QueryPromise<ListQuotesData, ListQuotesVariables>;

interface ListQuotesRef {
  ...
  (dc: DataConnect, vars: ListQuotesVariables): QueryRef<ListQuotesData, ListQuotesVariables>;
}
export const listQuotesRef: ListQuotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listQuotesRef:
```typescript
const name = listQuotesRef.operationName;
console.log(name);
```

### Variables
The `ListQuotes` query requires an argument of type `ListQuotesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListQuotesVariables {
  tenantId: string;
  origin?: string | null;
  destination?: string | null;
}
```
### Return Type
Recall that executing the `ListQuotes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListQuotesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListQuotesData {
  quotes: ({
    id: UUIDString;
    tenantId: string;
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
import { connectorConfig, listQuotes, ListQuotesVariables } from '@dataconnect/generated';

// The `ListQuotes` query requires an argument of type `ListQuotesVariables`:
const listQuotesVars: ListQuotesVariables = {
  tenantId: ..., 
  origin: ..., // optional
  destination: ..., // optional
};

// Call the `listQuotes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listQuotes(listQuotesVars);
// Variables can be defined inline as well.
const { data } = await listQuotes({ tenantId: ..., origin: ..., destination: ..., });

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
import { connectorConfig, listQuotesRef, ListQuotesVariables } from '@dataconnect/generated';

// The `ListQuotes` query requires an argument of type `ListQuotesVariables`:
const listQuotesVars: ListQuotesVariables = {
  tenantId: ..., 
  origin: ..., // optional
  destination: ..., // optional
};

// Call the `listQuotesRef()` function to get a reference to the query.
const ref = listQuotesRef(listQuotesVars);
// Variables can be defined inline as well.
const ref = listQuotesRef({ tenantId: ..., origin: ..., destination: ..., });

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
You can execute the `ListShipments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listShipments(vars: ListShipmentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListShipmentsData, ListShipmentsVariables>;

interface ListShipmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListShipmentsVariables): QueryRef<ListShipmentsData, ListShipmentsVariables>;
}
export const listShipmentsRef: ListShipmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listShipments(dc: DataConnect, vars: ListShipmentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListShipmentsData, ListShipmentsVariables>;

interface ListShipmentsRef {
  ...
  (dc: DataConnect, vars: ListShipmentsVariables): QueryRef<ListShipmentsData, ListShipmentsVariables>;
}
export const listShipmentsRef: ListShipmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listShipmentsRef:
```typescript
const name = listShipmentsRef.operationName;
console.log(name);
```

### Variables
The `ListShipments` query requires an argument of type `ListShipmentsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListShipmentsVariables {
  tenantId: string;
}
```
### Return Type
Recall that executing the `ListShipments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListShipmentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
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
import { connectorConfig, listShipments, ListShipmentsVariables } from '@dataconnect/generated';

// The `ListShipments` query requires an argument of type `ListShipmentsVariables`:
const listShipmentsVars: ListShipmentsVariables = {
  tenantId: ..., 
};

// Call the `listShipments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listShipments(listShipmentsVars);
// Variables can be defined inline as well.
const { data } = await listShipments({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listShipments(dataConnect, listShipmentsVars);

console.log(data.shipments);

// Or, you can use the `Promise` API.
listShipments(listShipmentsVars).then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

### Using `ListShipments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listShipmentsRef, ListShipmentsVariables } from '@dataconnect/generated';

// The `ListShipments` query requires an argument of type `ListShipmentsVariables`:
const listShipmentsVars: ListShipmentsVariables = {
  tenantId: ..., 
};

// Call the `listShipmentsRef()` function to get a reference to the query.
const ref = listShipmentsRef(listShipmentsVars);
// Variables can be defined inline as well.
const ref = listShipmentsRef({ tenantId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listShipmentsRef(dataConnect, listShipmentsVars);

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
You can execute the `GetShipmentById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `GetShipmentById` query requires an argument of type `GetShipmentByIdVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetShipmentByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetShipmentById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetShipmentByIdData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
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
import { connectorConfig, getShipmentById, GetShipmentByIdVariables } from '@dataconnect/generated';

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
import { connectorConfig, getShipmentByIdRef, GetShipmentByIdVariables } from '@dataconnect/generated';

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

## GetUserProfile
You can execute the `GetUserProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserProfile(vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProfileRef:
```typescript
const name = getUserProfileRef.operationName;
console.log(name);
```

### Variables
The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserProfileVariables {
  uid: string;
}
```
### Return Type
Recall that executing the `GetUserProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserProfileData {
  user?: {
    role: string;
    tenantId: string;
  };
}
```
### Using `GetUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProfile, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  uid: ..., 
};

// Call the `getUserProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProfile(getUserProfileVars);
// Variables can be defined inline as well.
const { data } = await getUserProfile({ uid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProfile(dataConnect, getUserProfileVars);

console.log(data.user);

// Or, you can use the `Promise` API.
getUserProfile(getUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUserProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProfileRef, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  uid: ..., 
};

// Call the `getUserProfileRef()` function to get a reference to the query.
const ref = getUserProfileRef(getUserProfileVars);
// Variables can be defined inline as well.
const ref = getUserProfileRef({ uid: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProfileRef(dataConnect, getUserProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
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
    displayName?: string | null;
    role: string;
    tenantId: string;
    isActive: boolean;
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

## CreateCrmDeal
You can execute the `CreateCrmDeal` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createCrmDeal(vars: CreateCrmDealVariables): MutationPromise<CreateCrmDealData, CreateCrmDealVariables>;

interface CreateCrmDealRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCrmDealVariables): MutationRef<CreateCrmDealData, CreateCrmDealVariables>;
}
export const createCrmDealRef: CreateCrmDealRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createCrmDeal(dc: DataConnect, vars: CreateCrmDealVariables): MutationPromise<CreateCrmDealData, CreateCrmDealVariables>;

interface CreateCrmDealRef {
  ...
  (dc: DataConnect, vars: CreateCrmDealVariables): MutationRef<CreateCrmDealData, CreateCrmDealVariables>;
}
export const createCrmDealRef: CreateCrmDealRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createCrmDealRef:
```typescript
const name = createCrmDealRef.operationName;
console.log(name);
```

### Variables
The `CreateCrmDeal` mutation requires an argument of type `CreateCrmDealVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateCrmDealVariables {
  tenantId: string;
  title: string;
  customerId: UUIDString;
  estimatedValue?: number | null;
  status: string;
  expectedCloseDate?: DateString | null;
  assignedToUid: string;
}
```
### Return Type
Recall that executing the `CreateCrmDeal` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateCrmDealData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCrmDealData {
  crmDeal_insert: CrmDeal_Key;
}
```
### Using `CreateCrmDeal`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCrmDeal, CreateCrmDealVariables } from '@dataconnect/generated';

// The `CreateCrmDeal` mutation requires an argument of type `CreateCrmDealVariables`:
const createCrmDealVars: CreateCrmDealVariables = {
  tenantId: ..., 
  title: ..., 
  customerId: ..., 
  estimatedValue: ..., // optional
  status: ..., 
  expectedCloseDate: ..., // optional
  assignedToUid: ..., 
};

// Call the `createCrmDeal()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createCrmDeal(createCrmDealVars);
// Variables can be defined inline as well.
const { data } = await createCrmDeal({ tenantId: ..., title: ..., customerId: ..., estimatedValue: ..., status: ..., expectedCloseDate: ..., assignedToUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createCrmDeal(dataConnect, createCrmDealVars);

console.log(data.crmDeal_insert);

// Or, you can use the `Promise` API.
createCrmDeal(createCrmDealVars).then((response) => {
  const data = response.data;
  console.log(data.crmDeal_insert);
});
```

### Using `CreateCrmDeal`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createCrmDealRef, CreateCrmDealVariables } from '@dataconnect/generated';

// The `CreateCrmDeal` mutation requires an argument of type `CreateCrmDealVariables`:
const createCrmDealVars: CreateCrmDealVariables = {
  tenantId: ..., 
  title: ..., 
  customerId: ..., 
  estimatedValue: ..., // optional
  status: ..., 
  expectedCloseDate: ..., // optional
  assignedToUid: ..., 
};

// Call the `createCrmDealRef()` function to get a reference to the mutation.
const ref = createCrmDealRef(createCrmDealVars);
// Variables can be defined inline as well.
const ref = createCrmDealRef({ tenantId: ..., title: ..., customerId: ..., estimatedValue: ..., status: ..., expectedCloseDate: ..., assignedToUid: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createCrmDealRef(dataConnect, createCrmDealVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.crmDeal_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.crmDeal_insert);
});
```

## UpdateCrmDealStatus
You can execute the `UpdateCrmDealStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateCrmDealStatus(vars: UpdateCrmDealStatusVariables): MutationPromise<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;

interface UpdateCrmDealStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCrmDealStatusVariables): MutationRef<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
}
export const updateCrmDealStatusRef: UpdateCrmDealStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateCrmDealStatus(dc: DataConnect, vars: UpdateCrmDealStatusVariables): MutationPromise<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;

interface UpdateCrmDealStatusRef {
  ...
  (dc: DataConnect, vars: UpdateCrmDealStatusVariables): MutationRef<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
}
export const updateCrmDealStatusRef: UpdateCrmDealStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateCrmDealStatusRef:
```typescript
const name = updateCrmDealStatusRef.operationName;
console.log(name);
```

### Variables
The `UpdateCrmDealStatus` mutation requires an argument of type `UpdateCrmDealStatusVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateCrmDealStatusVariables {
  id: UUIDString;
  status: string;
}
```
### Return Type
Recall that executing the `UpdateCrmDealStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateCrmDealStatusData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateCrmDealStatusData {
  crmDeal_update?: CrmDeal_Key | null;
}
```
### Using `UpdateCrmDealStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateCrmDealStatus, UpdateCrmDealStatusVariables } from '@dataconnect/generated';

// The `UpdateCrmDealStatus` mutation requires an argument of type `UpdateCrmDealStatusVariables`:
const updateCrmDealStatusVars: UpdateCrmDealStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateCrmDealStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateCrmDealStatus(updateCrmDealStatusVars);
// Variables can be defined inline as well.
const { data } = await updateCrmDealStatus({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateCrmDealStatus(dataConnect, updateCrmDealStatusVars);

console.log(data.crmDeal_update);

// Or, you can use the `Promise` API.
updateCrmDealStatus(updateCrmDealStatusVars).then((response) => {
  const data = response.data;
  console.log(data.crmDeal_update);
});
```

### Using `UpdateCrmDealStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateCrmDealStatusRef, UpdateCrmDealStatusVariables } from '@dataconnect/generated';

// The `UpdateCrmDealStatus` mutation requires an argument of type `UpdateCrmDealStatusVariables`:
const updateCrmDealStatusVars: UpdateCrmDealStatusVariables = {
  id: ..., 
  status: ..., 
};

// Call the `updateCrmDealStatusRef()` function to get a reference to the mutation.
const ref = updateCrmDealStatusRef(updateCrmDealStatusVars);
// Variables can be defined inline as well.
const ref = updateCrmDealStatusRef({ id: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateCrmDealStatusRef(dataConnect, updateCrmDealStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.crmDeal_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.crmDeal_update);
});
```

## CreateCrmInteraction
You can execute the `CreateCrmInteraction` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createCrmInteraction(vars: CreateCrmInteractionVariables): MutationPromise<CreateCrmInteractionData, CreateCrmInteractionVariables>;

interface CreateCrmInteractionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCrmInteractionVariables): MutationRef<CreateCrmInteractionData, CreateCrmInteractionVariables>;
}
export const createCrmInteractionRef: CreateCrmInteractionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createCrmInteraction(dc: DataConnect, vars: CreateCrmInteractionVariables): MutationPromise<CreateCrmInteractionData, CreateCrmInteractionVariables>;

interface CreateCrmInteractionRef {
  ...
  (dc: DataConnect, vars: CreateCrmInteractionVariables): MutationRef<CreateCrmInteractionData, CreateCrmInteractionVariables>;
}
export const createCrmInteractionRef: CreateCrmInteractionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createCrmInteractionRef:
```typescript
const name = createCrmInteractionRef.operationName;
console.log(name);
```

### Variables
The `CreateCrmInteraction` mutation requires an argument of type `CreateCrmInteractionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateCrmInteractionVariables {
  tenantId: string;
  customerId: UUIDString;
  type: string;
  date: TimestampString;
  notes?: string | null;
  outcome?: string | null;
  createdByUid: string;
}
```
### Return Type
Recall that executing the `CreateCrmInteraction` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateCrmInteractionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCrmInteractionData {
  crmInteraction_insert: CrmInteraction_Key;
}
```
### Using `CreateCrmInteraction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCrmInteraction, CreateCrmInteractionVariables } from '@dataconnect/generated';

// The `CreateCrmInteraction` mutation requires an argument of type `CreateCrmInteractionVariables`:
const createCrmInteractionVars: CreateCrmInteractionVariables = {
  tenantId: ..., 
  customerId: ..., 
  type: ..., 
  date: ..., 
  notes: ..., // optional
  outcome: ..., // optional
  createdByUid: ..., 
};

// Call the `createCrmInteraction()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createCrmInteraction(createCrmInteractionVars);
// Variables can be defined inline as well.
const { data } = await createCrmInteraction({ tenantId: ..., customerId: ..., type: ..., date: ..., notes: ..., outcome: ..., createdByUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createCrmInteraction(dataConnect, createCrmInteractionVars);

console.log(data.crmInteraction_insert);

// Or, you can use the `Promise` API.
createCrmInteraction(createCrmInteractionVars).then((response) => {
  const data = response.data;
  console.log(data.crmInteraction_insert);
});
```

### Using `CreateCrmInteraction`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createCrmInteractionRef, CreateCrmInteractionVariables } from '@dataconnect/generated';

// The `CreateCrmInteraction` mutation requires an argument of type `CreateCrmInteractionVariables`:
const createCrmInteractionVars: CreateCrmInteractionVariables = {
  tenantId: ..., 
  customerId: ..., 
  type: ..., 
  date: ..., 
  notes: ..., // optional
  outcome: ..., // optional
  createdByUid: ..., 
};

// Call the `createCrmInteractionRef()` function to get a reference to the mutation.
const ref = createCrmInteractionRef(createCrmInteractionVars);
// Variables can be defined inline as well.
const ref = createCrmInteractionRef({ tenantId: ..., customerId: ..., type: ..., date: ..., notes: ..., outcome: ..., createdByUid: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createCrmInteractionRef(dataConnect, createCrmInteractionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.crmInteraction_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.crmInteraction_insert);
});
```

## CreateDocumentFromOcr
You can execute the `CreateDocumentFromOcr` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createDocumentFromOcr(vars: CreateDocumentFromOcrVariables): MutationPromise<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;

interface CreateDocumentFromOcrRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDocumentFromOcrVariables): MutationRef<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
}
export const createDocumentFromOcrRef: CreateDocumentFromOcrRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createDocumentFromOcr(dc: DataConnect, vars: CreateDocumentFromOcrVariables): MutationPromise<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;

interface CreateDocumentFromOcrRef {
  ...
  (dc: DataConnect, vars: CreateDocumentFromOcrVariables): MutationRef<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
}
export const createDocumentFromOcrRef: CreateDocumentFromOcrRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createDocumentFromOcrRef:
```typescript
const name = createDocumentFromOcrRef.operationName;
console.log(name);
```

### Variables
The `CreateDocumentFromOcr` mutation requires an argument of type `CreateDocumentFromOcrVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateDocumentFromOcrVariables {
  documentNumber?: string | null;
  documentType: string;
  fileName?: string | null;
  fileUrl: string;
  mimeType?: string | null;
  extractedData?: unknown | null;
}
```
### Return Type
Recall that executing the `CreateDocumentFromOcr` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateDocumentFromOcrData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateDocumentFromOcrData {
  document_insert: Document_Key;
}
```
### Using `CreateDocumentFromOcr`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createDocumentFromOcr, CreateDocumentFromOcrVariables } from '@dataconnect/generated';

// The `CreateDocumentFromOcr` mutation requires an argument of type `CreateDocumentFromOcrVariables`:
const createDocumentFromOcrVars: CreateDocumentFromOcrVariables = {
  documentNumber: ..., // optional
  documentType: ..., 
  fileName: ..., // optional
  fileUrl: ..., 
  mimeType: ..., // optional
  extractedData: ..., // optional
};

// Call the `createDocumentFromOcr()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createDocumentFromOcr(createDocumentFromOcrVars);
// Variables can be defined inline as well.
const { data } = await createDocumentFromOcr({ documentNumber: ..., documentType: ..., fileName: ..., fileUrl: ..., mimeType: ..., extractedData: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createDocumentFromOcr(dataConnect, createDocumentFromOcrVars);

console.log(data.document_insert);

// Or, you can use the `Promise` API.
createDocumentFromOcr(createDocumentFromOcrVars).then((response) => {
  const data = response.data;
  console.log(data.document_insert);
});
```

### Using `CreateDocumentFromOcr`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createDocumentFromOcrRef, CreateDocumentFromOcrVariables } from '@dataconnect/generated';

// The `CreateDocumentFromOcr` mutation requires an argument of type `CreateDocumentFromOcrVariables`:
const createDocumentFromOcrVars: CreateDocumentFromOcrVariables = {
  documentNumber: ..., // optional
  documentType: ..., 
  fileName: ..., // optional
  fileUrl: ..., 
  mimeType: ..., // optional
  extractedData: ..., // optional
};

// Call the `createDocumentFromOcrRef()` function to get a reference to the mutation.
const ref = createDocumentFromOcrRef(createDocumentFromOcrVars);
// Variables can be defined inline as well.
const ref = createDocumentFromOcrRef({ documentNumber: ..., documentType: ..., fileName: ..., fileUrl: ..., mimeType: ..., extractedData: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createDocumentFromOcrRef(dataConnect, createDocumentFromOcrVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.document_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.document_insert);
});
```

## ApproveOcrDocument
You can execute the `ApproveOcrDocument` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
approveOcrDocument(vars: ApproveOcrDocumentVariables): MutationPromise<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;

interface ApproveOcrDocumentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ApproveOcrDocumentVariables): MutationRef<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
}
export const approveOcrDocumentRef: ApproveOcrDocumentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
approveOcrDocument(dc: DataConnect, vars: ApproveOcrDocumentVariables): MutationPromise<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;

interface ApproveOcrDocumentRef {
  ...
  (dc: DataConnect, vars: ApproveOcrDocumentVariables): MutationRef<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
}
export const approveOcrDocumentRef: ApproveOcrDocumentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the approveOcrDocumentRef:
```typescript
const name = approveOcrDocumentRef.operationName;
console.log(name);
```

### Variables
The `ApproveOcrDocument` mutation requires an argument of type `ApproveOcrDocumentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ApproveOcrDocumentVariables {
  id: UUIDString;
  extractedData?: unknown | null;
  shipmentId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `ApproveOcrDocument` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ApproveOcrDocumentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ApproveOcrDocumentData {
  document_update?: Document_Key | null;
}
```
### Using `ApproveOcrDocument`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, approveOcrDocument, ApproveOcrDocumentVariables } from '@dataconnect/generated';

// The `ApproveOcrDocument` mutation requires an argument of type `ApproveOcrDocumentVariables`:
const approveOcrDocumentVars: ApproveOcrDocumentVariables = {
  id: ..., 
  extractedData: ..., // optional
  shipmentId: ..., // optional
};

// Call the `approveOcrDocument()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await approveOcrDocument(approveOcrDocumentVars);
// Variables can be defined inline as well.
const { data } = await approveOcrDocument({ id: ..., extractedData: ..., shipmentId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await approveOcrDocument(dataConnect, approveOcrDocumentVars);

console.log(data.document_update);

// Or, you can use the `Promise` API.
approveOcrDocument(approveOcrDocumentVars).then((response) => {
  const data = response.data;
  console.log(data.document_update);
});
```

### Using `ApproveOcrDocument`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, approveOcrDocumentRef, ApproveOcrDocumentVariables } from '@dataconnect/generated';

// The `ApproveOcrDocument` mutation requires an argument of type `ApproveOcrDocumentVariables`:
const approveOcrDocumentVars: ApproveOcrDocumentVariables = {
  id: ..., 
  extractedData: ..., // optional
  shipmentId: ..., // optional
};

// Call the `approveOcrDocumentRef()` function to get a reference to the mutation.
const ref = approveOcrDocumentRef(approveOcrDocumentVars);
// Variables can be defined inline as well.
const ref = approveOcrDocumentRef({ id: ..., extractedData: ..., shipmentId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = approveOcrDocumentRef(dataConnect, approveOcrDocumentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.document_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.document_update);
});
```

## RejectOcrDocument
You can execute the `RejectOcrDocument` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
rejectOcrDocument(vars: RejectOcrDocumentVariables): MutationPromise<RejectOcrDocumentData, RejectOcrDocumentVariables>;

interface RejectOcrDocumentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: RejectOcrDocumentVariables): MutationRef<RejectOcrDocumentData, RejectOcrDocumentVariables>;
}
export const rejectOcrDocumentRef: RejectOcrDocumentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
rejectOcrDocument(dc: DataConnect, vars: RejectOcrDocumentVariables): MutationPromise<RejectOcrDocumentData, RejectOcrDocumentVariables>;

interface RejectOcrDocumentRef {
  ...
  (dc: DataConnect, vars: RejectOcrDocumentVariables): MutationRef<RejectOcrDocumentData, RejectOcrDocumentVariables>;
}
export const rejectOcrDocumentRef: RejectOcrDocumentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the rejectOcrDocumentRef:
```typescript
const name = rejectOcrDocumentRef.operationName;
console.log(name);
```

### Variables
The `RejectOcrDocument` mutation requires an argument of type `RejectOcrDocumentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface RejectOcrDocumentVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `RejectOcrDocument` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `RejectOcrDocumentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface RejectOcrDocumentData {
  document_update?: Document_Key | null;
}
```
### Using `RejectOcrDocument`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, rejectOcrDocument, RejectOcrDocumentVariables } from '@dataconnect/generated';

// The `RejectOcrDocument` mutation requires an argument of type `RejectOcrDocumentVariables`:
const rejectOcrDocumentVars: RejectOcrDocumentVariables = {
  id: ..., 
};

// Call the `rejectOcrDocument()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await rejectOcrDocument(rejectOcrDocumentVars);
// Variables can be defined inline as well.
const { data } = await rejectOcrDocument({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await rejectOcrDocument(dataConnect, rejectOcrDocumentVars);

console.log(data.document_update);

// Or, you can use the `Promise` API.
rejectOcrDocument(rejectOcrDocumentVars).then((response) => {
  const data = response.data;
  console.log(data.document_update);
});
```

### Using `RejectOcrDocument`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, rejectOcrDocumentRef, RejectOcrDocumentVariables } from '@dataconnect/generated';

// The `RejectOcrDocument` mutation requires an argument of type `RejectOcrDocumentVariables`:
const rejectOcrDocumentVars: RejectOcrDocumentVariables = {
  id: ..., 
};

// Call the `rejectOcrDocumentRef()` function to get a reference to the mutation.
const ref = rejectOcrDocumentRef(rejectOcrDocumentVars);
// Variables can be defined inline as well.
const ref = rejectOcrDocumentRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = rejectOcrDocumentRef(dataConnect, rejectOcrDocumentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.document_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.document_update);
});
```

## UpsertDictionaryTerm
You can execute the `UpsertDictionaryTerm` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertDictionaryTerm(vars: UpsertDictionaryTermVariables): MutationPromise<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;

interface UpsertDictionaryTermRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertDictionaryTermVariables): MutationRef<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
}
export const upsertDictionaryTermRef: UpsertDictionaryTermRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertDictionaryTerm(dc: DataConnect, vars: UpsertDictionaryTermVariables): MutationPromise<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;

interface UpsertDictionaryTermRef {
  ...
  (dc: DataConnect, vars: UpsertDictionaryTermVariables): MutationRef<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
}
export const upsertDictionaryTermRef: UpsertDictionaryTermRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertDictionaryTermRef:
```typescript
const name = upsertDictionaryTermRef.operationName;
console.log(name);
```

### Variables
The `UpsertDictionaryTerm` mutation requires an argument of type `UpsertDictionaryTermVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertDictionaryTermVariables {
  acronym: string;
  category: string;
  meaning: string;
  description?: string | null;
  subCategory?: string | null;
  region?: string | null;
  moduleScope?: string[] | null;
  isActive?: boolean | null;
}
```
### Return Type
Recall that executing the `UpsertDictionaryTerm` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertDictionaryTermData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertDictionaryTermData {
  dictionaryTerm_upsert: DictionaryTerm_Key;
}
```
### Using `UpsertDictionaryTerm`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertDictionaryTerm, UpsertDictionaryTermVariables } from '@dataconnect/generated';

// The `UpsertDictionaryTerm` mutation requires an argument of type `UpsertDictionaryTermVariables`:
const upsertDictionaryTermVars: UpsertDictionaryTermVariables = {
  acronym: ..., 
  category: ..., 
  meaning: ..., 
  description: ..., // optional
  subCategory: ..., // optional
  region: ..., // optional
  moduleScope: ..., // optional
  isActive: ..., // optional
};

// Call the `upsertDictionaryTerm()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertDictionaryTerm(upsertDictionaryTermVars);
// Variables can be defined inline as well.
const { data } = await upsertDictionaryTerm({ acronym: ..., category: ..., meaning: ..., description: ..., subCategory: ..., region: ..., moduleScope: ..., isActive: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertDictionaryTerm(dataConnect, upsertDictionaryTermVars);

console.log(data.dictionaryTerm_upsert);

// Or, you can use the `Promise` API.
upsertDictionaryTerm(upsertDictionaryTermVars).then((response) => {
  const data = response.data;
  console.log(data.dictionaryTerm_upsert);
});
```

### Using `UpsertDictionaryTerm`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertDictionaryTermRef, UpsertDictionaryTermVariables } from '@dataconnect/generated';

// The `UpsertDictionaryTerm` mutation requires an argument of type `UpsertDictionaryTermVariables`:
const upsertDictionaryTermVars: UpsertDictionaryTermVariables = {
  acronym: ..., 
  category: ..., 
  meaning: ..., 
  description: ..., // optional
  subCategory: ..., // optional
  region: ..., // optional
  moduleScope: ..., // optional
  isActive: ..., // optional
};

// Call the `upsertDictionaryTermRef()` function to get a reference to the mutation.
const ref = upsertDictionaryTermRef(upsertDictionaryTermVars);
// Variables can be defined inline as well.
const ref = upsertDictionaryTermRef({ acronym: ..., category: ..., meaning: ..., description: ..., subCategory: ..., region: ..., moduleScope: ..., isActive: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertDictionaryTermRef(dataConnect, upsertDictionaryTermVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.dictionaryTerm_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.dictionaryTerm_upsert);
});
```

## CreateCompany
You can execute the `CreateCompany` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateCompany` mutation requires an argument of type `CreateCompanyVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateCompanyData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCompanyData {
  company_upsert: Company_Key;
}
```
### Using `CreateCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCompany, CreateCompanyVariables } from '@dataconnect/generated';

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
import { connectorConfig, createCompanyRef, CreateCompanyVariables } from '@dataconnect/generated';

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
You can execute the `CreateLocation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateLocation` mutation requires an argument of type `CreateLocationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateLocationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateLocationData {
  location_upsert: Location_Key;
}
```
### Using `CreateLocation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createLocation, CreateLocationVariables } from '@dataconnect/generated';

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
import { connectorConfig, createLocationRef, CreateLocationVariables } from '@dataconnect/generated';

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
You can execute the `CreateQuote` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateQuote` mutation requires an argument of type `CreateQuoteVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateQuoteData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateQuoteData {
  quote_insert: Quote_Key;
}
```
### Using `CreateQuote`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createQuote, CreateQuoteVariables } from '@dataconnect/generated';

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
import { connectorConfig, createQuoteRef, CreateQuoteVariables } from '@dataconnect/generated';

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
You can execute the `CreateMilestone` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateMilestone` mutation requires an argument of type `CreateMilestoneVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateMilestoneData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateMilestoneData {
  milestone_insert: Milestone_Key;
}
```
### Using `CreateMilestone`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createMilestone, CreateMilestoneVariables } from '@dataconnect/generated';

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
import { connectorConfig, createMilestoneRef, CreateMilestoneVariables } from '@dataconnect/generated';

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
You can execute the `CreateHsCode` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateHsCode` mutation requires an argument of type `CreateHsCodeVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateHsCodeData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateHsCodeData {
  hsCode_upsert: HsCode_Key;
}
```
### Using `CreateHsCode`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createHsCode, CreateHsCodeVariables } from '@dataconnect/generated';

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
import { connectorConfig, createHsCodeRef, CreateHsCodeVariables } from '@dataconnect/generated';

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
You can execute the `CreateIncoterm` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateIncoterm` mutation requires an argument of type `CreateIncotermVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateIncotermData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateIncotermData {
  incoterm_upsert: Incoterm_Key;
}
```
### Using `CreateIncoterm`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createIncoterm, CreateIncotermVariables } from '@dataconnect/generated';

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
import { connectorConfig, createIncotermRef, CreateIncotermVariables } from '@dataconnect/generated';

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
You can execute the `CreateVessel` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateVessel` mutation requires an argument of type `CreateVesselVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateVesselData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateVesselData {
  vessel_upsert: Vessel_Key;
}
```
### Using `CreateVessel`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createVessel, CreateVesselVariables } from '@dataconnect/generated';

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
import { connectorConfig, createVesselRef, CreateVesselVariables } from '@dataconnect/generated';

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
You can execute the `CreateSchedule` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `CreateSchedule` mutation requires an argument of type `CreateScheduleVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `CreateScheduleData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateScheduleData {
  schedule_insert: Schedule_Key;
}
```
### Using `CreateSchedule`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createSchedule, CreateScheduleVariables } from '@dataconnect/generated';

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
import { connectorConfig, createScheduleRef, CreateScheduleVariables } from '@dataconnect/generated';

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

## InsertDictionaryTerm
You can execute the `InsertDictionaryTerm` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertDictionaryTerm(vars: InsertDictionaryTermVariables): MutationPromise<InsertDictionaryTermData, InsertDictionaryTermVariables>;

interface InsertDictionaryTermRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertDictionaryTermVariables): MutationRef<InsertDictionaryTermData, InsertDictionaryTermVariables>;
}
export const insertDictionaryTermRef: InsertDictionaryTermRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertDictionaryTerm(dc: DataConnect, vars: InsertDictionaryTermVariables): MutationPromise<InsertDictionaryTermData, InsertDictionaryTermVariables>;

interface InsertDictionaryTermRef {
  ...
  (dc: DataConnect, vars: InsertDictionaryTermVariables): MutationRef<InsertDictionaryTermData, InsertDictionaryTermVariables>;
}
export const insertDictionaryTermRef: InsertDictionaryTermRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertDictionaryTermRef:
```typescript
const name = insertDictionaryTermRef.operationName;
console.log(name);
```

### Variables
The `InsertDictionaryTerm` mutation requires an argument of type `InsertDictionaryTermVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertDictionaryTermVariables {
  acronym: string;
  meaning: string;
  description?: string | null;
  category: string;
  subCategory?: string | null;
  region?: string | null;
  moduleScope?: string[] | null;
}
```
### Return Type
Recall that executing the `InsertDictionaryTerm` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertDictionaryTermData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertDictionaryTermData {
  dictionaryTerm_upsert: DictionaryTerm_Key;
}
```
### Using `InsertDictionaryTerm`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertDictionaryTerm, InsertDictionaryTermVariables } from '@dataconnect/generated';

// The `InsertDictionaryTerm` mutation requires an argument of type `InsertDictionaryTermVariables`:
const insertDictionaryTermVars: InsertDictionaryTermVariables = {
  acronym: ..., 
  meaning: ..., 
  description: ..., // optional
  category: ..., 
  subCategory: ..., // optional
  region: ..., // optional
  moduleScope: ..., // optional
};

// Call the `insertDictionaryTerm()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertDictionaryTerm(insertDictionaryTermVars);
// Variables can be defined inline as well.
const { data } = await insertDictionaryTerm({ acronym: ..., meaning: ..., description: ..., category: ..., subCategory: ..., region: ..., moduleScope: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertDictionaryTerm(dataConnect, insertDictionaryTermVars);

console.log(data.dictionaryTerm_upsert);

// Or, you can use the `Promise` API.
insertDictionaryTerm(insertDictionaryTermVars).then((response) => {
  const data = response.data;
  console.log(data.dictionaryTerm_upsert);
});
```

### Using `InsertDictionaryTerm`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertDictionaryTermRef, InsertDictionaryTermVariables } from '@dataconnect/generated';

// The `InsertDictionaryTerm` mutation requires an argument of type `InsertDictionaryTermVariables`:
const insertDictionaryTermVars: InsertDictionaryTermVariables = {
  acronym: ..., 
  meaning: ..., 
  description: ..., // optional
  category: ..., 
  subCategory: ..., // optional
  region: ..., // optional
  moduleScope: ..., // optional
};

// Call the `insertDictionaryTermRef()` function to get a reference to the mutation.
const ref = insertDictionaryTermRef(insertDictionaryTermVars);
// Variables can be defined inline as well.
const ref = insertDictionaryTermRef({ acronym: ..., meaning: ..., description: ..., category: ..., subCategory: ..., region: ..., moduleScope: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertDictionaryTermRef(dataConnect, insertDictionaryTermVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.dictionaryTerm_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.dictionaryTerm_upsert);
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
import { connectorConfig, createShipmentRef, CreateShipmentVariables } from '@dataconnect/generated';

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
You can execute the `LogShipmentEvent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
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
The `LogShipmentEvent` mutation requires an argument of type `LogShipmentEventVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

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

The `data` property is an object of type `LogShipmentEventData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LogShipmentEventData {
  shipmentEventLog_insert: ShipmentEventLog_Key;
}
```
### Using `LogShipmentEvent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, logShipmentEvent, LogShipmentEventVariables } from '@dataconnect/generated';

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
import { connectorConfig, logShipmentEventRef, LogShipmentEventVariables } from '@dataconnect/generated';

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
  email: string;
  displayName?: string | null;
  tenantId?: string | null;
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
  email: ..., 
  displayName: ..., // optional
  tenantId: ..., // optional
};

// Call the `upsertUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertUser(upsertUserVars);
// Variables can be defined inline as well.
const { data } = await upsertUser({ email: ..., displayName: ..., tenantId: ..., });

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
  email: ..., 
  displayName: ..., // optional
  tenantId: ..., // optional
};

// Call the `upsertUserRef()` function to get a reference to the mutation.
const ref = upsertUserRef(upsertUserVars);
// Variables can be defined inline as well.
const ref = upsertUserRef({ email: ..., displayName: ..., tenantId: ..., });

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
  tenantId?: string | null;
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
  tenantId: ..., // optional
};

// Call the `updateUserRole()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateUserRole(updateUserRoleVars);
// Variables can be defined inline as well.
const { data } = await updateUserRole({ uid: ..., role: ..., tenantId: ..., });

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
  tenantId: ..., // optional
};

// Call the `updateUserRoleRef()` function to get a reference to the mutation.
const ref = updateUserRoleRef(updateUserRoleVars);
// Variables can be defined inline as well.
const ref = updateUserRoleRef({ uid: ..., role: ..., tenantId: ..., });

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

