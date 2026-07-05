import React from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  module: string;
  description?: string;
}

export default function ComingSoon({ module, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="p-5 bg-slate-800 rounded-2xl mb-6 shadow-lg">
        <Construction className="w-12 h-12 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">{module}</h2>
      <p className="text-slate-400 max-w-md text-sm">
        {description ?? 'This module is under active development and will be available in an upcoming release.'}
      </p>
      <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-3 py-1">
        Coming Soon
      </span>
    </div>
  );
}
