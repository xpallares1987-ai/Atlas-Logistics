import { DocumentPreviewer } from '@atlas/ui/src/components/DocumentPreviewer';

export default function DocumentVaultModule() {
  return (
    <div className="w-full h-full bg-slate-50 overflow-y-auto">
      <DocumentPreviewer 
        type="HBL"
        reference="HBL-123456789"
        shipper="Atlas Global Logistics"
        consignee="Tech Imports Inc."
        vessel="MSC AMSTERDAM"
        pol="CNSHA"
        pod="ESBCN"
      />
    </div>
  );
}
