import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * E2E 配置（§13 验收门禁）
 *
 * 设计取舍：
 * 1. workers=1 + fullyParallel=false —— 测试共用同一个数据库，订单/库存是共享状态，
 *    并行跑会互相踩（尤其库存预留与支付审核队列）。E2E 的价值在覆盖主链路，不在跑得快。
 * 2. 前端用 vite dev 而非 preview —— dev 自带 /api → 3000 的 proxy（见 vite.config.ts），
 *    无需额外配置 VITE_API_BASE_URL 与 CORS；preview 是纯静态服务，没有 proxy。
 * 3. server 用 `node dist/main.js`（start）而非 dev —— 启动快、无 watch，且强制要求先 build，
 *    顺带保证 E2E 跑的是与生产一致的产物。
 * 4. 数据库由外部提供（本地 docker compose，CI 用 service container），
 *    本配置不负责起库：Playwright 的 webServer 只适合起无状态进程，起容器会拖垮启动等待逻辑。
 */

const SERVER_PORT = Number(process.env.E2E_SERVER_PORT ?? 3000);
const CLIENT_PORT = Number(process.env.E2E_CLIENT_PORT ?? 5173);
const rootDir = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${CLIENT_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "zh-HK",
  },
  webServer: [
    {
      command: `pnpm --filter @app/server start`,
      cwd: rootDir,
      url: `http://127.0.0.1:${SERVER_PORT}/categories`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        PORT: String(SERVER_PORT),
        NODE_ENV: "test",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `node "${path.join(rootDir, "packages/client/node_modules/vite/bin/vite.js")}" --port ${CLIENT_PORT} --host 127.0.0.1 --strictPort`,
      cwd: path.join(rootDir, "packages/client"),
      url: `http://127.0.0.1:${CLIENT_PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
