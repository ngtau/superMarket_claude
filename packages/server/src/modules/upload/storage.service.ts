import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import { extname } from "node:path";
import fs from "node:fs/promises";

/**
 * 存储驱动可切换：STORAGE_DRIVER=local（默认，开发/VPS单实例可用）| r2（Cloudflare R2，S3兼容API）。
 * ⚠️部署到Railway/Render/Vercel等无持久磁盘或多实例的平台时，必须用r2，否则上传文件会随实例重启/扩容丢失。
 * R2路径未在本沙箱环境实测（网络白名单不含Cloudflare API），按S3兼容API标准实现，本地存储路径已实测。
 */
@Injectable()
export class StorageService {
  private s3Client: S3Client | null = null;

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT, // 形如 https://<account_id>.r2.cloudflarestorage.com
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
        },
      });
    }
    return this.s3Client;
  }

  async save(file: Express.Multer.File): Promise<{ url: string }> {
    const driver = process.env.STORAGE_DRIVER ?? "local";
    const filename = `${crypto.randomUUID()}${extname(file.originalname)}`;

    if (driver === "r2") {
      const bucket = process.env.R2_BUCKET ?? "";
      await this.getS3Client().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
      // R2_PUBLIC_URL：R2桶绑定的自定义域或R2.dev公开访问域名
      return { url: `${process.env.R2_PUBLIC_URL}/${filename}` };
    }

    // local驱动：写入本地磁盘（已实测），仅适合单实例持久磁盘环境（VPS/本地开发）
    await fs.mkdir("./uploads", { recursive: true });
    await fs.writeFile(`./uploads/${filename}`, file.buffer);
    return { url: `/uploads/${filename}` };
  }
}
