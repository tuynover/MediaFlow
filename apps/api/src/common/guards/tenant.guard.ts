import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.workspaceId) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication and workspace session required',
        },
      });
    }

    request.workspaceId = user.workspaceId;
    return true;
  }
}
