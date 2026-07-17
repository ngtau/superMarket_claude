import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import type { ZodSchema } from "zod";

/** 通用Zod校验管道：@Body(new ZodValidationPipe(schema)) 用法，各模块DTO统一走此校验 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
