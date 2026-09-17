import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerService } from "./scheduler.service.js";
import { OrdersAdminService } from "../orders/orders.admin.service.js";
import { InventoryService } from "../inventory/inventory.service.js";
import { SettingsModule } from "../settings/settings.module.js";

@Module({
  imports: [ScheduleModule.forRoot(), SettingsModule],
  providers: [SchedulerService, OrdersAdminService, InventoryService],
})
export class SchedulerModule {}
