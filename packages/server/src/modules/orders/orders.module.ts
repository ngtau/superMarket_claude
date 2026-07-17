import { Module } from "@nestjs/common";
import { OrdersAdminController } from "./orders.controller.js";
import { OrdersController } from "./orders.controller.c.js";
import { OrdersAdminService } from "./orders.admin.service.js";
import { OrdersService } from "./orders.service.js";
import { InventoryService } from "../inventory/inventory.service.js";

@Module({
  controllers: [OrdersAdminController, OrdersController],
  providers: [OrdersAdminService, OrdersService, InventoryService],
})
export class OrdersModule {}
