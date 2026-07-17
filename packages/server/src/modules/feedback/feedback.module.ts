import { Module } from "@nestjs/common";
import { FeedbackController, FeedbackAdminController } from "./feedback.controller.js";
import { FeedbackService } from "./feedback.service.js";

@Module({
  controllers: [FeedbackController, FeedbackAdminController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
