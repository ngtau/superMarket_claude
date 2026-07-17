# APCube 部署说明

> 覆盖范围：商城前端（shop.apcube.com）+ 后台前端（admin.apcube.com）部署到 **Vercel**；后端（api.apcube.com）二选一部署到 **VPS** 或 **Railway**。
> 本文档基于当前代码库实际结构撰写，Vercel构建命令与本地文件存储路径已在开发环境实测；VPS/Railway的实际线上部署、Cloudflare R2对象存储、Dockerfile构建均**未在当前沙箱环境实测**（无Docker、无对应平台账号、网络白名单不含相关API），请按文档操作后自行验证，如遇报错可以把报错内容发我，我可以继续协助排查。

---

## 0. 整体架构与域名规划

```
                         ┌─────────────────────┐
   shop.apcube.com  ───▶ │                      │
   admin.apcube.com ───▶ │   Vercel (前端)       │───▶ api.apcube.com ───▶ 后端(VPS或Railway) ───▶ PostgreSQL(Neon/Supabase)
                         │  React SPA静态托管    │                              │
                         └─────────────────────┘                              ├──▶ Cloudflare R2(文件存储，Railway必需)
                                                                               ├──▶ Resend(邮件)
                                                                               └──▶ Sentry(错误监控，可选)

   所有域名均已用Cloudflare接入，橙色云朵代理(proxy)负责TLS终结+CDN+WAF
```

**⚠️关于前后台是否分开部署的说明**：当前代码是**一个统一的React SPA**，商城页面（`/`、`/products`等）和后台页面（`/admin/*`）打包在同一个产物里，靠前端路由区分，不是两个独立的构建产物。这与SDRS原始设想的"前后台分离打包、admin单独chunk隔离"有差距（属于工程优化项，不是功能缺陷——后台代码通过路由懒加载，访客不会主动下载到后台的JS，只是理论上能在浏览器网络面板里看到这些chunk文件名）。

本文档给出两种做法，**推荐方案A**，除非你有强烈的"后台代码物理隔离"需求：

- **方案A（推荐，本文档主要讲这个）**：只建**一个Vercel项目**，把`shop.apcube.com`和`admin.apcube.com`两个域名都绑定到这同一个项目上。两个域名访问的是同一份产物，用户访问哪个域名的哪个路径，就看到哪个页面，互不干扰。零代码改动，今天就能部署。
- **方案B（可选，需要额外开发工作）**：把`packages/client`拆成两个独立的Vite构建入口（`vite build`一次产出商城包，`vite build --mode admin`产出后台包，各自只含对应路由），建两个独立Vercel项目。这是原SDRS`build:admin`脚本的设计意图，但目前代码里这个脚本实际上和普通build没有区别（此前实现时没有真正做路由拆分）。如果你需要这个，告诉我，我可以另外花一轮把这个拆分做出来再部署。

下文按**方案A**给步骤。

---

## 1. 前置准备：你需要先注册/开通的账号

| 服务 | 用途 | 是否已有 |
|---|---|---|
| Vercel | 前端托管 | 需注册 |
| Neon 或 Supabase | PostgreSQL数据库 | 你之前说"后期配置"，现在是这个后期 |
| Resend | 找回密码邮件 | 同上，"后期配置" |
| Cloudflare | 域名DNS+CDN代理 | 你已有账号 |
| VPS服务商（如走方案1） | 后端服务器 | 需注册，如DigitalOcean/Vultr/Linode，选**新加坡**机房（对齐SDRS §13区域要求） |
| Railway（如走方案2） | 后端PaaS托管 | 需注册 |
| Cloudflare R2 | 文件对象存储（商品图/轮播图/付款凭证），**走Railway方案时必需** | 需在Cloudflare账号内开通 |

---

## 2. 数据库：Neon 或 Supabase 二选一

两者都提供免费额度的托管PostgreSQL，选一个即可，接口对代码而言完全一样（都是标准PostgreSQL连接串）。

### 2.1 Neon（推荐，D1决策里默认选项）
1. 打开 https://neon.tech 注册，New Project，Region选 **Singapore (ap-southeast-1)** 或最靠近你新加坡后端的区域。
2. 项目建好后，在Dashboard的"Connection Details"里，**注意有两种连接串**：
   - **Direct connection**（直连）：形如 `postgres://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/dbname`
   - **Pooled connection**（经PgBouncer池化）：形如 `postgres://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/dbname`
3. **按D1决策二选一**（这一点在代码里已经处理好，见`packages/server/src/db/client.ts`）：
   - 用Direct连接串 → `.env`里设 `DB_USE_CLIENT_POOL=true`（应用层建连接池，推荐，后端进程数少时够用）
   - 用Pooled连接串 → `.env`里设 `DB_USE_CLIENT_POOL=false`（避免应用层再套一层池，双重池化会有连接数问题）
4. 复制连接串，填入后端`.env`的`DATABASE_URL`。

### 2.2 Supabase（备选）
1. https://supabase.com 注册，New Project，Region选 Singapore。
2. Project Settings → Database，复制Connection string（选"URI"格式，注意Supabase默认给的是pooled连接，走`DB_USE_CLIENT_POOL=false`）。

### 2.3 跑迁移和种子数据
拿到`DATABASE_URL`后，在你本地机器（或VPS上，看你在哪一步先跑）执行：

```bash
cd packages/server
# .env 至少填好 DATABASE_URL 和 DB_USE_CLIENT_POOL
pnpm install --frozen-lockfile
npx drizzle-kit generate   # 若migrations文件已存在于仓库里，这步可跳过，除非你改过schema
node --require dotenv/config -e "require('tsx/cjs')" # 确保tsx可用，或直接：
npx tsx src/db/migrate.ts
npx tsx src/db/seed.ts
```

`seed.ts`会创建：7个内置角色权限矩阵、D20默认值登记册、全局默认运费模板，以及**一个初始超级管理员账号**：

- 用户名：`admin`（可用环境变量`SEED_ADMIN_USERNAME`覆盖）
- 密码：`ChangeMe123!`（可用环境变量`SEED_ADMIN_PASSWORD`覆盖）

**⚠️生产环境务必：**
1. 跑seed前就通过环境变量设置一个真实密码，不要用默认值；或者
2. 用默认值跑完种子后，**立刻用这个账号登录后台改密码**（Phase10已有的管理员账号管理功能里目前是新增/查看/改角色，暂无"改自己密码"入口——如果你需要这个功能我可以补，当前只能直接改数据库或用超管账号重新走一次"忘记密码"流程，但admin没有邮箱走不了这个流程。**最简单的办法**：直接在数据库里用bcrypt哈希手动更新，或者告诉我，我给你补一个管理员改密接口）。

---

## 3. 邮件服务：Resend

1. https://resend.com 注册，验证一个发信域名（如`apcube.com`本身，或子域名`mail.apcube.com`），按Resend给的DNS记录（SPF/DKIM）去Cloudflare DNS里添加。
2. Dashboard拿到API Key（`re_xxxxx`格式）。
3. 后端`.env`填：
   ```
   RESEND_API_KEY=re_xxxxx
   RESEND_FROM_EMAIL=no-reply@apcube.com   # 必须是已验证域名下的地址
   ```
4. **代码已做好优雅降级**：如果`RESEND_API_KEY`留空，找回密码功能不会报错，而是把重置链接打印到后端日志（详见`NotificationService`），方便你在正式配置Resend之前先让系统跑起来。

---

## 4. 文件存储：Cloudflare R2（Railway方案必需，VPS方案可选）

代码里`STORAGE_DRIVER`环境变量控制商品图/轮播图/付款凭证存哪：
- `STORAGE_DRIVER=local`（默认）：存后端进程所在服务器本地磁盘的`uploads/`目录。**只适合VPS**（单实例、磁盘持久）。
- `STORAGE_DRIVER=r2`：存Cloudflare R2（S3兼容对象存储）。**Railway/Render/Vercel Serverless等平台必须用这个**，因为这些平台的容器文件系统不持久、扩容出的多个实例也不共享磁盘，用local存储的话，图片过一段时间/扩容后就会访问不到。

### 4.1 开通R2
1. Cloudflare Dashboard → R2 → Create bucket，起个名字如`apcube-uploads`。
2. R2 → Manage R2 API Tokens → 创建一个有读写权限的Token，拿到：
   - Access Key ID
   - Secret Access Key
   - Account ID（在R2总览页能看到，用来拼endpoint）
3. 给bucket绑定一个公开访问的域名（R2 → 你的bucket → Settings → Public Access → 用自定义域名，比如`cdn.apcube.com`，或先用Cloudflare给的`*.r2.dev`临时域名测试）。

### 4.2 配置环境变量
```
STORAGE_DRIVER=r2
R2_ENDPOINT=https://<你的Account ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET=apcube-uploads
R2_PUBLIC_URL=https://cdn.apcube.com        # 或 https://xxxx.r2.dev
```

**⚠️诚实说明**：R2这条路径是按S3兼容API标准实现的（`packages/server/src/modules/upload/storage.service.ts`），本地`STORAGE_DRIVER=local`路径已经在开发环境反复实测；R2路径因为当前沙箱网络访问不了Cloudflare API，**没有实际跑通测试过**。建议你部署到Railway前，先在本地或VPS上把R2配置填好、手动上传一张图片验证一下这条链路（后台商品管理页面新增商品时选图片上传即可测试）。如果报错，把错误信息发我，大概率是endpoint/密钥格式问题，好排查。

---

## 5. 后端部署 —— 方案1：VPS

### 5.1 选服务器
新加坡机房的VPS，2核2G起步够用（对齐SDRS §13"Railway/Render Singapore"的区域要求，减少到数据库的网络延迟）。以Ubuntu 24.04为例，下面步骤在DigitalOcean/Vultr/Linode等主流VPS上都通用。

### 5.2 服务器初始化
```bash
# SSH登入后
apt update && apt upgrade -y
apt install -y curl git nginx ufw

# 装Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 装pnpm
corepack enable
corepack prepare pnpm@11.11.0 --activate

# 装PM2(进程守护)
npm install -g pm2

# 防火墙:只开22(SSH)/80/443,后端3000端口不对外开放(靠nginx反代)
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### 5.3 拉代码、构建、配置
```bash
git clone <你的仓库地址> /opt/apcube
cd /opt/apcube
pnpm install --frozen-lockfile

cd packages/server
cat > .env << 'ENVEOF'
DATABASE_URL=<第2步拿到的连接串>
DB_USE_CLIENT_POOL=true
JWT_ACCESS_SECRET=<openssl rand -hex 32 生成一个随机值>
JWT_REFRESH_SECRET=<另一个随机值,别跟上面一样>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
API_BASE_URL=https://api.apcube.com
CLIENT_ORIGIN=https://shop.apcube.com
ADMIN_ORIGIN=https://admin.apcube.com
RESEND_API_KEY=<第3步的key>
RESEND_FROM_EMAIL=no-reply@apcube.com
AES_ENCRYPTION_KEY=<openssl rand -hex 32 生成的随机值,32字节>
STORAGE_DRIVER=local
SENTRY_DSN=<可选>
PORT=3000
ENVEOF

# 构建(用已验证可用的方式,不要用 pnpm turbo run build,见下方"已知坑")
cd /opt/apcube
pnpm --filter @app/shared build
pnpm --filter @app/server build

cd packages/server
npx tsx src/db/migrate.ts
SEED_ADMIN_PASSWORD='<你自己定的强密码>' npx tsx src/db/seed.ts
mkdir -p uploads
```

### 5.4 用PM2守护进程
```bash
cd /opt/apcube/packages/server
pm2 start "node --require dotenv/config dist/main.js" --name apcube-api
pm2 save
pm2 startup   # 按提示执行它给出的命令,让PM2随系统启动自动拉起
```

常用命令：`pm2 logs apcube-api`看日志，`pm2 restart apcube-api`重启，`pm2 status`看状态。

### 5.5 Nginx反向代理
```nginx
# /etc/nginx/sites-available/apcube-api
server {
    listen 80;
    server_name api.apcube.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/apcube-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 5.6 Cloudflare接入 + TLS
1. Cloudflare DNS里给`api.apcube.com`加一条A记录，指向VPS的公网IP，**打开橙色云朵（proxy on）**。
2. Cloudflare SSL/TLS设置里，加密模式选**Full**（不是Full Strict，因为origin暂时没装真实证书，Full模式允许自签名/无证书，Cloudflare到访客之间是HTTPS，Cloudflare到源站之间可以是HTTP或自签HTTPS）。
   - 更安全的做法（推荐）：VPS上装`certbot`签发Let's Encrypt证书，nginx开443，Cloudflare加密模式改成**Full (strict)**。命令：`apt install certbot python3-certbot-nginx && certbot --nginx -d api.apcube.com`，然后把上面nginx配置里`listen 80`改成`listen 443 ssl`（certbot会自动帮你改）。

### 5.7 已知坑：不要直接用 `pnpm turbo run build`
本次部署文档撰写过程中实测发现：在某些非交互式终端环境下，`pnpm turbo run build`会触发pnpm的"未批准构建脚本"检查并卡死/报错，即使`pnpm-workspace.yaml`里配置了`onlyBuiltDependencies`也不一定生效。**规避方式：用`pnpm --filter @app/shared build && pnpm --filter @app/server build`分步构建**（本文档所有构建命令已经是这个写法）。如果你在VPS上依然遇到类似问题，先跑一次`pnpm approve-builds`（VPS有真实TTY，交互式选择应该没问题，不像本次沙箱环境卡死）。

---

## 6. 后端部署 —— 方案2：Railway（或类似PaaS，如Render）

### 6.1 关键前提：必须用R2存储
Railway的容器磁盘不持久、扩容出的实例不共享文件系统。**上传接口写死`STORAGE_DRIVER=local`的话，商品图片会随部署/扩容随机消失**。部署到Railway前，请确认已完成第4节的R2配置。

### 6.2 用Dockerfile部署（推荐，比Railway自动检测的Nixpacks更可靠）
Monorepo + pnpm workspace的构建顺序依赖（`@app/shared`必须先于`@app/server`构建）容易被自动检测的buildpack搞错，所以本仓库在`packages/server/Dockerfile`里写了一个多阶段构建文件。

1. Railway → New Project → Deploy from GitHub repo，选你的仓库。
2. Settings → Build：
   - Builder选 **Dockerfile**
   - Dockerfile Path填 `packages/server/Dockerfile`
   - **Build Context要设为仓库根目录**（不是`packages/server`！因为要复制`packages/shared`），Railway的"Root Directory"设置留空或设为`/`。
3. Settings → Variables，把第5.3节`.env`列的那些变量全部加进去（`DATABASE_URL`/`JWT_ACCESS_SECRET`等），额外加上R2那5个变量，并把`STORAGE_DRIVER`设为`r2`。
4. Settings → Networking → Generate Domain，Railway会给一个`xxx.up.railway.app`域名，先用这个测试后端是否正常跑起来。
5. 确认没问题后，Settings → Networking → Custom Domain，加`api.apcube.com`，Railway会给你一个CNAME目标，去Cloudflare DNS加一条CNAME记录指过去，**打开橙色云朵代理**。

### 6.3 数据库迁移
Railway容器是无状态的，迁移/种子不能靠"构建时自动跑"（否则每次部署都会重跑，有风险）。推荐用Railway的一次性任务或直接在本地/VPS上对着同一个`DATABASE_URL`跑：
```bash
DATABASE_URL=<Railway环境变量里那个值> npx tsx src/db/migrate.ts
DATABASE_URL=<同上> npx tsx src/db/seed.ts
```

### 6.4 关于定时任务（订单自动取消/自动确认收货）
代码里`@nestjs/schedule`的定时任务（`SchedulerService`）是跟主进程一起跑的常驻cron，Railway的常驻容器（非Serverless模式）能支撑这个，不需要额外配置。如果Railway把你的服务配置成会自动休眠的Serverless模式，这些定时任务在休眠期间不会执行——建议在Railway项目设置里确认服务是"always on"而不是"sleep on idle"。

---

## 7. 前端部署到 Vercel（商城 + 后台，方案A：一个项目两个域名）

### 7.1 创建Vercel项目
1. https://vercel.com → Add New → Project → 选你的GitHub仓库。
2. **Root Directory 保持仓库根目录不变**（不要设成`packages/client`，因为构建命令需要先构建`@app/shared`，必须能访问到整个monorepo）。
3. Vercel会自动读取仓库根目录的`vercel.json`（已经在仓库里配好）：
   ```json
   {
     "buildCommand": "pnpm --filter @app/shared build && pnpm --filter @app/client build",
     "outputDirectory": "packages/client/dist",
     "installCommand": "pnpm install --frozen-lockfile",
     "framework": "vite",
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
   这个构建命令已经在本地实测跑通过。`rewrites`那条是让React Router的客户端路由生效（否则直接刷新`/products`这种非首页路径会404，因为Vercel默认按静态文件路径找）。
4. Environment Variables加：
   ```
   VITE_API_BASE_URL=https://api.apcube.com
   VITE_ADMIN_ORIGIN=https://admin.apcube.com
   VITE_SENTRY_DSN=<可选>
   ```
5. Deploy。

### 7.2 绑定两个域名
1. Vercel项目 → Settings → Domains → 加`shop.apcube.com`，Vercel给你一个CNAME目标（形如`cname.vercel-dns.com`）。
2. 同一个项目里再加`admin.apcube.com`，同样给一个CNAME目标。
3. 去Cloudflare DNS，给这两个子域名都加CNAME记录指向Vercel给的目标，**橙色云朵代理打开**。
4. Vercel会自动走Let's Encrypt签证书，走通后两个域名访问的是**同一份构建产物**，前端会根据访问的域名自动判断显示商城还是后台界面（见下方7.3节）。

### 7.3 域名自动识别（已实现）
前端会读取`VITE_ADMIN_ORIGIN`环境变量，运行时比对`window.location.origin`，据此判断访问的是后台域名还是商城域名：
- 访问`admin.apcube.com`（根路径`/`）→ 自动跳转到`/admin/dashboard`（未登录会被`AdminLayout`自身的守卫再跳转到`/admin/login`）
- 访问`shop.apcube.com`（根路径`/`）→ 正常显示商城首页
- 未配置`VITE_ADMIN_ORIGIN`时（比如本地开发环境）→ 默认按商城域名处理，不影响现有开发体验
- 手动在浏览器地址栏输入跨域名的具体路径（比如在`admin.apcube.com`上手动敲`/products`）**不会被拦截**，这只是"默认落地页"的判断，不是访问控制——真正的访问控制仍然是后端RBAC守卫。如果需要更严格的域名级隔离，需要额外加一层前端路由守卫，告诉我可以再补。

在Vercel项目的Environment Variables里加上这一项（第7.1步的环境变量列表需要补充）：
```
VITE_ADMIN_ORIGIN=https://admin.apcube.com
```

---

## 8. Cloudflare DNS 总览

部署完成后，你的Cloudflare DNS记录大致是这样（域名以`apcube.com`为例）：

| 类型 | 名称 | 内容 | 代理状态 |
|---|---|---|---|
| CNAME | shop | cname.vercel-dns.com | 已代理 |
| CNAME | admin | cname.vercel-dns.com | 已代理 |
| A 或 CNAME | api | VPS公网IP 或 Railway给的CNAME目标 | 已代理 |
| TXT/CNAME | (Resend给的DKIM/SPF记录) | 按Resend要求填 | 不代理(DNS only) |
| CNAME | cdn (如果R2用自定义域) | R2给的目标 | 已代理 |

---

## 9. 部署后验证清单

按顺序检查，能帮你快速定位问题出在哪一层：

1. **数据库连通**：`curl https://api.apcube.com/categories` 应返回`[]`（空分类列表，非报错）
2. **后台登录**：`curl -X POST https://api.apcube.com/admin/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"<你设的密码>"}'` 应返回`accessToken`
3. **商城首页**：浏览器打开`https://shop.apcube.com`，应看到首页（分类为空时会显示"貨架還在整理中"的空态提示，这是正常的）
4. **后台页面**：浏览器打开`https://admin.apcube.com/admin/login`，用上一步的账号登录，应能看到数据看板
5. **文件上传**：后台商品管理页新增商品时上传一张图片，检查图片能否正常显示（这一步能验证R2或本地存储配置是否正确）
6. **找回密码邮件**：商城`/forgot-password`页测试一次，检查邮箱是否收到（如果Resend还没配置好，检查后端日志里是否打印了`[dev-mode]`降级提示）
7. **CORS**：浏览器打开商城页面的开发者工具Network面板，确认API请求没有CORS报错（如果`.env`里的`CLIENT_ORIGIN`/`ADMIN_ORIGIN`跟实际域名不一致会出现这个问题）

---

## 10. 环境变量完整清单（后端）

```bash
# 数据库
DATABASE_URL=
DB_USE_CLIENT_POOL=true   # Direct连接串用true，Pooled连接串用false

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# 域名(CORS白名单依据)
API_BASE_URL=https://api.apcube.com
CLIENT_ORIGIN=https://shop.apcube.com
ADMIN_ORIGIN=https://admin.apcube.com

# 邮件
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@apcube.com

# 加密
AES_ENCRYPTION_KEY=   # 32字节随机值，用于地址手机号/支付渠道商户信息等敏感字段加密

# 文件存储：local(VPS可用) 或 r2(Railway等平台必需)
STORAGE_DRIVER=local
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=

# 监控(可选)
SENTRY_DSN=

# 种子数据(仅seed脚本用到，不需要常驻)
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=

PORT=3000
```

前端（Vercel）：
```bash
VITE_API_BASE_URL=https://api.apcube.com
VITE_ADMIN_ORIGIN=https://admin.apcube.com
VITE_SENTRY_DSN=
```

---

## 11. 尚未覆盖 / 建议后续补充的事项

- **管理员自助改密码**：当前没有"管理员登录后自己改密码"的接口，只能改数据库或用超管重建账号。建议部署前告诉我，我可以补一个。
- **Grafana Cloud / Loki监控接入**：SDRS提到的这部分，需要你先有Grafana Cloud账号，我目前只接了Sentry。
- **CI/CD自动部署**：`.github/workflows/ci.yml`目前只做构建+测试，没有自动部署到Vercel/Railway的步骤（这两个平台通常靠各自的GitHub App自动监听push即可，不一定需要在GitHub Actions里额外写部署脚本，但如果你想要更细的控制，可以告诉我加上）。
- **数据库备份**：Neon/Supabase的免费层有基础的PITR，但生产环境建议额外配置定时导出（`SettingsService.triggerBackup()`目前只是骨架，实际导出逻辑待你确定备份策略后再实现）。
