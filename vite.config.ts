import { defineConfig } from 'vitest/config';
import { createAuditMiddleware } from './scripts/local-server.mjs';
export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'local-lighthouse',
      configureServer(server) {
        server.middlewares.use(createAuditMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createAuditMiddleware());
      },
    },
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
