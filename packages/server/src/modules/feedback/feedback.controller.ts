import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { FeedbackService } from "./feedback.service.js";

@Controller("feedbacks")
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // 登录/游客均可提交，游客态无JwtUserGuard，userId由前端按是否持有token自行判断传参
  @Post()
  submit(@Body() body: { userId?: string; contact?: string; type: "inquiry" | "complaint" | "suggestion"; orderId?: string; content: string }) {
    return this.feedbackService.submit(body);
  }

  @Get("mine")
  @UseGuards(JwtUserGuard)
  mine(@CurrentUser() user: UserPrincipal) {
    return this.feedbackService.myFeedbacks(user.userId);
  }
}

@Controller("admin/feedbacks")
@UseGuards(RBACGuard)
export class FeedbackAdminController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @RequirePermissions({ key: "user:manage", minAccess: "readonly" })
  findAll(@Query("status") status?: string, @Query("type") type?: string) {
    return this.feedbackService.findAll(status, type);
  }

  @Post(":id/reply")
  @RequirePermissions("user:manage")
  reply(@Param("id") id: string, @Body() body: { reply: string }) {
    return this.feedbackService.reply(id, body.reply);
  }
}
