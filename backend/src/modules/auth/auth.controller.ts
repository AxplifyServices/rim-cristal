import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.service.register(body);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.service.login(body);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.service.me(Number(req.user.sub));
  }

  @Post('forgot-password')
  forgotPassword() {
    return {
      success: true,
      message: 'Password reset is not enabled yet.',
    };
  }

  @Post('reset-password')
  resetPassword() {
    return {
      success: true,
      message: 'Password reset is not enabled yet.',
    };
  }
}