# Generated React README
This README will guide you through the process of using the generated React SDK package for the connector `atlas`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `JavaScript README`, you can find it at [`dataconnect-generated/README.md`](../README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@dataconnect/generated/react` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#react).

# Table of Contents
- [**Overview**](#generated-react-readme)
- [**TanStack Query Firebase & TanStack React Query**](#tanstack-query-firebase-tanstack-react-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-react-query-packages)
  - [*Configuring TanStack Query*](#configuring-tanstack-query)
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
  - [*CreateShipment*](#createshipment)
  - [*LogShipmentEvent*](#logshipmentevent)
  - [*UpsertUser*](#upsertuser)
  - [*UpdateUserRole*](#updateuserrole)

# TanStack Query Firebase & TanStack React Query
This SDK provides [React](https://react.dev/) hooks generated specific to your application, for the operations found in the connector `atlas`. These hooks are generated using [TanStack Query Firebase](https://react-query-firebase.invertase.dev/) by our partners at Invertase, a library built on top of [TanStack React Query v5](https://tanstack.com/query/v5/docs/framework/react/overview).

***You do not need to be familiar with Tanstack Query or Tanstack Query Firebase to use this SDK.*** However, you may find it useful to learn more about them, as they will empower you as a user of this Generated React SDK.

## Installing TanStack Query Firebase and TanStack React Query Packages
In order to use the React generated SDK, you must install the `TanStack React Query` and `TanStack Query Firebase` packages.
```bash
npm i --save @tanstack/react-query @tanstack-query-firebase/react
```
```bash
npm i --save firebase@latest # Note: React has a peer dependency on ^11.3.0
```

You can also follow the installation instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#tanstack-install), or the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react) and [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/installation).

## Configuring TanStack Query
In order to use the React generated SDK in your application, you must wrap your application's component tree in a `QueryClientProvider` component from TanStack React Query. None of your generated React SDK hooks will work without this provider.

```javascript
import { QueryClientProvider } from '@tanstack/react-query';

// Create a TanStack Query client instance
const queryClient = new QueryClient()

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MyApplication />
    </QueryClientProvider>
  )
}
```

To learn more about `QueryClientProvider`, see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/quick-start) and the [TanStack Query Firebase documentation](https://invertase.docs.page/tanstack-query-firebase/react#usage).

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `atlas`.

You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) using the hooks provided from your generated React SDK.

# Queries

The React generated SDK provides Query hook functions that call and return [`useDataConnectQuery`](https://react-query-firebase.invertase.dev/react/data-connect/querying) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and the most recent data returned by the Query, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/querying).

TanStack React Query caches the results of your Queries, so using the same Query hook function in multiple places in your application allows the entire application to automatically see updates to that Query's data.

Query hooks execute their Queries automatically when called, and periodically refresh, unless you change the `queryOptions` for the Query. To learn how to stop a Query from automatically executing, including how to make a query "lazy", see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

To learn more about TanStack React Query's Queries, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/queries).

## Using Query Hooks
Here's a general overview of how to use the generated Query hooks in your code:

- If the Query has no variables, the Query hook function does not require arguments.
- If the Query has any required variables, the Query hook function will require at least one argument: an object that contains all the required variables for the Query.
- If the Query has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Query's variables are optional, the Query hook function does not require any arguments.
- Query hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Query hooks functions can be called with or without passing in an `options` argument of type `useDataConnectQueryOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/query-options).
  - ***Special case:***  If the Query has all optional variables and you would like to provide an `options` argument to the Query hook function without providing any variables, you must pass `undefined` where you would normally pass the Query's variables, and then may provide the `options` argument.

Below are examples of how to use the `atlas` connector's generated Query hook functions to execute each Query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## ListCustomers
You can execute the `ListCustomers` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListCustomers(dc: DataConnect, vars: ListCustomersVariables, options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, ListCustomersVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListCustomers(vars: ListCustomersVariables, options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, ListCustomersVariables>;
```

### Variables
The `ListCustomers` Query requires an argument of type `ListCustomersVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListCustomersVariables {
  tenantId: string;
}
```
### Return Type
Recall that calling the `ListCustomers` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListCustomers` Query is of type `ListCustomersData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListCustomers`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListCustomersVariables } from '@dataconnect/generated';
import { useListCustomers } from '@dataconnect/generated/react'

export default function ListCustomersComponent() {
  // The `useListCustomers` Query hook requires an argument of type `ListCustomersVariables`:
  const listCustomersVars: ListCustomersVariables = {
    tenantId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListCustomers(listCustomersVars);
  // Variables can be defined inline as well.
  const query = useListCustomers({ tenantId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListCustomers(dataConnect, listCustomersVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListCustomers(listCustomersVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListCustomers(dataConnect, listCustomersVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.companies);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListCrmDeals
You can execute the `ListCrmDeals` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListCrmDeals(dc: DataConnect, vars: ListCrmDealsVariables, options?: useDataConnectQueryOptions<ListCrmDealsData>): UseDataConnectQueryResult<ListCrmDealsData, ListCrmDealsVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListCrmDeals(vars: ListCrmDealsVariables, options?: useDataConnectQueryOptions<ListCrmDealsData>): UseDataConnectQueryResult<ListCrmDealsData, ListCrmDealsVariables>;
```

### Variables
The `ListCrmDeals` Query requires an argument of type `ListCrmDealsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListCrmDealsVariables {
  tenantId: string;
}
```
### Return Type
Recall that calling the `ListCrmDeals` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListCrmDeals` Query is of type `ListCrmDealsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListCrmDeals`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListCrmDealsVariables } from '@dataconnect/generated';
import { useListCrmDeals } from '@dataconnect/generated/react'

export default function ListCrmDealsComponent() {
  // The `useListCrmDeals` Query hook requires an argument of type `ListCrmDealsVariables`:
  const listCrmDealsVars: ListCrmDealsVariables = {
    tenantId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListCrmDeals(listCrmDealsVars);
  // Variables can be defined inline as well.
  const query = useListCrmDeals({ tenantId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListCrmDeals(dataConnect, listCrmDealsVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListCrmDeals(listCrmDealsVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListCrmDeals(dataConnect, listCrmDealsVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.crmDeals);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListCrmInteractions
You can execute the `ListCrmInteractions` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListCrmInteractions(dc: DataConnect, vars: ListCrmInteractionsVariables, options?: useDataConnectQueryOptions<ListCrmInteractionsData>): UseDataConnectQueryResult<ListCrmInteractionsData, ListCrmInteractionsVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListCrmInteractions(vars: ListCrmInteractionsVariables, options?: useDataConnectQueryOptions<ListCrmInteractionsData>): UseDataConnectQueryResult<ListCrmInteractionsData, ListCrmInteractionsVariables>;
```

### Variables
The `ListCrmInteractions` Query requires an argument of type `ListCrmInteractionsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListCrmInteractionsVariables {
  tenantId: string;
  customerId: UUIDString;
}
```
### Return Type
Recall that calling the `ListCrmInteractions` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListCrmInteractions` Query is of type `ListCrmInteractionsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListCrmInteractions`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListCrmInteractionsVariables } from '@dataconnect/generated';
import { useListCrmInteractions } from '@dataconnect/generated/react'

export default function ListCrmInteractionsComponent() {
  // The `useListCrmInteractions` Query hook requires an argument of type `ListCrmInteractionsVariables`:
  const listCrmInteractionsVars: ListCrmInteractionsVariables = {
    tenantId: ..., 
    customerId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListCrmInteractions(listCrmInteractionsVars);
  // Variables can be defined inline as well.
  const query = useListCrmInteractions({ tenantId: ..., customerId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListCrmInteractions(dataConnect, listCrmInteractionsVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListCrmInteractions(listCrmInteractionsVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListCrmInteractions(dataConnect, listCrmInteractionsVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.crmInteractions);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListPendingOcrDocuments
You can execute the `ListPendingOcrDocuments` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListPendingOcrDocuments(dc: DataConnect, options?: useDataConnectQueryOptions<ListPendingOcrDocumentsData>): UseDataConnectQueryResult<ListPendingOcrDocumentsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListPendingOcrDocuments(options?: useDataConnectQueryOptions<ListPendingOcrDocumentsData>): UseDataConnectQueryResult<ListPendingOcrDocumentsData, undefined>;
```

### Variables
The `ListPendingOcrDocuments` Query has no variables.
### Return Type
Recall that calling the `ListPendingOcrDocuments` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListPendingOcrDocuments` Query is of type `ListPendingOcrDocumentsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListPendingOcrDocuments`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListPendingOcrDocuments } from '@dataconnect/generated/react'

export default function ListPendingOcrDocumentsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListPendingOcrDocuments();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListPendingOcrDocuments(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListPendingOcrDocuments(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListPendingOcrDocuments(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.documents);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListIncoterms
You can execute the `ListIncoterms` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListIncoterms(dc: DataConnect, options?: useDataConnectQueryOptions<ListIncotermsData>): UseDataConnectQueryResult<ListIncotermsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListIncoterms(options?: useDataConnectQueryOptions<ListIncotermsData>): UseDataConnectQueryResult<ListIncotermsData, undefined>;
```

### Variables
The `ListIncoterms` Query has no variables.
### Return Type
Recall that calling the `ListIncoterms` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListIncoterms` Query is of type `ListIncotermsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListIncoterms`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListIncoterms } from '@dataconnect/generated/react'

export default function ListIncotermsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListIncoterms();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListIncoterms(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListIncoterms(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListIncoterms(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.incoterms);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListHsCodes
You can execute the `ListHsCodes` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListHsCodes(dc: DataConnect, options?: useDataConnectQueryOptions<ListHsCodesData>): UseDataConnectQueryResult<ListHsCodesData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListHsCodes(options?: useDataConnectQueryOptions<ListHsCodesData>): UseDataConnectQueryResult<ListHsCodesData, undefined>;
```

### Variables
The `ListHsCodes` Query has no variables.
### Return Type
Recall that calling the `ListHsCodes` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListHsCodes` Query is of type `ListHsCodesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListHsCodes`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListHsCodes } from '@dataconnect/generated/react'

export default function ListHsCodesComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListHsCodes();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListHsCodes(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListHsCodes(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListHsCodes(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.hsCodes);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListVessels
You can execute the `ListVessels` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListVessels(dc: DataConnect, options?: useDataConnectQueryOptions<ListVesselsData>): UseDataConnectQueryResult<ListVesselsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListVessels(options?: useDataConnectQueryOptions<ListVesselsData>): UseDataConnectQueryResult<ListVesselsData, undefined>;
```

### Variables
The `ListVessels` Query has no variables.
### Return Type
Recall that calling the `ListVessels` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListVessels` Query is of type `ListVesselsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListVessels`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListVessels } from '@dataconnect/generated/react'

export default function ListVesselsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListVessels();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListVessels(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListVessels(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListVessels(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.vessels);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListSchedules
You can execute the `ListSchedules` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListSchedules(dc: DataConnect, vars: ListSchedulesVariables, options?: useDataConnectQueryOptions<ListSchedulesData>): UseDataConnectQueryResult<ListSchedulesData, ListSchedulesVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListSchedules(vars: ListSchedulesVariables, options?: useDataConnectQueryOptions<ListSchedulesData>): UseDataConnectQueryResult<ListSchedulesData, ListSchedulesVariables>;
```

### Variables
The `ListSchedules` Query requires an argument of type `ListSchedulesVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListSchedulesVariables {
  tenantId: string;
}
```
### Return Type
Recall that calling the `ListSchedules` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListSchedules` Query is of type `ListSchedulesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListSchedules`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListSchedulesVariables } from '@dataconnect/generated';
import { useListSchedules } from '@dataconnect/generated/react'

export default function ListSchedulesComponent() {
  // The `useListSchedules` Query hook requires an argument of type `ListSchedulesVariables`:
  const listSchedulesVars: ListSchedulesVariables = {
    tenantId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListSchedules(listSchedulesVars);
  // Variables can be defined inline as well.
  const query = useListSchedules({ tenantId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListSchedules(dataConnect, listSchedulesVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListSchedules(listSchedulesVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListSchedules(dataConnect, listSchedulesVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.schedules);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListDictionaryTerms
You can execute the `ListDictionaryTerms` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListDictionaryTerms(dc: DataConnect, options?: useDataConnectQueryOptions<ListDictionaryTermsData>): UseDataConnectQueryResult<ListDictionaryTermsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListDictionaryTerms(options?: useDataConnectQueryOptions<ListDictionaryTermsData>): UseDataConnectQueryResult<ListDictionaryTermsData, undefined>;
```

### Variables
The `ListDictionaryTerms` Query has no variables.
### Return Type
Recall that calling the `ListDictionaryTerms` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListDictionaryTerms` Query is of type `ListDictionaryTermsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListDictionaryTerms`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListDictionaryTerms } from '@dataconnect/generated/react'

export default function ListDictionaryTermsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListDictionaryTerms();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListDictionaryTerms(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListDictionaryTerms(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListDictionaryTerms(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.dictionaryTerms);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListCarriers
You can execute the `ListCarriers` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListCarriers(dc: DataConnect, vars: ListCarriersVariables, options?: useDataConnectQueryOptions<ListCarriersData>): UseDataConnectQueryResult<ListCarriersData, ListCarriersVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListCarriers(vars: ListCarriersVariables, options?: useDataConnectQueryOptions<ListCarriersData>): UseDataConnectQueryResult<ListCarriersData, ListCarriersVariables>;
```

### Variables
The `ListCarriers` Query requires an argument of type `ListCarriersVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListCarriersVariables {
  tenantId: string;
}
```
### Return Type
Recall that calling the `ListCarriers` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListCarriers` Query is of type `ListCarriersData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListCarriers`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListCarriersVariables } from '@dataconnect/generated';
import { useListCarriers } from '@dataconnect/generated/react'

export default function ListCarriersComponent() {
  // The `useListCarriers` Query hook requires an argument of type `ListCarriersVariables`:
  const listCarriersVars: ListCarriersVariables = {
    tenantId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListCarriers(listCarriersVars);
  // Variables can be defined inline as well.
  const query = useListCarriers({ tenantId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListCarriers(dataConnect, listCarriersVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListCarriers(listCarriersVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListCarriers(dataConnect, listCarriersVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.companies);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListHauliers
You can execute the `ListHauliers` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListHauliers(dc: DataConnect, vars: ListHauliersVariables, options?: useDataConnectQueryOptions<ListHauliersData>): UseDataConnectQueryResult<ListHauliersData, ListHauliersVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListHauliers(vars: ListHauliersVariables, options?: useDataConnectQueryOptions<ListHauliersData>): UseDataConnectQueryResult<ListHauliersData, ListHauliersVariables>;
```

### Variables
The `ListHauliers` Query requires an argument of type `ListHauliersVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListHauliersVariables {
  tenantId: string;
}
```
### Return Type
Recall that calling the `ListHauliers` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListHauliers` Query is of type `ListHauliersData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListHauliers`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListHauliersVariables } from '@dataconnect/generated';
import { useListHauliers } from '@dataconnect/generated/react'

export default function ListHauliersComponent() {
  // The `useListHauliers` Query hook requires an argument of type `ListHauliersVariables`:
  const listHauliersVars: ListHauliersVariables = {
    tenantId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListHauliers(listHauliersVars);
  // Variables can be defined inline as well.
  const query = useListHauliers({ tenantId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListHauliers(dataConnect, listHauliersVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListHauliers(listHauliersVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListHauliers(dataConnect, listHauliersVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.companies);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListAgents
You can execute the `ListAgents` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListAgents(dc: DataConnect, vars: ListAgentsVariables, options?: useDataConnectQueryOptions<ListAgentsData>): UseDataConnectQueryResult<ListAgentsData, ListAgentsVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListAgents(vars: ListAgentsVariables, options?: useDataConnectQueryOptions<ListAgentsData>): UseDataConnectQueryResult<ListAgentsData, ListAgentsVariables>;
```

### Variables
The `ListAgents` Query requires an argument of type `ListAgentsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListAgentsVariables {
  tenantId: string;
}
```
### Return Type
Recall that calling the `ListAgents` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListAgents` Query is of type `ListAgentsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListAgents`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListAgentsVariables } from '@dataconnect/generated';
import { useListAgents } from '@dataconnect/generated/react'

export default function ListAgentsComponent() {
  // The `useListAgents` Query hook requires an argument of type `ListAgentsVariables`:
  const listAgentsVars: ListAgentsVariables = {
    tenantId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListAgents(listAgentsVars);
  // Variables can be defined inline as well.
  const query = useListAgents({ tenantId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListAgents(dataConnect, listAgentsVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListAgents(listAgentsVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListAgents(dataConnect, listAgentsVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.companies);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListCompanies
You can execute the `ListCompanies` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListCompanies(dc: DataConnect, options?: useDataConnectQueryOptions<ListCompaniesData>): UseDataConnectQueryResult<ListCompaniesData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListCompanies(options?: useDataConnectQueryOptions<ListCompaniesData>): UseDataConnectQueryResult<ListCompaniesData, undefined>;
```

### Variables
The `ListCompanies` Query has no variables.
### Return Type
Recall that calling the `ListCompanies` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListCompanies` Query is of type `ListCompaniesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListCompaniesData {
  companies: ({
    id: UUIDString;
    name: string;
    entityType: string;
    countryCode?: string | null;
  } & Company_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListCompanies`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListCompanies } from '@dataconnect/generated/react'

export default function ListCompaniesComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListCompanies();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListCompanies(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListCompanies(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListCompanies(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.companies);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## SearchLocations
You can execute the `SearchLocations` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useSearchLocations(dc: DataConnect, vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useSearchLocations(vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;
```

### Variables
The `SearchLocations` Query requires an argument of type `SearchLocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface SearchLocationsVariables {
  query: string;
}
```
### Return Type
Recall that calling the `SearchLocations` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `SearchLocations` Query is of type `SearchLocationsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `SearchLocations`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, SearchLocationsVariables } from '@dataconnect/generated';
import { useSearchLocations } from '@dataconnect/generated/react'

export default function SearchLocationsComponent() {
  // The `useSearchLocations` Query hook requires an argument of type `SearchLocationsVariables`:
  const searchLocationsVars: SearchLocationsVariables = {
    query: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useSearchLocations(searchLocationsVars);
  // Variables can be defined inline as well.
  const query = useSearchLocations({ query: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useSearchLocations(dataConnect, searchLocationsVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useSearchLocations(searchLocationsVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useSearchLocations(dataConnect, searchLocationsVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.locations);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListQuotes
You can execute the `ListQuotes` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListQuotes(dc: DataConnect, vars: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListQuotes(vars: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;
```

### Variables
The `ListQuotes` Query requires an argument of type `ListQuotesVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListQuotesVariables {
  tenantId: string;
  origin?: string | null;
  destination?: string | null;
}
```
### Return Type
Recall that calling the `ListQuotes` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListQuotes` Query is of type `ListQuotesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListQuotes`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListQuotesVariables } from '@dataconnect/generated';
import { useListQuotes } from '@dataconnect/generated/react'

export default function ListQuotesComponent() {
  // The `useListQuotes` Query hook requires an argument of type `ListQuotesVariables`:
  const listQuotesVars: ListQuotesVariables = {
    tenantId: ..., 
    origin: ..., // optional
    destination: ..., // optional
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListQuotes(listQuotesVars);
  // Variables can be defined inline as well.
  const query = useListQuotes({ tenantId: ..., origin: ..., destination: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListQuotes(dataConnect, listQuotesVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListQuotes(listQuotesVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListQuotes(dataConnect, listQuotesVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.quotes);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListShipments
You can execute the `ListShipments` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListShipments(dc: DataConnect, vars: ListShipmentsVariables, options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, ListShipmentsVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListShipments(vars: ListShipmentsVariables, options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, ListShipmentsVariables>;
```

### Variables
The `ListShipments` Query requires an argument of type `ListShipmentsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListShipmentsVariables {
  tenantId: string;
}
```
### Return Type
Recall that calling the `ListShipments` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListShipments` Query is of type `ListShipmentsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListShipments`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListShipmentsVariables } from '@dataconnect/generated';
import { useListShipments } from '@dataconnect/generated/react'

export default function ListShipmentsComponent() {
  // The `useListShipments` Query hook requires an argument of type `ListShipmentsVariables`:
  const listShipmentsVars: ListShipmentsVariables = {
    tenantId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListShipments(listShipmentsVars);
  // Variables can be defined inline as well.
  const query = useListShipments({ tenantId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListShipments(dataConnect, listShipmentsVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListShipments(listShipmentsVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListShipments(dataConnect, listShipmentsVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.shipments);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetShipmentById
You can execute the `GetShipmentById` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetShipmentById(dc: DataConnect, vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetShipmentById(vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;
```

### Variables
The `GetShipmentById` Query requires an argument of type `GetShipmentByIdVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetShipmentByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetShipmentById` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetShipmentById` Query is of type `GetShipmentByIdData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetShipmentById`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetShipmentByIdVariables } from '@dataconnect/generated';
import { useGetShipmentById } from '@dataconnect/generated/react'

export default function GetShipmentByIdComponent() {
  // The `useGetShipmentById` Query hook requires an argument of type `GetShipmentByIdVariables`:
  const getShipmentByIdVars: GetShipmentByIdVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetShipmentById(getShipmentByIdVars);
  // Variables can be defined inline as well.
  const query = useGetShipmentById({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetShipmentById(dataConnect, getShipmentByIdVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetShipmentById(getShipmentByIdVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetShipmentById(dataConnect, getShipmentByIdVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.shipment);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetUserProfile
You can execute the `GetUserProfile` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetUserProfile(vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
```

### Variables
The `GetUserProfile` Query requires an argument of type `GetUserProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetUserProfileVariables {
  uid: string;
}
```
### Return Type
Recall that calling the `GetUserProfile` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetUserProfile` Query is of type `GetUserProfileData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetUserProfileData {
  user?: {
    role: string;
    tenantId: string;
  };
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetUserProfile`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetUserProfileVariables } from '@dataconnect/generated';
import { useGetUserProfile } from '@dataconnect/generated/react'

export default function GetUserProfileComponent() {
  // The `useGetUserProfile` Query hook requires an argument of type `GetUserProfileVariables`:
  const getUserProfileVars: GetUserProfileVariables = {
    uid: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetUserProfile(getUserProfileVars);
  // Variables can be defined inline as well.
  const query = useGetUserProfile({ uid: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetUserProfile(dataConnect, getUserProfileVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetUserProfile(getUserProfileVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetUserProfile(dataConnect, getUserProfileVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.user);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAllUsers
You can execute the `GetAllUsers` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetAllUsers(dc: DataConnect, options?: useDataConnectQueryOptions<GetAllUsersData>): UseDataConnectQueryResult<GetAllUsersData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAllUsers(options?: useDataConnectQueryOptions<GetAllUsersData>): UseDataConnectQueryResult<GetAllUsersData, undefined>;
```

### Variables
The `GetAllUsers` Query has no variables.
### Return Type
Recall that calling the `GetAllUsers` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAllUsers` Query is of type `GetAllUsersData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAllUsers`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useGetAllUsers } from '@dataconnect/generated/react'

export default function GetAllUsersComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAllUsers();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAllUsers(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAllUsers(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAllUsers(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.users);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

# Mutations

The React generated SDK provides Mutations hook functions that call and return [`useDataConnectMutation`](https://react-query-firebase.invertase.dev/react/data-connect/mutations) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, and the most recent data returned by the Mutation, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/mutations).

Mutation hooks do not execute their Mutations automatically when called. Rather, after calling the Mutation hook function and getting a `UseMutationResult` object, you must call the `UseMutationResult.mutate()` function to execute the Mutation.

To learn more about TanStack React Query's Mutations, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations).

## Using Mutation Hooks
Here's a general overview of how to use the generated Mutation hooks in your code:

- Mutation hook functions are not called with the arguments to the Mutation. Instead, arguments are passed to `UseMutationResult.mutate()`.
- If the Mutation has no variables, the `mutate()` function does not require arguments.
- If the Mutation has any required variables, the `mutate()` function will require at least one argument: an object that contains all the required variables for the Mutation.
- If the Mutation has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Mutation's variables are optional, the Mutation hook function does not require any arguments.
- Mutation hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Mutation hooks also accept an `options` argument of type `useDataConnectMutationOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-side-effects).
  - `UseMutationResult.mutate()` also accepts an `options` argument of type `useDataConnectMutationOptions`.
  - ***Special case:*** If the Mutation has no arguments (or all optional arguments and you wish to provide none), and you want to pass `options` to `UseMutationResult.mutate()`, you must pass `undefined` where you would normally pass the Mutation's arguments, and then may provide the options argument.

Below are examples of how to use the `atlas` connector's generated Mutation hook functions to execute each Mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## CreateCrmDeal
You can execute the `CreateCrmDeal` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateCrmDeal(options?: useDataConnectMutationOptions<CreateCrmDealData, FirebaseError, CreateCrmDealVariables>): UseDataConnectMutationResult<CreateCrmDealData, CreateCrmDealVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateCrmDeal(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCrmDealData, FirebaseError, CreateCrmDealVariables>): UseDataConnectMutationResult<CreateCrmDealData, CreateCrmDealVariables>;
```

### Variables
The `CreateCrmDeal` Mutation requires an argument of type `CreateCrmDealVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateCrmDeal` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateCrmDeal` Mutation is of type `CreateCrmDealData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateCrmDealData {
  crmDeal_insert: CrmDeal_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateCrmDeal`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateCrmDealVariables } from '@dataconnect/generated';
import { useCreateCrmDeal } from '@dataconnect/generated/react'

export default function CreateCrmDealComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateCrmDeal();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateCrmDeal(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCrmDeal(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCrmDeal(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateCrmDeal` Mutation requires an argument of type `CreateCrmDealVariables`:
  const createCrmDealVars: CreateCrmDealVariables = {
    tenantId: ..., 
    title: ..., 
    customerId: ..., 
    estimatedValue: ..., // optional
    status: ..., 
    expectedCloseDate: ..., // optional
    assignedToUid: ..., 
  };
  mutation.mutate(createCrmDealVars);
  // Variables can be defined inline as well.
  mutation.mutate({ tenantId: ..., title: ..., customerId: ..., estimatedValue: ..., status: ..., expectedCloseDate: ..., assignedToUid: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createCrmDealVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.crmDeal_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateCrmDealStatus
You can execute the `UpdateCrmDealStatus` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateCrmDealStatus(options?: useDataConnectMutationOptions<UpdateCrmDealStatusData, FirebaseError, UpdateCrmDealStatusVariables>): UseDataConnectMutationResult<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateCrmDealStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateCrmDealStatusData, FirebaseError, UpdateCrmDealStatusVariables>): UseDataConnectMutationResult<UpdateCrmDealStatusData, UpdateCrmDealStatusVariables>;
```

### Variables
The `UpdateCrmDealStatus` Mutation requires an argument of type `UpdateCrmDealStatusVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateCrmDealStatusVariables {
  id: UUIDString;
  status: string;
}
```
### Return Type
Recall that calling the `UpdateCrmDealStatus` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateCrmDealStatus` Mutation is of type `UpdateCrmDealStatusData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateCrmDealStatusData {
  crmDeal_update?: CrmDeal_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateCrmDealStatus`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateCrmDealStatusVariables } from '@dataconnect/generated';
import { useUpdateCrmDealStatus } from '@dataconnect/generated/react'

export default function UpdateCrmDealStatusComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateCrmDealStatus();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateCrmDealStatus(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateCrmDealStatus(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateCrmDealStatus(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateCrmDealStatus` Mutation requires an argument of type `UpdateCrmDealStatusVariables`:
  const updateCrmDealStatusVars: UpdateCrmDealStatusVariables = {
    id: ..., 
    status: ..., 
  };
  mutation.mutate(updateCrmDealStatusVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., status: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateCrmDealStatusVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.crmDeal_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateCrmInteraction
You can execute the `CreateCrmInteraction` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateCrmInteraction(options?: useDataConnectMutationOptions<CreateCrmInteractionData, FirebaseError, CreateCrmInteractionVariables>): UseDataConnectMutationResult<CreateCrmInteractionData, CreateCrmInteractionVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateCrmInteraction(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCrmInteractionData, FirebaseError, CreateCrmInteractionVariables>): UseDataConnectMutationResult<CreateCrmInteractionData, CreateCrmInteractionVariables>;
```

### Variables
The `CreateCrmInteraction` Mutation requires an argument of type `CreateCrmInteractionVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateCrmInteraction` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateCrmInteraction` Mutation is of type `CreateCrmInteractionData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateCrmInteractionData {
  crmInteraction_insert: CrmInteraction_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateCrmInteraction`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateCrmInteractionVariables } from '@dataconnect/generated';
import { useCreateCrmInteraction } from '@dataconnect/generated/react'

export default function CreateCrmInteractionComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateCrmInteraction();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateCrmInteraction(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCrmInteraction(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCrmInteraction(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateCrmInteraction` Mutation requires an argument of type `CreateCrmInteractionVariables`:
  const createCrmInteractionVars: CreateCrmInteractionVariables = {
    tenantId: ..., 
    customerId: ..., 
    type: ..., 
    date: ..., 
    notes: ..., // optional
    outcome: ..., // optional
    createdByUid: ..., 
  };
  mutation.mutate(createCrmInteractionVars);
  // Variables can be defined inline as well.
  mutation.mutate({ tenantId: ..., customerId: ..., type: ..., date: ..., notes: ..., outcome: ..., createdByUid: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createCrmInteractionVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.crmInteraction_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateDocumentFromOcr
You can execute the `CreateDocumentFromOcr` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateDocumentFromOcr(options?: useDataConnectMutationOptions<CreateDocumentFromOcrData, FirebaseError, CreateDocumentFromOcrVariables>): UseDataConnectMutationResult<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateDocumentFromOcr(dc: DataConnect, options?: useDataConnectMutationOptions<CreateDocumentFromOcrData, FirebaseError, CreateDocumentFromOcrVariables>): UseDataConnectMutationResult<CreateDocumentFromOcrData, CreateDocumentFromOcrVariables>;
```

### Variables
The `CreateDocumentFromOcr` Mutation requires an argument of type `CreateDocumentFromOcrVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateDocumentFromOcr` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateDocumentFromOcr` Mutation is of type `CreateDocumentFromOcrData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateDocumentFromOcrData {
  document_insert: Document_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateDocumentFromOcr`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateDocumentFromOcrVariables } from '@dataconnect/generated';
import { useCreateDocumentFromOcr } from '@dataconnect/generated/react'

export default function CreateDocumentFromOcrComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateDocumentFromOcr();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateDocumentFromOcr(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateDocumentFromOcr(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateDocumentFromOcr(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateDocumentFromOcr` Mutation requires an argument of type `CreateDocumentFromOcrVariables`:
  const createDocumentFromOcrVars: CreateDocumentFromOcrVariables = {
    documentNumber: ..., // optional
    documentType: ..., 
    fileName: ..., // optional
    fileUrl: ..., 
    mimeType: ..., // optional
    extractedData: ..., // optional
  };
  mutation.mutate(createDocumentFromOcrVars);
  // Variables can be defined inline as well.
  mutation.mutate({ documentNumber: ..., documentType: ..., fileName: ..., fileUrl: ..., mimeType: ..., extractedData: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createDocumentFromOcrVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.document_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ApproveOcrDocument
You can execute the `ApproveOcrDocument` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useApproveOcrDocument(options?: useDataConnectMutationOptions<ApproveOcrDocumentData, FirebaseError, ApproveOcrDocumentVariables>): UseDataConnectMutationResult<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useApproveOcrDocument(dc: DataConnect, options?: useDataConnectMutationOptions<ApproveOcrDocumentData, FirebaseError, ApproveOcrDocumentVariables>): UseDataConnectMutationResult<ApproveOcrDocumentData, ApproveOcrDocumentVariables>;
```

### Variables
The `ApproveOcrDocument` Mutation requires an argument of type `ApproveOcrDocumentVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ApproveOcrDocumentVariables {
  id: UUIDString;
  extractedData?: unknown | null;
  shipmentId?: UUIDString | null;
}
```
### Return Type
Recall that calling the `ApproveOcrDocument` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `ApproveOcrDocument` Mutation is of type `ApproveOcrDocumentData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ApproveOcrDocumentData {
  document_update?: Document_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `ApproveOcrDocument`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ApproveOcrDocumentVariables } from '@dataconnect/generated';
import { useApproveOcrDocument } from '@dataconnect/generated/react'

export default function ApproveOcrDocumentComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useApproveOcrDocument();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useApproveOcrDocument(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useApproveOcrDocument(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useApproveOcrDocument(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useApproveOcrDocument` Mutation requires an argument of type `ApproveOcrDocumentVariables`:
  const approveOcrDocumentVars: ApproveOcrDocumentVariables = {
    id: ..., 
    extractedData: ..., // optional
    shipmentId: ..., // optional
  };
  mutation.mutate(approveOcrDocumentVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., extractedData: ..., shipmentId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(approveOcrDocumentVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.document_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## RejectOcrDocument
You can execute the `RejectOcrDocument` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useRejectOcrDocument(options?: useDataConnectMutationOptions<RejectOcrDocumentData, FirebaseError, RejectOcrDocumentVariables>): UseDataConnectMutationResult<RejectOcrDocumentData, RejectOcrDocumentVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useRejectOcrDocument(dc: DataConnect, options?: useDataConnectMutationOptions<RejectOcrDocumentData, FirebaseError, RejectOcrDocumentVariables>): UseDataConnectMutationResult<RejectOcrDocumentData, RejectOcrDocumentVariables>;
```

### Variables
The `RejectOcrDocument` Mutation requires an argument of type `RejectOcrDocumentVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface RejectOcrDocumentVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `RejectOcrDocument` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `RejectOcrDocument` Mutation is of type `RejectOcrDocumentData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface RejectOcrDocumentData {
  document_update?: Document_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `RejectOcrDocument`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, RejectOcrDocumentVariables } from '@dataconnect/generated';
import { useRejectOcrDocument } from '@dataconnect/generated/react'

export default function RejectOcrDocumentComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useRejectOcrDocument();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useRejectOcrDocument(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useRejectOcrDocument(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useRejectOcrDocument(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useRejectOcrDocument` Mutation requires an argument of type `RejectOcrDocumentVariables`:
  const rejectOcrDocumentVars: RejectOcrDocumentVariables = {
    id: ..., 
  };
  mutation.mutate(rejectOcrDocumentVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(rejectOcrDocumentVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.document_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpsertDictionaryTerm
You can execute the `UpsertDictionaryTerm` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useUpsertDictionaryTerm(options?: useDataConnectMutationOptions<UpsertDictionaryTermData, FirebaseError, UpsertDictionaryTermVariables>): UseDataConnectMutationResult<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpsertDictionaryTerm(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertDictionaryTermData, FirebaseError, UpsertDictionaryTermVariables>): UseDataConnectMutationResult<UpsertDictionaryTermData, UpsertDictionaryTermVariables>;
```

### Variables
The `UpsertDictionaryTerm` Mutation requires an argument of type `UpsertDictionaryTermVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `UpsertDictionaryTerm` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpsertDictionaryTerm` Mutation is of type `UpsertDictionaryTermData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpsertDictionaryTermData {
  dictionaryTerm_upsert: DictionaryTerm_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpsertDictionaryTerm`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpsertDictionaryTermVariables } from '@dataconnect/generated';
import { useUpsertDictionaryTerm } from '@dataconnect/generated/react'

export default function UpsertDictionaryTermComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpsertDictionaryTerm();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpsertDictionaryTerm(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpsertDictionaryTerm(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpsertDictionaryTerm(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpsertDictionaryTerm` Mutation requires an argument of type `UpsertDictionaryTermVariables`:
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
  mutation.mutate(upsertDictionaryTermVars);
  // Variables can be defined inline as well.
  mutation.mutate({ acronym: ..., category: ..., meaning: ..., description: ..., subCategory: ..., region: ..., moduleScope: ..., isActive: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(upsertDictionaryTermVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.dictionaryTerm_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateCompany
You can execute the `CreateCompany` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateCompany(options?: useDataConnectMutationOptions<CreateCompanyData, FirebaseError, CreateCompanyVariables>): UseDataConnectMutationResult<CreateCompanyData, CreateCompanyVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateCompany(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCompanyData, FirebaseError, CreateCompanyVariables>): UseDataConnectMutationResult<CreateCompanyData, CreateCompanyVariables>;
```

### Variables
The `CreateCompany` Mutation requires an argument of type `CreateCompanyVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateCompany` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateCompany` Mutation is of type `CreateCompanyData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateCompanyData {
  company_upsert: Company_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateCompany`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateCompanyVariables } from '@dataconnect/generated';
import { useCreateCompany } from '@dataconnect/generated/react'

export default function CreateCompanyComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateCompany();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateCompany(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCompany(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateCompany(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateCompany` Mutation requires an argument of type `CreateCompanyVariables`:
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
  mutation.mutate(createCompanyVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., name: ..., entityType: ..., countryCode: ..., email: ..., phoneNumber: ..., address: ..., city: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createCompanyVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.company_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateLocation
You can execute the `CreateLocation` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateLocation(options?: useDataConnectMutationOptions<CreateLocationData, FirebaseError, CreateLocationVariables>): UseDataConnectMutationResult<CreateLocationData, CreateLocationVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateLocation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateLocationData, FirebaseError, CreateLocationVariables>): UseDataConnectMutationResult<CreateLocationData, CreateLocationVariables>;
```

### Variables
The `CreateLocation` Mutation requires an argument of type `CreateLocationVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateLocation` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateLocation` Mutation is of type `CreateLocationData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateLocationData {
  location_upsert: Location_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateLocation`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateLocationVariables } from '@dataconnect/generated';
import { useCreateLocation } from '@dataconnect/generated/react'

export default function CreateLocationComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateLocation();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateLocation(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateLocation(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateLocation(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateLocation` Mutation requires an argument of type `CreateLocationVariables`:
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
  mutation.mutate(createLocationVars);
  // Variables can be defined inline as well.
  mutation.mutate({ locode: ..., name: ..., countryCode: ..., countryName: ..., type: ..., region: ..., latitude: ..., longitude: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createLocationVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.location_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateQuote
You can execute the `CreateQuote` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateQuote(options?: useDataConnectMutationOptions<CreateQuoteData, FirebaseError, CreateQuoteVariables>): UseDataConnectMutationResult<CreateQuoteData, CreateQuoteVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateQuote(dc: DataConnect, options?: useDataConnectMutationOptions<CreateQuoteData, FirebaseError, CreateQuoteVariables>): UseDataConnectMutationResult<CreateQuoteData, CreateQuoteVariables>;
```

### Variables
The `CreateQuote` Mutation requires an argument of type `CreateQuoteVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateQuote` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateQuote` Mutation is of type `CreateQuoteData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateQuoteData {
  quote_insert: Quote_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateQuote`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateQuoteVariables } from '@dataconnect/generated';
import { useCreateQuote } from '@dataconnect/generated/react'

export default function CreateQuoteComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateQuote();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateQuote(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateQuote(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateQuote(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateQuote` Mutation requires an argument of type `CreateQuoteVariables`:
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
  mutation.mutate(createQuoteVars);
  // Variables can be defined inline as well.
  mutation.mutate({ quoteNumber: ..., status: ..., movementType: ..., origin: ..., destination: ..., baseFreightCost: ..., totalCost: ..., currency: ..., validityDate: ..., carrierId: ..., customerId: ..., createdByUid: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createQuoteVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.quote_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateMilestone
You can execute the `CreateMilestone` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateMilestone(options?: useDataConnectMutationOptions<CreateMilestoneData, FirebaseError, CreateMilestoneVariables>): UseDataConnectMutationResult<CreateMilestoneData, CreateMilestoneVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateMilestone(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMilestoneData, FirebaseError, CreateMilestoneVariables>): UseDataConnectMutationResult<CreateMilestoneData, CreateMilestoneVariables>;
```

### Variables
The `CreateMilestone` Mutation requires an argument of type `CreateMilestoneVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateMilestoneVariables {
  eventCode: string;
  eventType: string;
  description: string;
  location?: string | null;
  shipmentId: UUIDString;
}
```
### Return Type
Recall that calling the `CreateMilestone` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateMilestone` Mutation is of type `CreateMilestoneData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateMilestoneData {
  milestone_insert: Milestone_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateMilestone`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateMilestoneVariables } from '@dataconnect/generated';
import { useCreateMilestone } from '@dataconnect/generated/react'

export default function CreateMilestoneComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateMilestone();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateMilestone(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateMilestone(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateMilestone(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateMilestone` Mutation requires an argument of type `CreateMilestoneVariables`:
  const createMilestoneVars: CreateMilestoneVariables = {
    eventCode: ..., 
    eventType: ..., 
    description: ..., 
    location: ..., // optional
    shipmentId: ..., 
  };
  mutation.mutate(createMilestoneVars);
  // Variables can be defined inline as well.
  mutation.mutate({ eventCode: ..., eventType: ..., description: ..., location: ..., shipmentId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createMilestoneVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.milestone_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateHsCode
You can execute the `CreateHsCode` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateHsCode(options?: useDataConnectMutationOptions<CreateHsCodeData, FirebaseError, CreateHsCodeVariables>): UseDataConnectMutationResult<CreateHsCodeData, CreateHsCodeVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateHsCode(dc: DataConnect, options?: useDataConnectMutationOptions<CreateHsCodeData, FirebaseError, CreateHsCodeVariables>): UseDataConnectMutationResult<CreateHsCodeData, CreateHsCodeVariables>;
```

### Variables
The `CreateHsCode` Mutation requires an argument of type `CreateHsCodeVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateHsCodeVariables {
  code: string;
  description: string;
  dutyRate?: number | null;
  isHazardous?: boolean | null;
}
```
### Return Type
Recall that calling the `CreateHsCode` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateHsCode` Mutation is of type `CreateHsCodeData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateHsCodeData {
  hsCode_upsert: HsCode_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateHsCode`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateHsCodeVariables } from '@dataconnect/generated';
import { useCreateHsCode } from '@dataconnect/generated/react'

export default function CreateHsCodeComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateHsCode();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateHsCode(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateHsCode(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateHsCode(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateHsCode` Mutation requires an argument of type `CreateHsCodeVariables`:
  const createHsCodeVars: CreateHsCodeVariables = {
    code: ..., 
    description: ..., 
    dutyRate: ..., // optional
    isHazardous: ..., // optional
  };
  mutation.mutate(createHsCodeVars);
  // Variables can be defined inline as well.
  mutation.mutate({ code: ..., description: ..., dutyRate: ..., isHazardous: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createHsCodeVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.hsCode_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateIncoterm
You can execute the `CreateIncoterm` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateIncoterm(options?: useDataConnectMutationOptions<CreateIncotermData, FirebaseError, CreateIncotermVariables>): UseDataConnectMutationResult<CreateIncotermData, CreateIncotermVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateIncoterm(dc: DataConnect, options?: useDataConnectMutationOptions<CreateIncotermData, FirebaseError, CreateIncotermVariables>): UseDataConnectMutationResult<CreateIncotermData, CreateIncotermVariables>;
```

### Variables
The `CreateIncoterm` Mutation requires an argument of type `CreateIncotermVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateIncotermVariables {
  code: string;
  description: string;
  freightPayer: string;
  originCustomsPayer: string;
  destCustomsPayer: string;
}
```
### Return Type
Recall that calling the `CreateIncoterm` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateIncoterm` Mutation is of type `CreateIncotermData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateIncotermData {
  incoterm_upsert: Incoterm_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateIncoterm`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateIncotermVariables } from '@dataconnect/generated';
import { useCreateIncoterm } from '@dataconnect/generated/react'

export default function CreateIncotermComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateIncoterm();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateIncoterm(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateIncoterm(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateIncoterm(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateIncoterm` Mutation requires an argument of type `CreateIncotermVariables`:
  const createIncotermVars: CreateIncotermVariables = {
    code: ..., 
    description: ..., 
    freightPayer: ..., 
    originCustomsPayer: ..., 
    destCustomsPayer: ..., 
  };
  mutation.mutate(createIncotermVars);
  // Variables can be defined inline as well.
  mutation.mutate({ code: ..., description: ..., freightPayer: ..., originCustomsPayer: ..., destCustomsPayer: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createIncotermVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.incoterm_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateVessel
You can execute the `CreateVessel` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateVessel(options?: useDataConnectMutationOptions<CreateVesselData, FirebaseError, CreateVesselVariables>): UseDataConnectMutationResult<CreateVesselData, CreateVesselVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateVessel(dc: DataConnect, options?: useDataConnectMutationOptions<CreateVesselData, FirebaseError, CreateVesselVariables>): UseDataConnectMutationResult<CreateVesselData, CreateVesselVariables>;
```

### Variables
The `CreateVessel` Mutation requires an argument of type `CreateVesselVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateVesselVariables {
  imoNumber: string;
  name: string;
  flag?: string | null;
  carrierId: UUIDString;
  capacityTeu?: number | null;
}
```
### Return Type
Recall that calling the `CreateVessel` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateVessel` Mutation is of type `CreateVesselData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateVesselData {
  vessel_upsert: Vessel_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateVessel`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateVesselVariables } from '@dataconnect/generated';
import { useCreateVessel } from '@dataconnect/generated/react'

export default function CreateVesselComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateVessel();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateVessel(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateVessel(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateVessel(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateVessel` Mutation requires an argument of type `CreateVesselVariables`:
  const createVesselVars: CreateVesselVariables = {
    imoNumber: ..., 
    name: ..., 
    flag: ..., // optional
    carrierId: ..., 
    capacityTeu: ..., // optional
  };
  mutation.mutate(createVesselVars);
  // Variables can be defined inline as well.
  mutation.mutate({ imoNumber: ..., name: ..., flag: ..., carrierId: ..., capacityTeu: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createVesselVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.vessel_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateSchedule
You can execute the `CreateSchedule` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateSchedule(options?: useDataConnectMutationOptions<CreateScheduleData, FirebaseError, CreateScheduleVariables>): UseDataConnectMutationResult<CreateScheduleData, CreateScheduleVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateSchedule(dc: DataConnect, options?: useDataConnectMutationOptions<CreateScheduleData, FirebaseError, CreateScheduleVariables>): UseDataConnectMutationResult<CreateScheduleData, CreateScheduleVariables>;
```

### Variables
The `CreateSchedule` Mutation requires an argument of type `CreateScheduleVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateSchedule` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateSchedule` Mutation is of type `CreateScheduleData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateScheduleData {
  schedule_insert: Schedule_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateSchedule`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateScheduleVariables } from '@dataconnect/generated';
import { useCreateSchedule } from '@dataconnect/generated/react'

export default function CreateScheduleComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateSchedule();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateSchedule(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateSchedule(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateSchedule(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateSchedule` Mutation requires an argument of type `CreateScheduleVariables`:
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
  mutation.mutate(createScheduleVars);
  // Variables can be defined inline as well.
  mutation.mutate({ vesselImoNumber: ..., voyageNumber: ..., polLocode: ..., podLocode: ..., etd: ..., eta: ..., cutOffDate: ..., availableTeu: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createScheduleVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.schedule_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateShipment
You can execute the `CreateShipment` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateShipment(options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateShipment(dc: DataConnect, options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;
```

### Variables
The `CreateShipment` Mutation requires an argument of type `CreateShipmentVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
Recall that calling the `CreateShipment` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateShipment` Mutation is of type `CreateShipmentData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateShipmentData {
  shipment_insert: Shipment_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateShipment`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateShipmentVariables } from '@dataconnect/generated';
import { useCreateShipment } from '@dataconnect/generated/react'

export default function CreateShipmentComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateShipment();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateShipment(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateShipment(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateShipment(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateShipment` Mutation requires an argument of type `CreateShipmentVariables`:
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
  mutation.mutate(createShipmentVars);
  // Variables can be defined inline as well.
  mutation.mutate({ trackingNumber: ..., status: ..., movementType: ..., direction: ..., incotermCode: ..., origin: ..., pol: ..., pod: ..., destination: ..., customerId: ..., supplierId: ..., shipperAddressShape: ..., consigneeAddressShape: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createShipmentVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.shipment_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## LogShipmentEvent
You can execute the `LogShipmentEvent` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useLogShipmentEvent(options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useLogShipmentEvent(dc: DataConnect, options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;
```

### Variables
The `LogShipmentEvent` Mutation requires an argument of type `LogShipmentEventVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface LogShipmentEventVariables {
  shipmentId: UUIDString;
  eventType: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  details?: string | null;
}
```
### Return Type
Recall that calling the `LogShipmentEvent` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `LogShipmentEvent` Mutation is of type `LogShipmentEventData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface LogShipmentEventData {
  shipmentEventLog_insert: ShipmentEventLog_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `LogShipmentEvent`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, LogShipmentEventVariables } from '@dataconnect/generated';
import { useLogShipmentEvent } from '@dataconnect/generated/react'

export default function LogShipmentEventComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useLogShipmentEvent();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useLogShipmentEvent(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useLogShipmentEvent(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useLogShipmentEvent(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useLogShipmentEvent` Mutation requires an argument of type `LogShipmentEventVariables`:
  const logShipmentEventVars: LogShipmentEventVariables = {
    shipmentId: ..., 
    eventType: ..., 
    oldStatus: ..., // optional
    newStatus: ..., // optional
    details: ..., // optional
  };
  mutation.mutate(logShipmentEventVars);
  // Variables can be defined inline as well.
  mutation.mutate({ shipmentId: ..., eventType: ..., oldStatus: ..., newStatus: ..., details: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(logShipmentEventVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.shipmentEventLog_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpsertUser
You can execute the `UpsertUser` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useUpsertUser(options?: useDataConnectMutationOptions<UpsertUserData, FirebaseError, UpsertUserVariables>): UseDataConnectMutationResult<UpsertUserData, UpsertUserVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpsertUser(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertUserData, FirebaseError, UpsertUserVariables>): UseDataConnectMutationResult<UpsertUserData, UpsertUserVariables>;
```

### Variables
The `UpsertUser` Mutation requires an argument of type `UpsertUserVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpsertUserVariables {
  email: string;
  displayName?: string | null;
  tenantId?: string | null;
}
```
### Return Type
Recall that calling the `UpsertUser` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpsertUser` Mutation is of type `UpsertUserData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpsertUserData {
  user_upsert: User_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpsertUser`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpsertUserVariables } from '@dataconnect/generated';
import { useUpsertUser } from '@dataconnect/generated/react'

export default function UpsertUserComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpsertUser();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpsertUser(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpsertUser(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpsertUser(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpsertUser` Mutation requires an argument of type `UpsertUserVariables`:
  const upsertUserVars: UpsertUserVariables = {
    email: ..., 
    displayName: ..., // optional
    tenantId: ..., // optional
  };
  mutation.mutate(upsertUserVars);
  // Variables can be defined inline as well.
  mutation.mutate({ email: ..., displayName: ..., tenantId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(upsertUserVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.user_upsert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateUserRole
You can execute the `UpdateUserRole` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateUserRole(options?: useDataConnectMutationOptions<UpdateUserRoleData, FirebaseError, UpdateUserRoleVariables>): UseDataConnectMutationResult<UpdateUserRoleData, UpdateUserRoleVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateUserRole(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateUserRoleData, FirebaseError, UpdateUserRoleVariables>): UseDataConnectMutationResult<UpdateUserRoleData, UpdateUserRoleVariables>;
```

### Variables
The `UpdateUserRole` Mutation requires an argument of type `UpdateUserRoleVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateUserRoleVariables {
  uid: string;
  role: string;
  tenantId?: string | null;
}
```
### Return Type
Recall that calling the `UpdateUserRole` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateUserRole` Mutation is of type `UpdateUserRoleData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateUserRoleData {
  user_update?: User_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateUserRole`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateUserRoleVariables } from '@dataconnect/generated';
import { useUpdateUserRole } from '@dataconnect/generated/react'

export default function UpdateUserRoleComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateUserRole();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateUserRole(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateUserRole(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateUserRole(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateUserRole` Mutation requires an argument of type `UpdateUserRoleVariables`:
  const updateUserRoleVars: UpdateUserRoleVariables = {
    uid: ..., 
    role: ..., 
    tenantId: ..., // optional
  };
  mutation.mutate(updateUserRoleVars);
  // Variables can be defined inline as well.
  mutation.mutate({ uid: ..., role: ..., tenantId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateUserRoleVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.user_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

