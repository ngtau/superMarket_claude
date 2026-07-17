import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";
import * as Sentry from "@sentry/node";
import crypto from "node:crypto";

/**
 * 全局异常过滤器：统一错误响应体 {code, message, traceId}（对齐API契约文档"错误码与幂等规范"）。
 * 5xx错误上报Sentry（D6监控），4xx不上报（属预期业务拒绝，非系统异常）。
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const traceId = crypto.randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "服务器内部错误";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        code = typeof b.code === "string" ? b.code : this.defaultCodeForStatus(status);
        if (typeof b.message === "string") {
          message = b.message;
        } else if (b.message !== undefined) {
          message = JSON.stringify(b.message);
        } else {
          // Zod ValidationPipe 等场景：body本身就是详细错误结构（如.flatten()的fieldErrors/formErrors），
          // 不存在顶层message字段，此时必须透传整个body，绝不能落回外层默认的通用message（曾实测复现"吞掉真实错误"的bug）
          message = JSON.stringify(b);
        }
      }
    } else {
      // 非HttpException（未预期的运行时错误）：不泄露内部堆栈给客户端，但记录+上报
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    if (status >= 500) {
      Sentry.captureException(exception, { tags: { traceId } });
    }

    response.status(status).json({ code, message, traceId });
  }

  private defaultCodeForStatus(status: number): string {
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 409) return "CONFLICT";
    return "BAD_REQUEST";
  }
}
