import React from 'react';
import LclConsolidationClient from './LclConsolidationClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LCL Consolidation Engine | Atlas Logistics',
  description: 'Manage LCL freight and cross-dock operations.',
};

export default function ConsolidationPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Cross-Dock Operations</h1>
        <p className="text-gray-400">Build Master Consolidations interactively for your LCL cargo pool.</p>
      </div>

      <LclConsolidationClient />
    </div>
  );
}
