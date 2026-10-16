import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "hompage",
    emptyOutDir: false,
    lib: {
      entry: "hompage/three-local.js",
      name: "OrbitHomeThree",
      formats: ["iife"],
      fileName: () => "three-local.bundle.js",
    },
  },
});
