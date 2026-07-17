import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import { CheckoutService } from "./checkout.service.js";

@Controller()
@UseGuards(JwtUserGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post("checkout/preview")
  preview(@CurrentUser() user: UserPrincipal, @Body() body: { cartItemIds: string[] }) {
    return this.checkoutService.preview(user.userId, body.cartItemIds);
  }

  @Post("orders")
  placeOrder(
    @CurrentUser() user: UserPrincipal,
    @Body() body: { cartItemIds: string[]; addressId: string; paymentMethod: string; remark?: string }
  ) {
    return this.checkoutService.placeOrder(user.userId, body.cartItemIds, body.addressId, body.paymentMethod, body.remark);
  }
}
