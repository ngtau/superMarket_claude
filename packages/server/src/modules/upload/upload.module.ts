import { Module } from "@nestjs/common";
import { AdminUploadController, CustomerUploadController } from "./upload.controller.js";
import { StorageService } from "./storage.service.js";

@Module({
  controllers: [AdminUploadController, CustomerUploadController],
  providers: [StorageService],
})
export class UploadModule {}
