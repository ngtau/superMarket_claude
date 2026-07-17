import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { CurrentAdmin } from "../../common/decorators/current-admin.decorator.js";
import type { AdminPrincipal } from "../../common/guards/rbac.guard.js";
import { OrdersAdminService } from "./orders.admin.service.js";

@Controller("admin/orders")
@UseGuards(RBACGuard)
@RequirePermissions("order:manage")
export class OrdersAdminController {
  constructor(private readonly ordersAdminService: OrdersAdminService) {}

  @Get()
  findAll(
    @Query("orderNo") orderNo?: string,
    @Query("userId") userId?: string,
    @Query("status") status?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string
  ) {
    return this.ordersAdminService.findAll({
      orderNo, userId, status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  // 注意路由声明顺序：export 是静态路径，必须写在 :id 动态路由之前，否则会被 :id 抢先匹配（Nest按声明顺序匹配）
  @Get("export")
  async export(@Res() res: Response, @Query("status") status?: string, @Query("dateFrom") dateFrom?: string, @Query("dateTo") dateTo?: string) {
    const csv = await this.ordersAdminService.exportCsv({
      status, dateFrom: dateFrom ? new Date(dateFrom) : undefined, dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
    res.send("\uFEFF" + csv); // BOM前缀避免Excel打开中文乱码
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.ordersAdminService.findOne(id);
  }

  @Post(":id/ship")
  @RequirePermissions("order:ship")
  ship(@Param("id") id: string, @Body() body: { trackingNo: string }) {
    return this.ordersAdminService.ship(id, body.trackingNo);
  }

  @Post(":id/close")
  close(@Param("id") id: string) {
    return this.ordersAdminService.close(id);
  }

  @Post(":id/remark")
  remark(@Param("id") id: string, @Body() body: { remark: string }) {
    return this.ordersAdminService.remark(id, body.remark);
  }

  @Patch(":id/price")
  updatePrice(@Param("id") id: string, @CurrentAdmin() admin: AdminPrincipal, @Body() body: { newTotalCents: number; reason: string }) {
    return this.ordersAdminService.updatePrice(id, body.newTotalCents, admin.adminId, body.reason);
  }
}
