import { Module } from "@nestjs/common";
import { ProductsController, AdminProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";

@Module({
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
