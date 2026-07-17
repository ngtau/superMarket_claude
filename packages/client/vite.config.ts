import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// §10：开发期 server.proxy 转发 /api 免 CORS
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""), // 后端路由无/api前缀(如/categories非/api/categories)
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // §10重型依赖隔离：react生态与radix-ui组件库独立chunk，与路由懒加载配合减小首屏JS体积
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-radix": [
            "@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs",
            "@radix-ui/react-collapsible", "@radix-ui/react-tooltip",
          ],
        },
      },
    },
  },
});
