import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:5197', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5197 --strictPort',
    url: 'http://127.0.0.1:5197',
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:4109' },
    reuseExistingServer: false,
  },
});
