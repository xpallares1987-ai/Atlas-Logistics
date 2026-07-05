import { defineConfig } from 'vite';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/BPMN-Modeler/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'BPMN Modeler - Logistics Operations',
        short_name: 'BPMN Modeler',
        description: 'Industrial-grade BPMN editor for SCM processes',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10485760, // 10 MiB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        // Large XML templates should be cached for offline use
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['stream-browserify', 'events', 'timers-browserify', 'xml2js'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('react') || id.includes('@tanstack')) return 'vendor-react';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('@google/genai')) return 'vendor-genai';
          if (id.includes('yjs') || id.includes('y-indexeddb') || id.includes('y-protocols')) return 'vendor-yjs';
          if (id.includes('bpmnlint') || id.includes('zeebe') || id.includes('camunda')) return 'vendor-bpmn-addons';
          if (id.includes('bpmn-js/lib/features') || id.includes('bpmn-js/lib/import')) return 'vendor-bpmn-features';
          if (id.includes('bpmn-js') || id.includes('bpmn-moddle')) return 'vendor-bpmn-core';
          if (id.includes('diagram-js')) return 'vendor-diagram';
          if (id.includes('@bpmn-io')) return 'vendor-bpmn-io';
          if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-editor';
          if (id.includes('@atlas/ui') || id.includes('@torre/ui')) return 'vendor-ui';
          if (id.includes('node_modules')) return 'vendor-base';
          return null;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      stream: 'stream-browserify',
      events: 'events',
      timers: 'timers-browserify',
      ids: path.resolve(__dirname, './src/utils/ids-shim.ts'),
      '@torre/shared/assets': path.resolve(__dirname, './src/shared/assets'),
      '@torre/shared': path.resolve(__dirname, './src/shared/src/index.ts'),
      '@torre/ui/assets': path.resolve(__dirname, './src/ui-shared/assets'),
      '@torre/ui': path.resolve(__dirname, './src/ui-shared/src/index.ts'),
      '@control-tower/feature-flags': path.resolve(__dirname, './src/feature-flags/index.ts'),
    },
  },
  server: {
    // Allow Nginx virtual-host proxying (bpmn.localhost → container:5173).
    // Without this Vite rejects requests with a non-localhost Host header (403).
    allowedHosts: ['bpmn.localhost', 'localhost', '127.0.0.1'],
    cors: true,
  },
});




