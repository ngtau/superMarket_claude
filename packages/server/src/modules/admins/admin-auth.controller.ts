import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { CurrentAdmin } from "../../common/decorators/current-admin.decorator.js";
import type { AdminPrincipal } from "../../common/guards/rbac.guard.js";
import { AdminAuthService } from "./admin-auth.service.js";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  // 登录接口额外收紧限流：每分钟10次/IP，防暴力破解管理员密码（比全局60次/min更严格）
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("login")
  login(@Body() body: { username: string; password: string }) {
    return this.adminAuthService.login(body.username, body.password);
  }

  @Get("me")
  @UseGuards(RBACGuard)
  me(@CurrentAdmin() admin: AdminPrincipal) {
    return this.adminAuthService.me(admin.adminId);
  }
}
