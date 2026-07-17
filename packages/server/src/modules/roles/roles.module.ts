import { Module } from "@nestjs/common";
import { RolesController, PermissionsController } from "./roles.controller.js";
import { RolesService } from "./roles.service.js";

@Module({
  controllers: [RolesController, PermissionsController],
  providers: [RolesService],
})
export class RolesModule {}
