import { Module } from "@nestjs/common";
import { SettingsController, AuditLogsController, BackupsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

@Module({
  controllers: [SettingsController, AuditLogsController, BackupsController],
  providers: [SettingsService],
  exports: [SettingsService], // 供 SchedulerModule 定时触发备份（D14）
})
export class SettingsModule {}
