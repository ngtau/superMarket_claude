import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import { OrdersService } from "./orders.service.js";

@Controller("orders")
@UseGuards(JwtUserGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentUser() user: UserPrincipal, @Query("status") status?: string) {
    return this.ordersService.list(user.userId, status);
  }

  @Get(":id")
  detail(@Param("id") id: string, @CurrentUser() user: UserPrincipal) {
    return this.ordersService.detail(id, user.userId);
  }

  @Post(":id/confirm-receipt")
  confirmReceipt(@Param("id") id: string, @CurrentUser() user: UserPrincipal) {
    return this.ordersService.confirmReceipt(id, user.userId);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: UserPrincipal) {
    return this.ordersService.cancel(id, user.userId);
  }
}
