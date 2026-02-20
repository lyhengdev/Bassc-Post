import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-logo-512.png',
        'apple-touch-icon.png',
        'LogoV1.png',
        'LogoV1_white.png',
        'pwa-192.png',
        'pwa-512.png',
        'offline.html',
      ],
      manifest: {
        name: 'Bassac Media Center',
        short_name: 'Bassac Media',
        description: 'News and media coverage from Bassac Media Center.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a56db',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        mode: 'production',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/share\//,
          /^\/dashboard/,
          /^\/login/,
          /^\/register/,
          /^\/account/,
          /^\/profile/,
          /^\/admin/,
        ],
        runtimeCaching: [
          {
            // Cache remote/static images, but don't cache same-origin /uploads media
            // because those paths can become invalid after storage provider changes.
            urlPattern: ({ request, url }) =>
              request.destination === 'image' &&
              !(url.origin === self.location.origin && url.pathname.startsWith('/uploads/')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.origin === self.location.origin &&
              url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
          editorjs: [
            '@editorjs/editorjs',
            '@editorjs/header',
            '@editorjs/list',
            '@editorjs/paragraph',
            '@editorjs/quote',
            '@editorjs/image',
            '@editorjs/code',
            '@editorjs/delimiter',
            '@editorjs/table',
            '@editorjs/embed',
            '@editorjs/link',
            '@editorjs/marker',
            '@editorjs/inline-code',
          ],
          data: ['@tanstack/react-query', 'axios', 'zustand'],
          ui: ['lucide-react', 'react-hot-toast', 'clsx', 'date-fns'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false,  // Disable error overlay
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            // Silently ignore proxy errors
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            socket.on('error', () => {
              // Silently ignore socket errors
            });
          });
        },
      },
      '/share': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
});
