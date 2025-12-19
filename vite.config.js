import {
  defineConfig
} from "vite";
import path from "path";
import fs from "fs";
import webExtension from "@samrum/vite-plugin-web-extension";
// import {
//   optimizeLodashImports
// } from "@optimize-lodash/rollup-plugin";
// import nodePolyfills from "rollup-plugin-polyfill-node";
import react from "@vitejs/plugin-react-swc";
import manifest from "./src/manifest";
import manifestFirefox from "./src/manifest.firefox";

// 插件：排除 .DS_Store 和 __MACOSX 文件
function excludeSystemFiles() {
  
  return {
    name: 'exclude-system-files',
    generateBundle(options, bundle) {
      // 从 bundle 中移除系统文件
      Object.keys(bundle).forEach(fileName => {
        if (fileName.includes('.DS_Store') || 
            fileName.includes('__MACOSX') ||
            fileName.startsWith('__MACOSX/') ||
            fileName.includes('/__MACOSX/')) {
          delete bundle[fileName];
        }
      });
    },
    // 构建完成后清理文件系统中的系统文件
    closeBundle() {
      const distDir = path.resolve(process.cwd(), './dist');
      if (!fs.existsSync(distDir)) return;
      
      function removeSystemFiles(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        files.forEach(file => {
          const fullPath = path.join(dir, file.name);
          
          // 删除 .DS_Store 文件
          if (file.name === '.DS_Store') {
            try {
              fs.unlinkSync(fullPath);
              console.log(`Removed: ${fullPath}`);
            } catch (err) {
              // 忽略错误
            }
          }
          
          // 删除 __MACOSX 目录
          if (file.name === '__MACOSX' && file.isDirectory()) {
            try {
              fs.rmSync(fullPath, { recursive: true, force: true });
              console.log(`Removed directory: ${fullPath}`);
            } catch (err) {
              // 忽略错误
            }
          }
          
          // 递归处理子目录
          if (file.isDirectory() && file.name !== '__MACOSX') {
            removeSystemFiles(fullPath);
          }
        });
      }
      
      removeSystemFiles(distDir);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  // root: "./src/",
  // base: "/",
  // envDir: "../",
  // publicDir: "../public",
  plugins: (() => {
    const target = process.env.TARGET || process.env.BROWSER || "chrome";
    const isFirefox = target === "firefox";
    const baseManifest = isFirefox ? manifestFirefox : manifest;

    return [
      webExtension({
        manifest: {
          ...baseManifest,
        },
        additionalInputs: {
          scripts: [
            {
              fileName: "src/content/index.html",
              webAccessible: true,
            },
          ],
        },
        useDynamicUrlWebAccessibleResources: false,
        // optimizeWebAccessibleResources: false,
        // devHtmlTransform: true,
      }),
      react(),
      excludeSystemFiles(),
      // optimizeLodashImports(),
    ];
  })(),
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