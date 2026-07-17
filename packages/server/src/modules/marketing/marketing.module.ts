import { Module } from "@nestjs/common";
import { DiscountsController, FullReductionsController } from "./marketing.controller.js";
import { MarketingService } from "./marketing.service.js";

@Module({
  controllers: [DiscountsController, FullReductionsController],
  providers: [MarketingService],
})
export class MarketingModule {}
