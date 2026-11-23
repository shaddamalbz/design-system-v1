import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site from /<repo>/, so production builds use that
// as the base path. The dev server stays at /.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/design-system-v1/" : "/",
  plugins: [react()],
  server: { port: 5199 },
}));
