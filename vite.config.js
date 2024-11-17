import {
  defineConfig
} from "vite";
import path from "path";
import webExtension from "@samrum/vite-plugin-web-extension";
import {
  optimizeLodashImports
} from "@optimize-lodash/rollup-plugin";
// import nodePolyfills from "rollup-plugin-polyfill-node";
import react from "@vitejs/plugin-react-swc";
import manifest from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig({
  // root: "./src/",
  // base: "/",
  // envDir: "../",
  // publicDir: "../public",
  plugins: [
    webExtension({
      manifest: {
        ...manifest,
      },
      additionalInputs: {
        scripts: [
          {
            fileName: 'src/content/index.html',
            webAccessible: true,
          },
        ],
      },
      useDynamicUrlWebAccessibleResources: false,
      // optimizeWebAccessibleResources: false,
      // devHtmlTransform: true,
    }),
    react(),
    // optimizeLodashImports(),
  ],
  server: {
    host: "0.0.0.0",
    port: 30,
    strictPort: true,
    // open: true,
  },
  css: {
    devSourcemap: true,
  },
  // rollupOptions: {
  //   plugins: [nodePolyfills()],
  // },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src/newtab"),
    },
  },
  build: {
    outDir: "./dist",
    // assetsInlineLimit: 4096,
    // chunkSizeWarningLimit: 2000,
    emptyOutDir: true,
    // cssCodeSplit: false,
    sourcemap: false,
    // minify: "terser",
    rollupOptions: {
      input: {
        content: 'src/content/index.html',
        // options: resolve(__dirname, "./src/options.html"),
      },
      output: {
        chunkFileNames: "static/js/[name]-[hash].js",
        entryFileNames: "static/js/[name]-[hash].js",
        assetFileNames: "static/[ext]/name-[hash].[ext]",
      },
    },
  },
});