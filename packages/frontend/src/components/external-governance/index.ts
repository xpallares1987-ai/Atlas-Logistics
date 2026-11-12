/**
 * @file index.ts
 * @description Barrel export for external data governance components, organized into domain sub-folders (Tab/, Modal/, Drawer/).
 * @module @atlas/frontend/components/external-governance
 */

export {
  SourcesCatalogTab,
  SourcesCatalogTab as SourcesCatalog,
} from "./Tab/SourcesCatalog.js";
export {
  UnlocodeHotCacheTab,
  UnlocodeHotCacheTab as UnlocodeHotCache,
} from "./Tab/UnlocodeHotCache.js";
export {
  RawRecordsLedgerTab,
  RawRecordsLedgerTab as RawRecordsLedger,
} from "./Tab/RawRecordsLedger.js";
export {
  EntityLinksMatrixTab,
  EntityLinksMatrixTab as EntityLinksMatrix,
} from "./Tab/EntityLinksMatrix.js";

export {
  CreateEntityLinkModal,
  CreateEntityLinkModal as CreateEntityLink,
} from "./Modal/CreateEntityLink.js";
export {
  IngestRecordModal,
  IngestRecordModal as IngestRecord,
} from "./Modal/IngestRecord.js";
export {
  UpsertUnlocodeModal,
  UpsertUnlocodeModal as UpsertUnlocode,
} from "./Modal/UpsertUnlocode.js";

export {
  RecordPayloadDrawer,
  RecordPayloadDrawer as RecordPayload,
} from "./Drawer/RecordPayload.js";
