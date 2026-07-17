import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { CurrentLocale } from "../../common/decorators/locale.decorator.js";
import type { Locale } from "@app/shared";
import { ContentService } from "./content.service.js";

@Controller()
export class ContentPublicController {
  constructor(private readonly contentService: ContentService) {}

  @Get("banners") banners() { return this.contentService.bannersPublic(); }
  @Get("announcements") announcements() { return this.contentService.announcementsPublic(); }
  @Get("faqs") faqs(@CurrentLocale() locale: Locale) { return this.contentService.faqsPublic(locale); }
}

@Controller("admin/banners")
@UseGuards(RBACGuard)
@RequirePermissions("marketing:manage") // 内容管理归入营销管理员权限范围（§7.5未单列content权限点）
export class BannersAdminController {
  constructor(private readonly contentService: ContentService) {}
  @Get() findAll() { return this.contentService.findAllBanners(); }
  @Post() create(@Body() body: any) { return this.contentService.createBanner(body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.contentService.updateBanner(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.contentService.removeBanner(id); }
}

@Controller("admin/announcements")
@UseGuards(RBACGuard)
@RequirePermissions("marketing:manage")
export class AnnouncementsAdminController {
  constructor(private readonly contentService: ContentService) {}
  @Get() findAll() { return this.contentService.findAllAnnouncements(); }
  @Post() create(@Body() body: any) { return this.contentService.createAnnouncement(body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.contentService.updateAnnouncement(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.contentService.removeAnnouncement(id); }
}

@Controller("admin/recommendations")
@UseGuards(RBACGuard)
@RequirePermissions("marketing:manage")
export class RecommendationsAdminController {
  constructor(private readonly contentService: ContentService) {}
  @Get() findAll() { return this.contentService.findAllRecommendations(); }
  @Post() create(@Body() body: any) { return this.contentService.setRecommendation(body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.contentService.removeRecommendation(id); }
}

@Controller("admin/faqs")
@UseGuards(RBACGuard)
@RequirePermissions("system:manage")
export class FaqsAdminController {
  constructor(private readonly contentService: ContentService) {}
  @Get() findAll() { return this.contentService.findAllFaqs(); }
  @Post() create(@Body() body: any) { return this.contentService.createFaq(body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.contentService.updateFaq(id, body); }
  @Delete(":id") remove(@Param("id") id: string) { return this.contentService.removeFaq(id); }
}
