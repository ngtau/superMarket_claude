import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import { AddressesService } from "./addresses.service.js";

@Controller("addresses")
@UseGuards(JwtUserGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  findAll(@CurrentUser() user: UserPrincipal) {
    return this.addressesService.findAll(user.userId);
  }

  @Post()
  create(@CurrentUser() user: UserPrincipal, @Body() body: { recipient: string; phoneEncrypted: string; detail: string; isDefault?: boolean }) {
    return this.addressesService.create(user.userId, body);
  }

  @Patch(":id")
  update(@CurrentUser() user: UserPrincipal, @Param("id") id: string, @Body() body: any) {
    return this.addressesService.update(user.userId, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: UserPrincipal, @Param("id") id: string) {
    return this.addressesService.remove(user.userId, id);
  }
}
