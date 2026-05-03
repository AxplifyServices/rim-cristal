import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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

  @Get('me')
  me(@Query('user_id') userId?: string, @Query('email') email?: string) {
    return this.service.me({ userId, email });
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