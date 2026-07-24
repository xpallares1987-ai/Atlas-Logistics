# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useListCustomers, useListCrmDeals, useListCrmInteractions, useCreateCrmDeal, useUpdateCrmDealStatus, useCreateCrmInteraction, useCreateDocumentFromOcr, useApproveOcrDocument, useRejectOcrDocument, useListPendingOcrDocuments } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useListCustomers(listCustomersVars);

const { data, isPending, isSuccess, isError, error } = useListCrmDeals(listCrmDealsVars);

const { data, isPending, isSuccess, isError, error } = useListCrmInteractions(listCrmInteractionsVars);

const { data, isPending, isSuccess, isError, error } = useCreateCrmDeal(createCrmDealVars);

const { data, isPending, isSuccess, isError, error } = useUpdateCrmDealStatus(updateCrmDealStatusVars);

const { data, isPending, isSuccess, isError, error } = useCreateCrmInteraction(createCrmInteractionVars);

const { data, isPending, isSuccess, isError, error } = useCreateDocumentFromOcr(createDocumentFromOcrVars);

const { data, isPending, isSuccess, isError, error } = useApproveOcrDocument(approveOcrDocumentVars);

const { data, isPending, isSuccess, isError, error } = useRejectOcrDocument(rejectOcrDocumentVars);

const { data, isPending, isSuccess, isError, error } = useListPendingOcrDocuments();

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
import { listCustomers, listCrmDeals, listCrmInteractions, createCrmDeal, updateCrmDealStatus, createCrmInteraction, createDocumentFromOcr, approveOcrDocument, rejectOcrDocument, listPendingOcrDocuments } from '@dataconnect/generated';


// Operation ListCustomers:  For variables, look at type ListCustomersVars in ../index.d.ts
const { data } = await ListCustomers(dataConnect, listCustomersVars);

// Operation ListCrmDeals:  For variables, look at type ListCrmDealsVars in ../index.d.ts
const { data } = await ListCrmDeals(dataConnect, listCrmDealsVars);

// Operation ListCrmInteractions:  For variables, look at type ListCrmInteractionsVars in ../index.d.ts
const { data } = await ListCrmInteractions(dataConnect, listCrmInteractionsVars);

// Operation CreateCrmDeal:  For variables, look at type CreateCrmDealVars in ../index.d.ts
const { data } = await CreateCrmDeal(dataConnect, createCrmDealVars);

// Operation UpdateCrmDealStatus:  For variables, look at type UpdateCrmDealStatusVars in ../index.d.ts
const { data } = await UpdateCrmDealStatus(dataConnect, updateCrmDealStatusVars);

// Operation CreateCrmInteraction:  For variables, look at type CreateCrmInteractionVars in ../index.d.ts
const { data } = await CreateCrmInteraction(dataConnect, createCrmInteractionVars);

// Operation CreateDocumentFromOcr:  For variables, look at type CreateDocumentFromOcrVars in ../index.d.ts
const { data } = await CreateDocumentFromOcr(dataConnect, createDocumentFromOcrVars);

// Operation ApproveOcrDocument:  For variables, look at type ApproveOcrDocumentVars in ../index.d.ts
const { data } = await ApproveOcrDocument(dataConnect, approveOcrDocumentVars);

// Operation RejectOcrDocument:  For variables, look at type RejectOcrDocumentVars in ../index.d.ts
const { data } = await RejectOcrDocument(dataConnect, rejectOcrDocumentVars);

// Operation ListPendingOcrDocuments: 
const { data } = await ListPendingOcrDocuments(dataConnect);


```