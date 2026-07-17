import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { CurrentLocale } from "../../common/decorators/locale.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import type { Locale } from "@app/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { CartService } from "./cart.service.js";
import { addItemSchema, updateItemSchema, mergeCartSchema } from "./dto.js";

@Controller("cart")
@UseGuards(JwtUserGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  get(@CurrentUser() user: UserPrincipal, @CurrentLocale() locale: Locale) {
    return this.cartService.get(user.userId, locale);
  }

  // ⚠️修复：@UsePipes()方法级装饰器会把校验套用到该方法的*所有*参数（包括@CurrentUser()的返回值），
  // 而不仅是@Body()。此前用@UsePipes导致：user对象(无skuId/qty字段)也被拿去校验addItemSchema，
  // 合法请求反而报"skuId/qty为必填"（因为user参数校验失败盖过了body参数校验成功的结果）。
  // 实测复现：qty=-5/0/1.5/99999正确报错(因body校验先失败)，但qty=3/7等合法值却报两字段Required。
  // 改为@Body(new ZodValidationPipe())仅作用于Body参数本身，才是正确用法。
  @Post("items")
  addItem(@CurrentUser() user: UserPrincipal, @Body(new ZodValidationPipe(addItemSchema)) body: { skuId: string; qty: number }) {
    return this.cartService.addItem(user.userId, body.skuId, body.qty);
  }

  @Patch("items/:id")
  updateItem(@CurrentUser() user: UserPrincipal, @Param("id") id: string, @Body(new ZodValidationPipe(updateItemSchema)) body: { qty?: number; checked?: boolean }) {
    return this.cartService.updateItem(user.userId, id, body);
  }

  @Delete("items/:id")
  removeItem(@CurrentUser() user: UserPrincipal, @Param("id") id: string) {
    return this.cartService.removeItem(user.userId, id);
  }

  @Post("merge")
  merge(@CurrentUser() user: UserPrincipal, @Body(new ZodValidationPipe(mergeCartSchema)) body: { items: { skuId: string; qty: number }[] }) {
    return this.cartService.merge(user.userId, body.items);
  }
}
