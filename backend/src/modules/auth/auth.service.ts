import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.hashed_password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      success: true,
      user: this.cleanUser(user),
    };
  }

  async me(params: { userId?: string; email?: string }) {
    if (params.userId) {
      const user = await this.prisma.users.findUnique({
        where: { id: Number(params.userId) },
        select: this.userSelect(),
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    }

    if (params.email) {
      const user = await this.prisma.users.findUnique({
        where: { email: params.email.toLowerCase().trim() },
        select: this.userSelect(),
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    }

    throw new BadRequestException('user_id or email is required');
  }

  private cleanUser(user: any) {
    const { hashed_password, ...safe } = user;
    return safe;
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
      created_at: true,
      updated_at: true,
    };
  }
}