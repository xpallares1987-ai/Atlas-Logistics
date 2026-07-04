'use client';

import dynamic from 'next/dynamic';

const TrackerModule = dynamic(() => import('./TrackerModule'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando módulo de mapas...</div>
});

export default function TrackerPage() {
  return <TrackerModule />;
}
