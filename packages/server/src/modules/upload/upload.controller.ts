import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { RBACGuard } from "../../common/guards/rbac.guard.js";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { JwtUserGuard } from "../../common/guards/jwt-user.guard.js";
import { StorageService } from "./storage.service.js";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const fileFilter = (_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    cb(new BadRequestException("僅支援 JPEG/PNG/WEBP/GIF 圖片格式"), false);
    return;
  }
  cb(null, true);
};

// memoryStorage：文件先进内存buffer，再由StorageService决定落盘(local)或转存R2，两种驱动共用同一套接收逻辑
const interceptorOptions = { storage: memoryStorage(), fileFilter, limits: { fileSize: MAX_SIZE_BYTES } };

@Controller("admin/upload")
@UseGuards(RBACGuard)
@RequirePermissions({ key: "product:manage", minAccess: "readonly" })
export class AdminUploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", interceptorOptions))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("未收到檔案");
    return this.storageService.save(file);
  }
}

@Controller("upload")
@UseGuards(JwtUserGuard)
export class CustomerUploadController {
  constructor(private readonly storageService: StorageService) {}

  /** C端：付款凭证上传 */
  @Post("voucher")
  @UseInterceptors(FileInterceptor("file", interceptorOptions))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("未收到檔案");
    return this.storageService.save(file);
  }
}
