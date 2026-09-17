import { Module } from "@nestjs/common";
import { StatsController } from "./stats.controller.js";
import { TrackingController } from "./tracking.controller.js";
import { StatsService } from "./stats.service.js";
import { TrackingService } from "./tracking.service.js";

@Module({
  controllers: [StatsController, TrackingController],
  providers: [StatsService, TrackingService],
})
export class StatsModule {}
