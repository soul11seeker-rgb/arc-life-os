import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/arc-life-os/",
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
  },
} as Parameters<typeof defineConfig>[0]);
