'use client';

import dynamic from 'next/dynamic';

const ClientLayoutWrapper = dynamic(() => import('./ClientLayoutWrapper'), { ssr: false });

export default function ClientLayoutWrapperLoader({ children }: { children: React.ReactNode }) {
  return <ClientLayoutWrapper>{children}</ClientLayoutWrapper>;
}
