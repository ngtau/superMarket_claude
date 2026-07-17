import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller.js";
import { InventoryAdminService } from "./inventory.admin.service.js";
import { InventoryService } from "./inventory.service.js";

@Module({
  controllers: [InventoryController],
  providers: [InventoryAdminService, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
