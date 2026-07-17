import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import { PaymentsService } from "./payments.service.js";

@Controller("payments")
@UseGuards(JwtUserGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(":orderId")
  getStatus(@Param("orderId") orderId: string, @CurrentUser() user: UserPrincipal) {
    return this.paymentsService.getStatus(orderId, user.userId);
  }

  @Post(":orderId/voucher")
  uploadVoucher(@Param("orderId") orderId: string, @CurrentUser() user: UserPrincipal, @Body() body: { voucherUrl: string }) {
    return this.paymentsService.uploadVoucher(orderId, user.userId, body.voucherUrl);
  }

  @Get(":orderId/poll")
  poll(@Param("orderId") orderId: string, @CurrentUser() user: UserPrincipal) {
    return this.paymentsService.poll(orderId, user.userId);
  }
}
