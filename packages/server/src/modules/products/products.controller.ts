import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { CurrentLocale } from "../../common/decorators/locale.decorator.js";
import type { Locale } from "@app/shared";
import { ProductsService } from "./products.service.js";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(
    @CurrentLocale() locale: Locale,
    @Query("categoryId") categoryId?: string,
    @Query("keyword") keyword?: string,
    @Query("priceMin") priceMin?: string,
    @Query("priceMax") priceMax?: string,
    @Query("sort") sort?: "sales" | "new" | "discount",
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20"
  ) {
    return this.productsService.list(
      {
        categoryId, keyword,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
        sort,
        page: Number(page),
        pageSize: Number(pageSize),
      },
      locale
    );
  }

  @Get("recommendations")
  recommendations(@Query("slot") slot: string, @CurrentLocale() locale: Locale) {
    return this.productsService.recommendations(slot, locale);
  }

  @Get(":id")
  detail(@Param("id") id: string, @CurrentLocale() locale: Locale) {
    return this.productsService.detail(id, locale);
  }
}

@Controller("admin/products")
@UseGuards(RBACGuard)
@RequirePermissions("product:manage")
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAllAdmin();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }

  @Post(":id/shelf")
  toggleShelf(@Param("id") id: string, @Body() body: { status: "on_shelf" | "off_shelf" }) {
    return this.productsService.toggleShelf(id, body.status);
  }

  @Post("batch-shelf")
  batchShelf(@Body() body: { ids: string[]; status: "on_shelf" | "off_shelf" }) {
    return this.productsService.batchShelf(body.ids, body.status);
  }
}
