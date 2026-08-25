import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: ".",

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
      "@resources": path.resolve(import.meta.dirname, "./resources"),
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  publicDir: "resources",

  plugins: [
    react(),

    tailwindcss(),

    electron({
      main: {
        entry: "electron/main/main.ts",

        vite: {
          build: {
            outDir: "dist-electron/main",
            emptyOutDir: true,

            rolldownOptions: {
              external: ["realm"],
            },
          },

          optimizeDeps: {
            exclude: ["realm"],
          },

          resolve: {
            alias: {
              "@shared": path.resolve(import.meta.dirname, "./shared"),
              "@resources": path.resolve(import.meta.dirname, "./resources"),
            },
          },
        },
      },

      preload: {
        input: path.join(import.meta.dirname, "electron/preload/preload.ts"),

        vite: {
          build: {
            outDir: "dist-electron/preload",
            emptyOutDir: true,
          },

          resolve: {
            alias: {
              "@shared": path.resolve(import.meta.dirname, "./shared"),
              "@resources": path.resolve(import.meta.dirname, "./resources"),
            },
          },
        },
      },

      renderer: {},
    }),
  ],
});
