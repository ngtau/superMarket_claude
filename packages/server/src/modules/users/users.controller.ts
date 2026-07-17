import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser, } from "../../common/decorators/current-user.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import { UsersService } from "./users.service.js";

@Controller("users")
@UseGuards(JwtUserGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: UserPrincipal) {
    return this.usersService.me(user.userId);
  }

  @Patch("me")
  updateMe(@CurrentUser() user: UserPrincipal, @Body() body: { locale?: string }) {
    return this.usersService.updateMe(user.userId, body);
  }
}
