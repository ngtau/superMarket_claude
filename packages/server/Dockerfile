# 多阶段构建：在repo根目录context下构建，确保pnpm workspace能正确链接@app/shared
# 构建命令参考：docker build -f packages/server/Dockerfile -t apcube-server .（在仓库根目录执行）

FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /repo

# 先只拷贝依赖清单，最大化利用Docker层缓存
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /repo/packages/server/node_modules ./packages/server/node_modules
COPY . .
RUN pnpm --filter @app/shared build && pnpm --filter @app/server build

FROM node:22-slim AS runtime
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/packages/server ./packages/server
WORKDIR /repo/packages/server
# uploads目录：仅STORAGE_DRIVER=local时使用，Railway等平台部署务必改用STORAGE_DRIVER=r2（见部署文档）
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "--require", "dotenv/config", "dist/main.js"]
