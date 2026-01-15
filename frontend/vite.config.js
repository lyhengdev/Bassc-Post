import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    },
  },
});
