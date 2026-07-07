# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listCompanies, listQuotes, listShipments, getShipmentById, createShipment, logShipmentEvent } from '@atlas/dataconnect';


// Operation ListCompanies: 
const { data } = await ListCompanies(dataConnect);

// Operation ListQuotes: 
const { data } = await ListQuotes(dataConnect);

// Operation ListShipments: 
const { data } = await ListShipments(dataConnect);

// Operation GetShipmentById:  For variables, look at type GetShipmentByIdVars in ../index.d.ts
const { data } = await GetShipmentById(dataConnect, getShipmentByIdVars);

// Operation CreateShipment:  For variables, look at type CreateShipmentVars in ../index.d.ts
const { data } = await CreateShipment(dataConnect, createShipmentVars);

// Operation LogShipmentEvent:  For variables, look at type LogShipmentEventVars in ../index.d.ts
const { data } = await LogShipmentEvent(dataConnect, logShipmentEventVars);


```