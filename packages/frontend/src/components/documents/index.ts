/**
 * @file index.ts
 * @description Barrel export for document vault components, organized into domain sub-folders (Tab/, Modal/).
 * @module @atlas/frontend/components/documents
 */

export {
  DocumentStudioTab,
  DocumentStudioTab as Studio,
} from "./Tab/Studio.js";
export { DocumentVaultTab, DocumentVaultTab as Vault } from "./Tab/Vault.js";
export {
  DocumentVerifyTab,
  DocumentVerifyTab as Verify,
} from "./Tab/Verify.js";
export {
  DocumentOcrStudioTab,
  DocumentOcrStudioTab as OcrStudio,
} from "./Tab/OcrStudio.js";

export {
  DocumentViewerModal,
  DocumentViewerModal as Viewer,
} from "./Modal/Viewer.js";
