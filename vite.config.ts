import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createAnalyzeFramesMiddleware } from './src/server/analyzeFramesApi';

declare const process: {
  cwd: () => string;
  env: Record<string, string | undefined>;
};

function loadServerEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

export default defineConfig(({ mode }) => {
  loadServerEnv(mode);

  return {
    base: process.env.VITE_BASE_PATH || '/',
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
  };
});
