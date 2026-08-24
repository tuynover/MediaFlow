import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginSchema } from '@mediaflow/contracts';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Res({ passthrough: true }) response: Response) {
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      throw new UnauthorizedException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login parameters',
          details: parseResult.error.flatten(),
        },
      });
    }

    const user = await this.authService.validateUser(parseResult.data);
    
    // Set secure session cookie (HttpOnly)
    response.cookie('mediaflow_user_id', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Set true for HTTPS in prod
    });

    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('mediaflow_user_id');
    return { success: true };
  }

  @Get('me')
  async getMe(@Req() request: Request) {
    const userId = request.cookies?.['mediaflow_user_id'];
    if (!userId) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'No active session',
        },
      });
    }

    const user = this.authService.getSeedUsers().find((u) => u.id === userId);
    if (!user) {
      throw new UnauthorizedException({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Session user not found',
        },
      });
    }

    return { user };
  }

  @Get('seed-users')
  getSeedUsers() {
    return { users: this.authService.getSeedUsers() };
  }
}
