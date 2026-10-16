import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "school-tour",
    emptyOutDir: false,
    lib: {
      entry: "school-tour/tour-scene.js",
      name: "SchoolTour",
      formats: ["iife"],
      fileName: () => "tour-scene.bundle.js",
    },
    sourcemap: true,
  },
});
