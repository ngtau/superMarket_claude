import { Module } from "@nestjs/common";
import { ShippingTemplatesController, ShippingLogsController } from "./shipping.controller.js";
import { ShippingService } from "./shipping.service.js";

@Module({
  controllers: [ShippingTemplatesController, ShippingLogsController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
