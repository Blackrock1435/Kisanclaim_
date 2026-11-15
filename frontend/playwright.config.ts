import { defineConfig } from "@playwright/test";
// Start the API (uvicorn app.main:app --port 8000) and the app (npm run dev) first. See docs/setup.md.
export default defineConfig({ testDir: "./e2e", timeout: 90_000, use: { baseURL: "http://localhost:5173", viewport: { width: 1280, height: 900 } } });
