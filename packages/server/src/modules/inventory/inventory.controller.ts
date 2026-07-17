import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { InventoryAdminService } from "./inventory.admin.service.js";

@Controller("admin/inventory")
@UseGuards(RBACGuard)
@RequirePermissions("product:manage")
export class InventoryController {
  constructor(private readonly inventoryAdminService: InventoryAdminService) {}

  @Get("warnings")
  warnings() {
    return this.inventoryAdminService.warnings();
  }

  @Get(":skuId")
  findOne(@Param("skuId") skuId: string) {
    return this.inventoryAdminService.findOne(skuId);
  }

  @Patch(":skuId")
  update(@Param("skuId") skuId: string, @Body() body: { stock?: number; warnThreshold?: number | null }) {
    return this.inventoryAdminService.update(skuId, body);
  }
}
