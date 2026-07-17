import { Module } from "@nestjs/common";
import { SettingsController, AuditLogsController, BackupsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

@Module({
  controllers: [SettingsController, AuditLogsController, BackupsController],
  providers: [SettingsService],
})
export class SettingsModule {}
