import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { CurrentLocale } from "../../common/decorators/locale.decorator.js";
import type { Locale } from "@app/shared";
import { CategoriesService } from "./categories.service.js";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  tree(@CurrentLocale() locale: Locale) {
    return this.categoriesService.tree(locale);
  }
}

@Controller("admin/categories")
@UseGuards(RBACGuard)
@RequirePermissions("product:manage")
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAllAdmin();
  }

  @Post()
  create(@Body() body: { nameZh: string; nameEn: string; parentId?: string; sort?: number }) {
    return this.categoriesService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.categoriesService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.categoriesService.remove(id);
  }
}
