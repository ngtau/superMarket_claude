import { Module } from "@nestjs/common";
import {
  ContentPublicController, BannersAdminController, AnnouncementsAdminController,
  RecommendationsAdminController, FaqsAdminController,
} from "./content.controller.js";
import { ContentService } from "./content.service.js";

@Module({
  controllers: [ContentPublicController, BannersAdminController, AnnouncementsAdminController, RecommendationsAdminController, FaqsAdminController],
  providers: [ContentService],
})
export class ContentModule {}
