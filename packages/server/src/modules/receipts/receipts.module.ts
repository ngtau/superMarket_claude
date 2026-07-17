import { Module } from "@nestjs/common";
import { ReceiptsController, ReceiptsAdminController } from "./receipts.controller.js";
import { ReceiptsService } from "./receipts.service.js";

@Module({
  controllers: [ReceiptsController, ReceiptsAdminController],
  providers: [ReceiptsService],
})
export class ReceiptsModule {}
