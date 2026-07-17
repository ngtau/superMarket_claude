import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { db } from "../../db/client.js";
import { users, refreshTokens, emailResetTokens } from "../../db/schema/index.js";
import { NotificationService } from "../notification/notification.service.js";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
const REFRESH_TTL_DAYS = 30; // D2：refresh 30d

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(private readonly notification: NotificationService) {}

  async register(email: string, password: string) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      throw new ConflictException("该邮箱已注册");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ email, passwordHash }).returning();
    return this.issueTokenPair(user.id);
  }

  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.status !== "active") {
      throw new UnauthorizedException("邮箱或密码错误");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("邮箱或密码错误");
    }
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return this.issueTokenPair(user.id);
  }

  /** D2：refresh 轮换 —— 旧token核销、签发新token对，防重放 */
  async refresh(refreshToken: string) {
    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET ?? "") as { userId: string };
    } catch {
      throw new UnauthorizedException("refresh token 无效或已过期");
    }

    const tokenHash = hashToken(refreshToken);
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("refresh token 已失效，请重新登录");
    }

    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));
    return this.issueTokenPair(payload.userId);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, tokenHash));
  }

  private async issueTokenPair(userId: string) {
    // jti防碰撞：同一用户同一秒内连续签发时，若不加随机量，payload+iat+exp完全相同会导致token字节级重复，
    // 撞上 refresh_tokens.token_hash 唯一约束（实测复现于快速连续请求场景）
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign({ userId, jti }, process.env.JWT_ACCESS_SECRET ?? "", { expiresIn: ACCESS_TTL as any });
    const refreshTokenRaw = jwt.sign({ userId, jti }, process.env.JWT_REFRESH_SECRET ?? "", { expiresIn: `${REFRESH_TTL_DAYS}d` });

    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({ userId, tokenHash: hashToken(refreshTokenRaw), expiresAt });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  /** D18：找回密码，触发Resend邮件。为防用户枚举，无论邮箱是否存在均返回成功（上层Controller统一响应） */
  async forgotPassword(email: string, resetUrlBase: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return; // 静默返回，不暴露邮箱是否存在

    const { plainToken, tokenHash } = this.notification.generateResetToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // D20④ 30分钟

    await db.insert(emailResetTokens).values({ userId: user.id, tokenHash, expiresAt });
    await this.notification.sendPasswordResetEmail(email, `${resetUrlBase}?token=${plainToken}`);
  }

  async resetPassword(plainToken: string, newPassword: string) {
    const tokenHash = hashToken(plainToken);
    const [record] = await db
      .select()
      .from(emailResetTokens)
      .where(and(eq(emailResetTokens.tokenHash, tokenHash), isNull(emailResetTokens.usedAt)))
      .limit(1);

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException("TOKEN_INVALID"); // §附录：过期/已用不区分具体原因，防枚举
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await db.update(emailResetTokens).set({ usedAt: new Date() }).where(eq(emailResetTokens.id, record.id));
    // 密码重置后，吊销该用户所有未撤销的 refresh token，强制其他会话重新登录
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(and(eq(refreshTokens.userId, record.userId), isNull(refreshTokens.revokedAt)));
  }
}
