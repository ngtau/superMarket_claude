import { Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { addresses } from "../../db/schema/index.js";
import { encrypt, decrypt } from "../../common/crypto/aes.util.js";

@Injectable()
export class AddressesService {
  /** ⚠️安全修复：列名叫phoneEncrypted，但此前代码从未真正调用过AES加密，手机号一直明文入库（D11合规违规，实测排查发现）。
   *  现补上：写入时加密，读出时对本人解密展示（仅owner可见明文，见Controller层已有的用户越权保护）。*/
  async findAll(userId: string) {
    const rows = await db.select().from(addresses).where(eq(addresses.userId, userId));
    return rows.map((r) => ({ ...r, phoneEncrypted: this.safeDecrypt(r.phoneEncrypted) }));
  }

  create(userId: string, input: { recipient: string; phoneEncrypted: string; detail: string; isDefault?: boolean }) {
    return db.insert(addresses).values({ ...input, userId, phoneEncrypted: encrypt(input.phoneEncrypted) }).returning();
  }

  async update(userId: string, id: string, patch: Partial<{ recipient: string; detail: string; isDefault: boolean }>) {
    const [row] = await db
      .update(addresses)
      .set(patch)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId))) // 越权保护：仅能改自己的地址
      .returning();
    return row;
  }

  async remove(userId: string, id: string) {
    await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  }

  /** 兼容修复前已入库的明文数据：解密失败（格式不含冒号分隔符）说明是旧明文记录，原样返回，避免报错 */
  private safeDecrypt(value: string): string {
    try {
      return value.includes(":") ? decrypt(value) : value;
    } catch {
      return value;
    }
  }
}
