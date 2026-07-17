import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { AdminsService } from "./admins.service.js";

@Controller("admin/admins")
@UseGuards(RBACGuard)
@RequirePermissions("system:manage")
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}
  @Get() findAll() { return this.adminsService.findAll(); }
  @Post() create(@Body() body: { username: string; password: string; roleId: string }) { return this.adminsService.create(body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.adminsService.update(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.adminsService.remove(id); }
}
