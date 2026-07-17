import { Module } from "@nestjs/common";
import { CategoriesController, AdminCategoriesController } from "./categories.controller.js";
import { CategoriesService } from "./categories.service.js";

@Module({
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
