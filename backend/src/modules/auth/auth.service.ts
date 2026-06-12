import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(body: any) {
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const existing = await this.prisma.users.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.users.create({
      data: {
        email,
        hashed_password: hashedPassword,
        first_name: body.first_name || body.firstName || '',
        last_name: body.last_name || body.lastName || '',
        phone: body.phone || null,
        is_active: true,
        is_admin: false,
        role: 'customer',
      },
      select: this.userSelect(),
    });

    return {
      success: true,
      user,
    };
  }

  async login(body: any) {
    const email = String(body.email || body.username || '').toLowerCase().trim();
    const password = String(body.password || '');

    if (!email || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.users.findUnique({
      where: { email },
      include: {
        point_of_sales: true,
      },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.hashed_password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        last_login_at: new Date(),
      },
    });

    const safeUser = this.cleanUser(user);

    return {
      success: true,
      access_token: await this.signToken(safeUser),
      user: safeUser,
    };
  }

  async me(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: this.userSelect(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async signToken(user: any) {
    const secret = this.config.get<string>('JWT_SECRET') || 'change-me-in-prod';

    const expiresIn = this.config.get('JWT_EXPIRES_IN') || '7d';

    return this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        point_of_sale_id: user.point_of_sale_id,
      },
      {
        secret,
        expiresIn: expiresIn as any,
      },
    );
  }

  private cleanUser(user: any) {
    const { hashed_password, point_of_sales, ...safe } = user;

    return {
      ...safe,
      point_of_sale: point_of_sales || null,
    };
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      is_admin: true,
      is_active: true,
      role: true,
      point_of_sale_id: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
    };
  }
}