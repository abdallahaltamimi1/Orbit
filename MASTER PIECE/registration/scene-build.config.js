import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "registration",
    emptyOutDir: false,
    lib: {
      entry: "registration/learning-universe.js",
      name: "RegistrationUniverse",
      formats: ["iife"],
      fileName: () => "learning-universe.bundle.js",
    },
    sourcemap: true,
  },
});
