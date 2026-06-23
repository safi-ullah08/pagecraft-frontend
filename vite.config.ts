import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // model is a TS submodule, not a prebuilt dep — let Vite compile it directly
  optimizeDeps: { exclude: ["@pagecraft/model"] },
  server: {
    port: 5173,
    proxy: { "/api": process.env.VITE_API_URL ?? "http://localhost:4000" },
  },
});
