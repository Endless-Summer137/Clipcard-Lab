import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createAnalyzeFramesMiddleware } from './src/server/analyzeFramesApi';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'clipcard-analyze-frames-api',
      configureServer(server) {
        server.middlewares.use(createAnalyzeFramesMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createAnalyzeFramesMiddleware());
      },
    },
  ],
});
