import { DynamicRateEngine } from '@atlas/ui/src/components/DynamicRateEngine';

export default function DynamicPricingModule() {
  return (
    <div className="w-full h-full bg-slate-50 overflow-y-auto">
      <DynamicRateEngine />
    </div>
  );
}
