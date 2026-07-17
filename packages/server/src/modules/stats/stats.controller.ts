import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { StatsService } from "./stats.service.js";

function parseRange(from?: string, to?: string) {
  return {
    from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: to ? new Date(to) : new Date(),
  };
}

@Controller("admin/stats")
@UseGuards(RBACGuard)
@RequirePermissions({ key: "dashboard:read", minAccess: "readonly" })
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("orders")
  orders(@Query("from") from?: string, @Query("to") to?: string) {
    const { from: f, to: t } = parseRange(from, to);
    return this.statsService.orderStats(f, t);
  }

  @Get("product-sales")
  productSales(@Query("categoryId") categoryId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    const { from: f, to: t } = parseRange(from, to);
    return this.statsService.productSales(f, t, categoryId);
  }

  @Get("payment-share")
  paymentShare(@Query("from") from?: string, @Query("to") to?: string) {
    const { from: f, to: t } = parseRange(from, to);
    return this.statsService.paymentShare(f, t);
  }

  @Get("traffic")
  traffic(@Query("from") from?: string, @Query("to") to?: string) {
    const { from: f, to: t } = parseRange(from, to);
    return this.statsService.traffic(f, t);
  }
}
