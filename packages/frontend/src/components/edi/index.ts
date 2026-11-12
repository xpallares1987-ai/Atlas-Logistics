/**
 * @file index.ts
 * @description Barrel export for EDI integration components, organized into domain sub-folders (Tab/, Modal/).
 * @module @atlas/frontend/components/edi
 */

export { EdiDcsaTab, EdiDcsaTab as Dcsa } from "./Tab/Dcsa.js";
export { EdiStudioTab, EdiStudioTab as Studio } from "./Tab/Studio.js";
export { EdiOutboundTab, EdiOutboundTab as Outbound } from "./Tab/Outbound.js";
export { EdiAuditTab, EdiAuditTab as Audit } from "./Tab/Audit.js";
export { EdiPartnersTab, EdiPartnersTab as Partners } from "./Tab/Partners.js";

export {
  DcsaSubscriptionModal,
  DcsaSubscriptionModal as DcsaSubscription,
} from "./Modal/DcsaSubscription.js";
