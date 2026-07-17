import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { NotificationService } from "../notification/notification.service.js";

@Module({
  controllers: [AuthController],
  providers: [AuthService, NotificationService],
  exports: [AuthService],
})
export class AuthModule {}
