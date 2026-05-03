import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(body: any) {
    const code = String(body.code || '').trim().toUpperCase();
    const subtotal = Number(body.subtotal || body.amount || 0);

    if (!code) {
      throw new BadRequestException('Coupon code is required');
    }

    const coupon = await this.prisma.coupons.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.is_active) {
      throw new BadRequestException('Invalid coupon');
    }

    if (Number(coupon.min_order_amount) > subtotal) {
      throw new BadRequestException('Minimum order amount not reached');
    }

    if (
      coupon.max_uses !== null &&
      coupon.max_uses !== undefined &&
      coupon.uses_count >= coupon.max_uses
    ) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const now = new Date();

    if (coupon.valid_from && coupon.valid_from > now) {
      throw new BadRequestException('Coupon is not active yet');
    }

    if (coupon.valid_until && coupon.valid_until < now) {
      throw new BadRequestException('Coupon expired');
    }

    let discountAmount = 0;

    if (coupon.discount_type === 'percent') {
      discountAmount = subtotal * (Number(coupon.discount_value) / 100);
    } else {
      discountAmount = Number(coupon.discount_value);
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return {
      valid: true,
      coupon,
      discount_amount: Number(discountAmount.toFixed(2)),
      final_total: Number((subtotal - discountAmount).toFixed(2)),
    };
  }

  async findAll() {
    return this.prisma.coupons.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async create(body: any) {
    return this.prisma.coupons.create({
      data: {
        code: String(body.code || '').toUpperCase(),
        description: body.description || null,
        discount_type: body.discount_type || 'percent',
        discount_value: Number(body.discount_value || 0),
        min_order_amount: Number(body.min_order_amount || 0),
        max_uses:
          body.max_uses !== undefined && body.max_uses !== null
            ? Number(body.max_uses)
            : null,
        valid_from: body.valid_from ? new Date(body.valid_from) : null,
        valid_until: body.valid_until ? new Date(body.valid_until) : null,
        is_active:
          body.is_active !== undefined ? Boolean(body.is_active) : true,
      },
    });
  }

  async update(id: number, body: any) {
    const current = await this.prisma.coupons.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.coupons.update({
      where: { id },
      data: {
        ...(body.code !== undefined && {
          code: String(body.code).toUpperCase(),
        }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.discount_type !== undefined && {
          discount_type: body.discount_type,
        }),
        ...(body.discount_value !== undefined && {
          discount_value: Number(body.discount_value),
        }),
        ...(body.min_order_amount !== undefined && {
          min_order_amount: Number(body.min_order_amount),
        }),
        ...(body.max_uses !== undefined && {
          max_uses:
            body.max_uses !== null ? Number(body.max_uses) : null,
        }),
        ...(body.valid_from !== undefined && {
          valid_from: body.valid_from ? new Date(body.valid_from) : null,
        }),
        ...(body.valid_until !== undefined && {
          valid_until: body.valid_until ? new Date(body.valid_until) : null,
        }),
        ...(body.is_active !== undefined && {
          is_active: Boolean(body.is_active),
        }),
      },
    });
  }

  async remove(id: number) {
    await this.prisma.coupons.delete({
      where: { id },
    });

    return { success: true };
  }
}