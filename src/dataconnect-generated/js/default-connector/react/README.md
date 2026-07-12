# Generated React README
This README will guide you through the process of using the generated React SDK package for the connector `atlas`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `JavaScript README`, you can find it at [`default-connector/README.md`](../README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@atlas/dataconnect/react` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#react).

# Table of Contents
- [**Overview**](#generated-react-readme)
- [**TanStack Query Firebase & TanStack React Query**](#tanstack-query-firebase-tanstack-react-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-react-query-packages)
  - [*Configuring TanStack Query*](#configuring-tanstack-query)
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
import { connectorConfig } from '@atlas/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@atlas/dataconnect';

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

## ListCompanies
You can execute the `ListCompanies` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

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

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListCompanies` Query is of type `ListCompaniesData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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
import { connectorConfig } from '@atlas/dataconnect';
import { useListCompanies } from '@atlas/dataconnect/react'

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
You can execute the `SearchLocations` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useSearchLocations(dc: DataConnect, vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useSearchLocations(vars: SearchLocationsVariables, options?: useDataConnectQueryOptions<SearchLocationsData>): UseDataConnectQueryResult<SearchLocationsData, SearchLocationsVariables>;
```

### Variables
The `SearchLocations` Query requires an argument of type `SearchLocationsVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface SearchLocationsVariables {
  query: string;
}
```
### Return Type
Recall that calling the `SearchLocations` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `SearchLocations` Query is of type `SearchLocationsData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `SearchLocations`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, SearchLocationsVariables } from '@atlas/dataconnect';
import { useSearchLocations } from '@atlas/dataconnect/react'

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
You can execute the `ListQuotes` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useListQuotes(dc: DataConnect, vars?: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListQuotes(vars?: ListQuotesVariables, options?: useDataConnectQueryOptions<ListQuotesData>): UseDataConnectQueryResult<ListQuotesData, ListQuotesVariables>;
```

### Variables
The `ListQuotes` Query has an optional argument of type `ListQuotesVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListQuotesVariables {
  origin?: string | null;
  destination?: string | null;
}
```
### Return Type
Recall that calling the `ListQuotes` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListQuotes` Query is of type `ListQuotesData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListQuotes`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListQuotesVariables } from '@atlas/dataconnect';
import { useListQuotes } from '@atlas/dataconnect/react'

export default function ListQuotesComponent() {
  // The `useListQuotes` Query hook has an optional argument of type `ListQuotesVariables`:
  const listQuotesVars: ListQuotesVariables = {
    origin: ..., // optional
    destination: ..., // optional
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListQuotes(listQuotesVars);
  // Variables can be defined inline as well.
  const query = useListQuotes({ origin: ..., destination: ..., });
  // Since all variables are optional for this Query, you can omit the `ListQuotesVariables` argument.
  // (as long as you don't want to provide any `options`!)
  const query = useListQuotes();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListQuotes(dataConnect, listQuotesVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListQuotes(listQuotesVars, options);
  // If you'd like to provide options without providing any variables, you must
  // pass `undefined` where you would normally pass the variables.
  const query = useListQuotes(undefined, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListQuotes(dataConnect, listQuotesVars /** or undefined */, options);

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
You can execute the `ListShipments` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useListShipments(dc: DataConnect, options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListShipments(options?: useDataConnectQueryOptions<ListShipmentsData>): UseDataConnectQueryResult<ListShipmentsData, undefined>;
```

### Variables
The `ListShipments` Query has no variables.
### Return Type
Recall that calling the `ListShipments` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListShipments` Query is of type `ListShipmentsData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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
import { connectorConfig } from '@atlas/dataconnect';
import { useListShipments } from '@atlas/dataconnect/react'

export default function ListShipmentsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListShipments();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListShipments(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListShipments(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListShipments(dataConnect, options);

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
You can execute the `GetShipmentById` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetShipmentById(dc: DataConnect, vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetShipmentById(vars: GetShipmentByIdVariables, options?: useDataConnectQueryOptions<GetShipmentByIdData>): UseDataConnectQueryResult<GetShipmentByIdData, GetShipmentByIdVariables>;
```

### Variables
The `GetShipmentById` Query requires an argument of type `GetShipmentByIdVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetShipmentByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetShipmentById` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetShipmentById` Query is of type `GetShipmentByIdData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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
import { connectorConfig, GetShipmentByIdVariables } from '@atlas/dataconnect';
import { useGetShipmentById } from '@atlas/dataconnect/react'

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

## CreateCompany
You can execute the `CreateCompany` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateCompany(options?: useDataConnectMutationOptions<CreateCompanyData, FirebaseError, CreateCompanyVariables>): UseDataConnectMutationResult<CreateCompanyData, CreateCompanyVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateCompany(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCompanyData, FirebaseError, CreateCompanyVariables>): UseDataConnectMutationResult<CreateCompanyData, CreateCompanyVariables>;
```

### Variables
The `CreateCompany` Mutation requires an argument of type `CreateCompanyVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateCompany` Mutation is of type `CreateCompanyData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateCompanyData {
  company_upsert: Company_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateCompany`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateCompanyVariables } from '@atlas/dataconnect';
import { useCreateCompany } from '@atlas/dataconnect/react'

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
You can execute the `CreateLocation` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateLocation(options?: useDataConnectMutationOptions<CreateLocationData, FirebaseError, CreateLocationVariables>): UseDataConnectMutationResult<CreateLocationData, CreateLocationVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateLocation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateLocationData, FirebaseError, CreateLocationVariables>): UseDataConnectMutationResult<CreateLocationData, CreateLocationVariables>;
```

### Variables
The `CreateLocation` Mutation requires an argument of type `CreateLocationVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateLocation` Mutation is of type `CreateLocationData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateLocationData {
  location_upsert: Location_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateLocation`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateLocationVariables } from '@atlas/dataconnect';
import { useCreateLocation } from '@atlas/dataconnect/react'

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
You can execute the `CreateQuote` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateQuote(options?: useDataConnectMutationOptions<CreateQuoteData, FirebaseError, CreateQuoteVariables>): UseDataConnectMutationResult<CreateQuoteData, CreateQuoteVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateQuote(dc: DataConnect, options?: useDataConnectMutationOptions<CreateQuoteData, FirebaseError, CreateQuoteVariables>): UseDataConnectMutationResult<CreateQuoteData, CreateQuoteVariables>;
```

### Variables
The `CreateQuote` Mutation requires an argument of type `CreateQuoteVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateQuote` Mutation is of type `CreateQuoteData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateQuoteData {
  quote_insert: Quote_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateQuote`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateQuoteVariables } from '@atlas/dataconnect';
import { useCreateQuote } from '@atlas/dataconnect/react'

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
You can execute the `CreateMilestone` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateMilestone(options?: useDataConnectMutationOptions<CreateMilestoneData, FirebaseError, CreateMilestoneVariables>): UseDataConnectMutationResult<CreateMilestoneData, CreateMilestoneVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateMilestone(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMilestoneData, FirebaseError, CreateMilestoneVariables>): UseDataConnectMutationResult<CreateMilestoneData, CreateMilestoneVariables>;
```

### Variables
The `CreateMilestone` Mutation requires an argument of type `CreateMilestoneVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateMilestone` Mutation is of type `CreateMilestoneData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateMilestoneData {
  milestone_insert: Milestone_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateMilestone`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateMilestoneVariables } from '@atlas/dataconnect';
import { useCreateMilestone } from '@atlas/dataconnect/react'

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
You can execute the `CreateHsCode` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateHsCode(options?: useDataConnectMutationOptions<CreateHsCodeData, FirebaseError, CreateHsCodeVariables>): UseDataConnectMutationResult<CreateHsCodeData, CreateHsCodeVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateHsCode(dc: DataConnect, options?: useDataConnectMutationOptions<CreateHsCodeData, FirebaseError, CreateHsCodeVariables>): UseDataConnectMutationResult<CreateHsCodeData, CreateHsCodeVariables>;
```

### Variables
The `CreateHsCode` Mutation requires an argument of type `CreateHsCodeVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateHsCode` Mutation is of type `CreateHsCodeData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateHsCodeData {
  hsCode_upsert: HsCode_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateHsCode`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateHsCodeVariables } from '@atlas/dataconnect';
import { useCreateHsCode } from '@atlas/dataconnect/react'

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
You can execute the `CreateIncoterm` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateIncoterm(options?: useDataConnectMutationOptions<CreateIncotermData, FirebaseError, CreateIncotermVariables>): UseDataConnectMutationResult<CreateIncotermData, CreateIncotermVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateIncoterm(dc: DataConnect, options?: useDataConnectMutationOptions<CreateIncotermData, FirebaseError, CreateIncotermVariables>): UseDataConnectMutationResult<CreateIncotermData, CreateIncotermVariables>;
```

### Variables
The `CreateIncoterm` Mutation requires an argument of type `CreateIncotermVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateIncoterm` Mutation is of type `CreateIncotermData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateIncotermData {
  incoterm_upsert: Incoterm_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateIncoterm`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateIncotermVariables } from '@atlas/dataconnect';
import { useCreateIncoterm } from '@atlas/dataconnect/react'

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
You can execute the `CreateVessel` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateVessel(options?: useDataConnectMutationOptions<CreateVesselData, FirebaseError, CreateVesselVariables>): UseDataConnectMutationResult<CreateVesselData, CreateVesselVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateVessel(dc: DataConnect, options?: useDataConnectMutationOptions<CreateVesselData, FirebaseError, CreateVesselVariables>): UseDataConnectMutationResult<CreateVesselData, CreateVesselVariables>;
```

### Variables
The `CreateVessel` Mutation requires an argument of type `CreateVesselVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateVessel` Mutation is of type `CreateVesselData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateVesselData {
  vessel_upsert: Vessel_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateVessel`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateVesselVariables } from '@atlas/dataconnect';
import { useCreateVessel } from '@atlas/dataconnect/react'

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
You can execute the `CreateSchedule` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateSchedule(options?: useDataConnectMutationOptions<CreateScheduleData, FirebaseError, CreateScheduleVariables>): UseDataConnectMutationResult<CreateScheduleData, CreateScheduleVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateSchedule(dc: DataConnect, options?: useDataConnectMutationOptions<CreateScheduleData, FirebaseError, CreateScheduleVariables>): UseDataConnectMutationResult<CreateScheduleData, CreateScheduleVariables>;
```

### Variables
The `CreateSchedule` Mutation requires an argument of type `CreateScheduleVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateSchedule` Mutation is of type `CreateScheduleData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateScheduleData {
  schedule_insert: Schedule_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateSchedule`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateScheduleVariables } from '@atlas/dataconnect';
import { useCreateSchedule } from '@atlas/dataconnect/react'

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
You can execute the `CreateShipment` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateShipment(options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateShipment(dc: DataConnect, options?: useDataConnectMutationOptions<CreateShipmentData, FirebaseError, CreateShipmentVariables>): UseDataConnectMutationResult<CreateShipmentData, CreateShipmentVariables>;
```

### Variables
The `CreateShipment` Mutation requires an argument of type `CreateShipmentVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateShipment` Mutation is of type `CreateShipmentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateShipmentData {
  shipment_insert: Shipment_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateShipment`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateShipmentVariables } from '@atlas/dataconnect';
import { useCreateShipment } from '@atlas/dataconnect/react'

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
You can execute the `LogShipmentEvent` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useLogShipmentEvent(options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useLogShipmentEvent(dc: DataConnect, options?: useDataConnectMutationOptions<LogShipmentEventData, FirebaseError, LogShipmentEventVariables>): UseDataConnectMutationResult<LogShipmentEventData, LogShipmentEventVariables>;
```

### Variables
The `LogShipmentEvent` Mutation requires an argument of type `LogShipmentEventVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

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

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `LogShipmentEvent` Mutation is of type `LogShipmentEventData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface LogShipmentEventData {
  shipmentEventLog_insert: ShipmentEventLog_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `LogShipmentEvent`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, LogShipmentEventVariables } from '@atlas/dataconnect';
import { useLogShipmentEvent } from '@atlas/dataconnect/react'

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

