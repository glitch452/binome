import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
      reporters: ['default'],
      coverage: {
        reporter: ['text'],
        reportsDirectory: `./coverage`,
        provider: 'v8',
        include: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['**/*.stories.tsx', 'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
