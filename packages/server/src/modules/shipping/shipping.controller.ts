import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { ShippingService } from "./shipping.service.js";

/** §6.3 行25：运费模板后台配置（首重/续重/满额包邮阈值，金额一律以「分」计，D19） */
@Controller("admin/shipping-templates")
@UseGuards(RBACGuard)
@RequirePermissions("payment:manage")
export class ShippingTemplatesController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  findAll() {
    return this.shippingService.findAllTemplates();
  }

  @Get("bindings")
  findBindings() {
    return this.shippingService.findBindings();
  }

  @Post()
  create(@Body() body: {
    nameZh: string; nameEn: string; firstWeightCents: number; firstWeightKg?: number;
    extraWeightCents: number; freeShippingThresholdCents?: number | null; isDefault?: boolean; enabled?: boolean;
  }) {
    return this.shippingService.createTemplate(body);
  }

  // 静态路径必须先于 ":id" 动态路由声明（NestJS 按声明顺序匹配同 method 路由）
  @Post("bindings")
  createBinding(@Body() body: { templateId: string; scope: "product" | "category"; productId?: string; categoryId?: string }) {
    return this.shippingService.createBinding(body);
  }

  @Delete("bindings/:id")
  removeBinding(@Param("id") id: string) {
    return this.shippingService.removeBinding(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.shippingService.updateTemplate(id, body as never);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.shippingService.removeTemplate(id);
  }
}

/** §6.3 行26：支付与物流操作日志（另见 /admin/audit-logs 全量审计） */
@Controller("admin/shipping-logs")
@UseGuards(RBACGuard)
@RequirePermissions("payment:manage")
export class ShippingLogsController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  logs(@Query("limit") limit = "100") {
    return this.shippingService.logs(Number(limit));
  }
}
