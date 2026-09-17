import { Body, Controller, Post } from "@nestjs/common";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { z } from "zod";
import { TrackingService } from "./tracking.service.js";

/**
 * §6.8 行42：C端埋点上报入口（公开，无需登录）。
 * 放在独立 Controller：全局 JwtUserGuard 会挡掉游客埋点，而游客的浏览数据恰恰是转化率的分母。
 *
 * 安全考量：
 * - 入参经 Zod 严格收口（事件类型白名单、路径长度上限、UUID 格式），非法值直接 400，不入库。
 * - 全局 ThrottlerGuard（60次/分钟/IP）已生效，防止被打成写放大攻击。
 * - 不接收任何自由文本字段，避免被用作垃圾数据投递通道。
 */
export const trackingEventSchema = z.object({
  sessionId: z.string().min(8).max(64),
  eventType: z.enum(["page_view", "product_view", "add_to_cart", "checkout_start", "register", "order_placed"]),
  path: z.string().max(255).optional(),
  productId: z.string().uuid().optional().nullable(),
});

@Controller("tracking")
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post("event")
  track(@Body(new ZodValidationPipe(trackingEventSchema)) body: z.infer<typeof trackingEventSchema>) {
    return this.trackingService.track(body);
  }
}
