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
