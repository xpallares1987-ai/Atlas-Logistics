# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertUser, getUserRole, getAllUsers, updateUserRole, createShipment, listShipments, updateShipmentStatus, deleteShipment } from '@dataconnect/generated';


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