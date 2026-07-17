import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { RolesService } from "./roles.service.js";

// 对齐 API契约文档 §14：系统设置 —— 角色与权限点管理，需 system:manage 权限
@Controller("admin/roles")
@UseGuards(RBACGuard)
@RequirePermissions("system:manage")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  create(@Body() body: { key: string; nameZh: string; nameEn: string }) {
    return this.rolesService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { nameZh?: string; nameEn?: string }) {
    return this.rolesService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.rolesService.remove(id);
  }

  @Get(":id/permissions")
  getPermissions(@Param("id") id: string) {
    return this.rolesService.rolePermissions(id);
  }

  @Put(":id/permissions")
  setPermissions(
    @Param("id") id: string,
    @Body() body: { grants: { permission: string; access: "full" | "readonly" | "none" }[] }
  ) {
    return this.rolesService.setRolePermissions(id, body.grants);
  }
}

@Controller("admin/permissions")
@UseGuards(RBACGuard)
@RequirePermissions("system:manage")
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("catalog")
  catalog() {
    return this.rolesService.permissionCatalog();
  }
}
