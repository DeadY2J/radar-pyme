import { defineConfig } from "@playwright/test";

/** Test de humo: arranca la app en modo demo (sin claves) y recorre lo esencial en un navegador real. */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3123", trace: "off" },
  webServer: {
    command: "npm run build && npx next start -p 3123",
    url: "http://localhost:3123",
    timeout: 180_000,
    reuseExistingServer: false,
    env: { GOOGLE_PLACES_API_KEY: "", RADAR_TOKEN: "" },
  },
});
