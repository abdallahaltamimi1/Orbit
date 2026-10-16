import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "shared",
    emptyOutDir: false,
    lib: {
      entry: "lessons/learning-orbit.js",
      name: "LearningOrbit",
      formats: ["iife"],
      fileName: () => "learning-orbit.bundle.js",
    },
    sourcemap: true,
  },
});
