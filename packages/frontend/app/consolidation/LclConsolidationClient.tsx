"use client";

import dynamic from 'next/dynamic';

const LclConsolidationEngine = dynamic(
  () => import('@xpallares1987-ai/control-tower-ui').then(mod => mod.LclConsolidationEngine),
  { ssr: false }
);

export default function LclConsolidationClient() {
  return <LclConsolidationEngine />;
}
