import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [
      products,
      activeProducts,
      orders,
      unreadMessages,
      revenueResult,
    ] = await Promise.all([
      this.prisma.products.count(),
      this.prisma.products.count({
        where: { is_active: true },
      }),
      this.prisma.orders.count(),
      this.prisma.contact_messages.count({
        where: { is_read: false },
      }),
      this.prisma.orders.aggregate({
        where: {
          status: {
            in: ['processing', 'shipped', 'delivered'],
          },
        },
        _sum: {
          total: true,
        },
      }),
    ]);

    return {
      products,
      active_products: activeProducts,
      orders,
      revenue: Number(revenueResult._sum.total || 0),
      unread_messages: unreadMessages,
    };
  }
}