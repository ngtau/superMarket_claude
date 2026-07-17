import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { UserPrincipal } from "../../common/guards/jwt-user.guard.js";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { ReceiptsService } from "./receipts.service.js";

@Controller("orders/:id/receipt")
@UseGuards(JwtUserGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}
  @Get()
  get(@Param("id") id: string, @CurrentUser() user: UserPrincipal) {
    return this.receiptsService.getForUser(id, user.userId);
  }
}

@Controller("admin/orders/:id/receipt")
@UseGuards(RBACGuard)
@RequirePermissions({ key: "order:manage", minAccess: "readonly" })
export class ReceiptsAdminController {
  constructor(private readonly receiptsService: ReceiptsService) {}
  @Get()
  get(@Param("id") id: string) {
    return this.receiptsService.getForAdmin(id);
  }
}
