import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { CurrentLocale } from "../../common/decorators/locale.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import type { Locale } from "@app/shared";
import { FavoritesService } from "./favorites.service.js";

@Controller()
@UseGuards(JwtUserGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get("favorites")
  list(@CurrentUser() user: UserPrincipal, @CurrentLocale() locale: Locale) {
    return this.favoritesService.list(user.userId, locale);
  }

  @Post("favorites/:productId")
  add(@CurrentUser() user: UserPrincipal, @Param("productId") productId: string) {
    return this.favoritesService.add(user.userId, productId);
  }

  @Delete("favorites/:productId")
  remove(@CurrentUser() user: UserPrincipal, @Param("productId") productId: string) {
    return this.favoritesService.remove(user.userId, productId);
  }
}
