import { Module } from "@nestjs/common";
import { AdminsController } from "./admins.controller.js";
import { AdminAuthController } from "./admin-auth.controller.js";
import { AdminsService } from "./admins.service.js";
import { AdminAuthService } from "./admin-auth.service.js";

@Module({
  controllers: [AdminsController, AdminAuthController],
  providers: [AdminsService, AdminAuthService],
})
export class AdminsModule {}
