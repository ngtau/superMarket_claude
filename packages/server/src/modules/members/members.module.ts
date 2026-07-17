import { Module } from "@nestjs/common";
import { UsersAdminController, MemberLevelsController } from "./members.controller.js";
import { MembersService } from "./members.service.js";

@Module({
  controllers: [UsersAdminController, MemberLevelsController],
  providers: [MembersService],
})
export class MembersModule {}
