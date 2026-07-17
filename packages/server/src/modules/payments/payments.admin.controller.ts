import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { PaymentsAdminService } from "./payments.admin.service.js";

@Controller("admin/payments")
@UseGuards(RBACGuard)
@RequirePermissions("payment:manage")
export class PaymentsAdminController {
  constructor(private readonly paymentsAdminService: PaymentsAdminService) {}

  @Get("review-queue")
  reviewQueue() {
    return this.paymentsAdminService.reviewQueue();
  }

  @Post(":id/approve")
  approve(@Param("id") id: string) {
    return this.paymentsAdminService.approve(id);
  }

  @Post(":id/reject")
  reject(@Param("id") id: string) {
    return this.paymentsAdminService.reject(id);
  }
}

@Controller("admin/payment-methods")
@UseGuards(RBACGuard)
@RequirePermissions("payment:manage")
export class PaymentMethodsController {
  constructor(private readonly paymentsAdminService: PaymentsAdminService) {}

  @Get()
  findAll() {
    return this.paymentsAdminService.findAllMethods();
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { enabled?: boolean; merchantInfo?: Record<string, string>; config?: Record<string, unknown> }) {
    return this.paymentsAdminService.updateMethod(id, body);
  }
}
