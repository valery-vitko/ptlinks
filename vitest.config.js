import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    root: '.',
    setupFiles: ['./tests/setup.js'],
  },
});
