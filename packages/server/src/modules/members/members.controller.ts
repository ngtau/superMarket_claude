import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { MembersService } from "./members.service.js";

@Controller("admin/users")
@UseGuards(RBACGuard)
@RequirePermissions("user:manage")
export class UsersAdminController {
  constructor(private readonly membersService: MembersService) {}
  @Get() findAll() { return this.membersService.findAllUsers(); }
  /** §6.7 行36：用户详情（注册信息 + 登录记录 + 订单历史） */
  @Get(":id") findOne(@Param("id") id: string) { return this.membersService.userDetail(id); }
  @Post(":id/disable") disable(@Param("id") id: string) { return this.membersService.toggleUserStatus(id, "disabled"); }
  @Post(":id/enable") enable(@Param("id") id: string) { return this.membersService.toggleUserStatus(id, "active"); }
  @Patch(":id/member-level") setLevel(@Param("id") id: string, @Body() body: { memberLevelId: string }) {
    return this.membersService.setUserLevel(id, body.memberLevelId);
  }
}

@Controller("admin/member-levels")
@UseGuards(RBACGuard)
@RequirePermissions("user:manage")
export class MemberLevelsController {
  constructor(private readonly membersService: MembersService) {}
  @Get() findAll() { return this.membersService.findAllLevels(); }
  @Post() create(@Body() body: { nameZh: string; nameEn: string; sort?: number }) { return this.membersService.createLevel(body); }
}
