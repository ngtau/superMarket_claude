import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes } from "@nestjs/common";
import { discountInputSchema, fullReductionInputSchema } from "@app/shared";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { MarketingService } from "./marketing.service.js";

@Controller("admin/discounts")
@UseGuards(RBACGuard)
@RequirePermissions("marketing:manage")
export class DiscountsController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get() findAll() { return this.marketingService.findAllDiscounts(); }

  // ⚠️修复：此前create()收裸body:any，@app/shared里早就写好的percent/special互斥Zod校验(discountInputSchema)
  // 从未真正接入这个端点——校验逻辑存在、单元测试也通过，但从未在真实API请求路径上生效。现补上。
  @Post()
  @UsePipes(new ZodValidationPipe(discountInputSchema))
  create(@Body() body: any) { return this.marketingService.create(body); }

  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.marketingService.update(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.marketingService.remove(id); }

  @Post("batch")
  batchCreate(@Body() body: { productIds: string[] } & any) {
    const { productIds, ...rest } = body;
    return this.marketingService.batchCreate(productIds, rest);
  }
}

@Controller("admin/full-reductions")
@UseGuards(RBACGuard)
@RequirePermissions("marketing:manage")
export class FullReductionsController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get() findAll() { return this.marketingService.findAllFullReductions(); }

  @Post()
  @UsePipes(new ZodValidationPipe(fullReductionInputSchema))
  create(@Body() body: any) { return this.marketingService.createFullReduction(body); }

  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.marketingService.updateFullReduction(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.marketingService.removeFullReduction(id); }
}
