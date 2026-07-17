import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { feedbacks } from "../../db/schema/index.js";

@Injectable()
export class FeedbackService {
  /** §5.14：登录用户自动带账号，游客需留联系方式 */
  submit(input: { userId?: string; contact?: string; type: "inquiry" | "complaint" | "suggestion"; orderId?: string; content: string }) {
    return db.insert(feedbacks).values(input).returning();
  }

  myFeedbacks(userId: string) {
    return db.select().from(feedbacks).where(eq(feedbacks.userId, userId));
  }

  // B端
  findAll(status?: string, type?: string) {
    const conditions = [];
    if (status) conditions.push(eq(feedbacks.status, status));
    if (type) conditions.push(eq(feedbacks.type, type));
    return db.select().from(feedbacks).where(conditions.length ? and(...conditions) : undefined);
  }

  async reply(id: string, reply: string) {
    const [fb] = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1);
    if (!fb) throw new NotFoundException("反馈不存在");
    const [updated] = await db.update(feedbacks).set({ reply, status: "replied", repliedAt: new Date() }).where(eq(feedbacks.id, id)).returning();
    return updated;
  }
}
