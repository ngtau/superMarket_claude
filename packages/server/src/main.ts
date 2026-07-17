import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RolesModule } from "./modules/roles/roles.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { AddressesModule } from "./modules/addresses/addresses.module.js";
import { FavoritesModule } from "./modules/favorites/favorites.module.js";
import { UploadModule } from "./modules/upload/upload.module.js";
import { CategoriesModule } from "./modules/categories/categories.module.js";
import { ProductsModule } from "./modules/products/products.module.js";
import { InventoryModule } from "./modules/inventory/inventory.module.js";
import { CartModule } from "./modules/cart/cart.module.js";
import { CheckoutModule } from "./modules/checkout/checkout.module.js";
import { OrdersModule } from "./modules/orders/orders.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { MarketingModule } from "./modules/marketing/marketing.module.js";
import { ContentModule } from "./modules/content/content.module.js";
import { FeedbackModule } from "./modules/feedback/feedback.module.js";
import { AdminsModule } from "./modules/admins/admins.module.js";
import { MembersModule } from "./modules/members/members.module.js";
import { SettingsModule } from "./modules/settings/settings.module.js";
import { StatsModule } from "./modules/stats/stats.module.js";
import { ReceiptsModule } from "./modules/receipts/receipts.module.js";
import { SchedulerModule } from "./modules/scheduler/scheduler.module.js";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter.js";

// D6：Sentry异常监控初始化（SENTRY_DSN未配置时SDK自动降级为no-op，不影响本地开发）
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });

// Phase 14：安全加固(限流) + 定时任务 全部接入
@Module({
  imports: [
    // §11安全合规：登录/注册/找回密码等敏感接口全局限流，默认每分钟60次/IP，防暴力破解与信道滥用
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    // 本地磁盘上传文件的静态服务（生产环境切换对象存储后移除此项，见upload.controller.ts注释）
    ServeStaticModule.forRoot({
      rootPath: join(fileURLToPath(new URL(".", import.meta.url)), "..", "uploads"),
      serveRoot: "/uploads",
    }),
    RolesModule, AuthModule, UsersModule, AddressesModule, FavoritesModule, UploadModule,
    CategoriesModule, ProductsModule, InventoryModule, CartModule, CheckoutModule,
    OrdersModule, PaymentsModule, MarketingModule, ContentModule, FeedbackModule,
    AdminsModule, MembersModule, SettingsModule, StatsModule, ReceiptsModule,
    SchedulerModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // D11：Helmet基础安全头 + CSP（前端资源域名收窄到自身域，禁止内联脚本注入）
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind运行时注入style，暂放开unsafe-inline
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", process.env.API_BASE_URL ?? ""],
        },
      },
      hsts: { maxAge: 15552000, includeSubDomains: true }, // D11：HSTS
    })
  );

  // §8.1：精确源CORS，禁止 * + credentials
  app.enableCors({
    origin: [
      process.env.CLIENT_ORIGIN ?? "https://shop.apcube.com",
      process.env.ADMIN_ORIGIN ?? "https://admin.apcube.com",
    ],
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port, "0.0.0.0");
  console.log(`[server] listening on 0.0.0.0:${port}`);
}

bootstrap();
