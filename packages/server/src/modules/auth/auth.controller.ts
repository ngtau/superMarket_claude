import { Body, Controller, HttpCode, Post, UsePipes } from "@nestjs/common";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { AuthService } from "./auth.service.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, refreshSchema } from "./dto.js";

// 对齐 API契约文档 §1
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: { email: string; password: string }) {
    return this.authService.register(body.email, body.password);
  }

  @Post("login")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post("refresh")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(refreshSchema))
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(refreshSchema))
  async logout(@Body() body: { refreshToken: string }) {
    await this.authService.logout(body.refreshToken);
    return { success: true };
  }

  @Post("password/forgot")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() body: { email: string }) {
    // resetUrlBase 生产环境应指向 shop.apcube.com 的重置页面
    await this.authService.forgotPassword(body.email, `${process.env.CLIENT_ORIGIN}/reset-password`);
    return { success: true }; // 统一返回成功，不暴露邮箱是否存在（防枚举）
  }

  @Post("password/reset")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { success: true };
  }
}
