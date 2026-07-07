# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.

### React

For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:

```ts
import {
  useUpsertUser,
  useGetUserRole,
  useGetAllUsers,
  useUpdateUserRole,
  useCreateShipment,
  useListShipments,
  useUpdateShipmentStatus,
  useDeleteShipment,
} from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useUpsertUser(upsertUserVars);

const { data, isPending, isSuccess, isError, error } = useGetUserRole(getUserRoleVars);

const { data, isPending, isSuccess, isError, error } = useGetAllUsers();

const { data, isPending, isSuccess, isError, error } = useUpdateUserRole(updateUserRoleVars);

const { data, isPending, isSuccess, isError, error } = useCreateShipment(createShipmentVars);

const { data, isPending, isSuccess, isError, error } = useListShipments();

const { data, isPending, isSuccess, isError, error } =
  useUpdateShipmentStatus(updateShipmentStatusVars);

const { data, isPending, isSuccess, isError, error } = useDeleteShipment(deleteShipmentVars);
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
import {
  upsertUser,
  getUserRole,
  getAllUsers,
  updateUserRole,
  createShipment,
  listShipments,
  updateShipmentStatus,
  deleteShipment,
} from '@dataconnect/generated';

// Operation UpsertUser:  For variables, look at type UpsertUserVars in ../index.d.ts
const { data } = await UpsertUser(dataConnect, upsertUserVars);

// Operation GetUserRole:  For variables, look at type GetUserRoleVars in ../index.d.ts
const { data } = await GetUserRole(dataConnect, getUserRoleVars);

// Operation GetAllUsers:
const { data } = await GetAllUsers(dataConnect);

// Operation UpdateUserRole:  For variables, look at type UpdateUserRoleVars in ../index.d.ts
const { data } = await UpdateUserRole(dataConnect, updateUserRoleVars);

// Operation CreateShipment:  For variables, look at type CreateShipmentVars in ../index.d.ts
const { data } = await CreateShipment(dataConnect, createShipmentVars);

// Operation ListShipments:
const { data } = await ListShipments(dataConnect);

// Operation UpdateShipmentStatus:  For variables, look at type UpdateShipmentStatusVars in ../index.d.ts
const { data } = await UpdateShipmentStatus(dataConnect, updateShipmentStatusVars);

// Operation DeleteShipment:  For variables, look at type DeleteShipmentVars in ../index.d.ts
const { data } = await DeleteShipment(dataConnect, deleteShipmentVars);
```
