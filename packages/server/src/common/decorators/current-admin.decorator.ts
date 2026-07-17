import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/** 从请求上下文取出 RBACGuard 已挂载的当前管理员信息（见 AdminPrincipal） */
export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.admin;
});
