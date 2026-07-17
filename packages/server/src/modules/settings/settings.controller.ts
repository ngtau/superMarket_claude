import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { SettingsService } from "./settings.service.js";

@Controller("admin/settings")
@UseGuards(RBACGuard)
@RequirePermissions("system:manage")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("defaults")
  getDefaults() { return this.settingsService.getD20Defaults(); }

  @Patch("defaults/:key")
  setDefault(@Param("key") key: string, @Body() body: { value: unknown }) {
    return this.settingsService.setD20Default(key, body.value);
  }

  @Get("platform-info")
  getPlatformInfo() { return this.settingsService.getPlatformInfo(); }

  @Patch("platform-info")
  updatePlatformInfo(@Body() body: Record<string, string>) {
    return this.settingsService.updatePlatformInfo(body);
  }

  @Get("locale")
  getLocale() { return this.settingsService.getByKeys(["admin_default_locale"]); }

  @Patch("locale")
  setLocale(@Body() body: { locale: string }) {
    return this.settingsService.set("admin_default_locale", body.locale);
  }
}

@Controller("admin/audit-logs")
@UseGuards(RBACGuard)
@RequirePermissions({ key: "audit:read", minAccess: "readonly" })
export class AuditLogsController {
  constructor(private readonly settingsService: SettingsService) {}
  @Get() findAll() { return this.settingsService.auditLogs(); }
}

@Controller("admin/backups")
@UseGuards(RBACGuard)
@RequirePermissions("system:manage")
export class BackupsController {
  constructor(private readonly settingsService: SettingsService) {}
  @Post("trigger") trigger() { return this.settingsService.triggerBackup(); }
  @Get() findAll() { return this.settingsService.backups(); }
}
