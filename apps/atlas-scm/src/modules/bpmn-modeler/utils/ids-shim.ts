// @ts-expect-error: Bypassing types for relative import of ids under node_modules
import * as IdsModule from '../../node_modules/ids/dist/index.js';

// Extract the primary class constructor
const Ids = 'Ids' in IdsModule ? (IdsModule as { Ids: unknown }).Ids : IdsModule;

export { Ids };
export default Ids;
