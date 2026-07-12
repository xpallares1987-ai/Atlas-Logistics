# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useListCompanies, useSearchLocations, useListQuotes, useCreateCompany, useCreateLocation, useCreateQuote, useCreateMilestone, useCreateHsCode, useCreateIncoterm, useCreateVessel } from '@atlas/dataconnect/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useListCompanies();

const { data, isPending, isSuccess, isError, error } = useSearchLocations(searchLocationsVars);

const { data, isPending, isSuccess, isError, error } = useListQuotes(listQuotesVars);

const { data, isPending, isSuccess, isError, error } = useCreateCompany(createCompanyVars);

const { data, isPending, isSuccess, isError, error } = useCreateLocation(createLocationVars);

const { data, isPending, isSuccess, isError, error } = useCreateQuote(createQuoteVars);

const { data, isPending, isSuccess, isError, error } = useCreateMilestone(createMilestoneVars);

const { data, isPending, isSuccess, isError, error } = useCreateHsCode(createHsCodeVars);

const { data, isPending, isSuccess, isError, error } = useCreateIncoterm(createIncotermVars);

const { data, isPending, isSuccess, isError, error } = useCreateVessel(createVesselVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listCompanies, searchLocations, listQuotes, createCompany, createLocation, createQuote, createMilestone, createHsCode, createIncoterm, createVessel } from '@atlas/dataconnect';


// Operation ListCompanies: 
const { data } = await ListCompanies(dataConnect);

// Operation SearchLocations:  For variables, look at type SearchLocationsVars in ../index.d.ts
const { data } = await SearchLocations(dataConnect, searchLocationsVars);

// Operation ListQuotes:  For variables, look at type ListQuotesVars in ../index.d.ts
const { data } = await ListQuotes(dataConnect, listQuotesVars);

// Operation CreateCompany:  For variables, look at type CreateCompanyVars in ../index.d.ts
const { data } = await CreateCompany(dataConnect, createCompanyVars);

// Operation CreateLocation:  For variables, look at type CreateLocationVars in ../index.d.ts
const { data } = await CreateLocation(dataConnect, createLocationVars);

// Operation CreateQuote:  For variables, look at type CreateQuoteVars in ../index.d.ts
const { data } = await CreateQuote(dataConnect, createQuoteVars);

// Operation CreateMilestone:  For variables, look at type CreateMilestoneVars in ../index.d.ts
const { data } = await CreateMilestone(dataConnect, createMilestoneVars);

// Operation CreateHsCode:  For variables, look at type CreateHsCodeVars in ../index.d.ts
const { data } = await CreateHsCode(dataConnect, createHsCodeVars);

// Operation CreateIncoterm:  For variables, look at type CreateIncotermVars in ../index.d.ts
const { data } = await CreateIncoterm(dataConnect, createIncotermVars);

// Operation CreateVessel:  For variables, look at type CreateVesselVars in ../index.d.ts
const { data } = await CreateVessel(dataConnect, createVesselVars);


```