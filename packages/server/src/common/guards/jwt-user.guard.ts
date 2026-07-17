import { Injectable, CanActivate, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";

export interface UserPrincipal {
  userId: string;
}

/** C端用户鉴权守卫（与RBACGuard分离：面向 users 表而非 admins 表） */
@Injectable()
export class JwtUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("请先登录");
    }
    const token = authHeader.slice("Bearer ".length);
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET ?? "") as { userId: string };
      request.user = { userId: payload.userId } as UserPrincipal;
      return true;
    } catch {
      throw new UnauthorizedException("登录凭证无效或已过期");
    }
  }
}
