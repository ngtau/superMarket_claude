import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import crypto from "node:crypto";

@Injectable()
export class NotificationService {
  private _resend: Resend | null = null;
  private fromEmail = process.env.RESEND_FROM_EMAIL ?? "no-reply@apcube.com";

  // 懒加载：Resend SDK 在 new Resend() 构造时就会因空key直接抛错（实测发现），
  // 而不是等到调用 .send() 才校验，因此必须推迟到真正需要发信时才实例化
  private get resend(): Resend {
    if (!this._resend) {
      this._resend = new Resend(process.env.RESEND_API_KEY);
    }
    return this._resend;
  }

  /**
   * D18：找回密码邮件重置链接。
   * 幂等：同一用户短时间内重复请求应在上层（Service调用方）做限流；
   * 此处仅负责生成token哈希入库 + 发信，调用方负责写入 email_reset_tokens。
   */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      // 开发期 Resend 账号未就绪（你确认过"后期配置环境变量"），降级为控制台打印，不阻塞本地联调
      console.log(`[dev-mode] Resend未配置，密码重置链接（${to}）：${resetUrl}`);
      return;
    }
    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: "重置您的密码 / Reset your password",
      html: `
        <p>请点击以下链接重置密码（链接30分钟内有效）：</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Click the link above to reset your password (valid for 30 minutes).</p>
      `,
    });
  }

  /** 生成一次性重置token：明文经邮件下发，DB仅存哈希（§9.3） */
  generateResetToken(): { plainToken: string; tokenHash: string } {
    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");
    return { plainToken, tokenHash };
  }
}
