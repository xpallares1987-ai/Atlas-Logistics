import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/Freight-Comparer/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Allow Nginx virtual-host proxying (comparer.localhost → container:3000).
      allowedHosts: ['comparer.localhost', 'localhost', '127.0.0.1'],
      cors: true,
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('leaflet')) return 'vendor-leaflet';
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('@xpallares1987-ai')) return 'vendor-ui';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('node_modules')) return 'vendor';
          },
        },
      },
    },
  };
});
