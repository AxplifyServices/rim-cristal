import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: any) {
    const items = body.items || body.cart_items || [];

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const userId =
      body.user_id !== undefined && body.user_id !== null
        ? Number(body.user_id)
        : null;

    const subtotal = Number(body.subtotal || 0);
    const shippingCost = Number(body.shipping_cost || body.shippingCost || 0);
    const discountAmount = Number(
      body.discount_amount || body.discountAmount || 0,
    );
    const total = Number(body.total || subtotal + shippingCost - discountAmount);

    const shipping = body.shipping || body.shipping_address || body.customer || body;

    const orderNumber = `LX-${Date.now()}`;

    const order = await this.prisma.orders.create({
      data: {
        order_number: orderNumber,
        user_id: userId,

        subtotal,
        shipping_cost: shippingCost,
        discount_amount: discountAmount,
        coupon_code: body.coupon_code || body.couponCode || null,
        total,

        status: 'pending',
        payment_status: 'pending',
        payment_method: body.payment_method || body.paymentMethod || null,

        shipping_first_name:
          shipping.first_name || shipping.firstName || body.first_name || body.firstName || '',
        shipping_last_name:
          shipping.last_name || shipping.lastName || body.last_name || body.lastName || '',
        shipping_email: shipping.email || body.email || '',
        shipping_phone: shipping.phone || body.phone || null,
        shipping_address: shipping.address || body.address || '',
        shipping_apt: shipping.apt || body.apt || null,
        shipping_city: shipping.city || body.city || '',
        shipping_state: shipping.state || body.state || null,
        shipping_zip: shipping.zip || body.zip || '',
        shipping_country: shipping.country || body.country || 'Morocco',
        notes: body.notes || null,

        order_items: {
          create: items.map((item: any) => {
            const quantity = Number(item.quantity || item.qty || 1);
            const unitPrice = Number(
              item.unit_price ||
                item.price ||
                item.salePrice ||
                item.sale_price ||
                0,
            );

            return {
              product_id:
                item.product_id || item.id ? Number(item.product_id || item.id) : null,
              product_name: item.product_name || item.name || '',
              product_reference: item.product_reference || item.reference || null,
              product_image: item.product_image || item.image || item.url_image1 || null,
              selected_color: item.selected_color || item.color || null,
              selected_size: item.selected_size || item.size || null,
              unit_price: unitPrice,
              quantity,
              line_total: Number(item.line_total || unitPrice * quantity),
            };
          }),
        },
      },
      include: {
        order_items: true,
      },
    });

    return order;
  }

  async track(orderNumber: string) {
    const order = await this.prisma.orders.findUnique({
      where: { order_number: orderNumber },
      include: {
        order_items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async myOrders(params: { userId?: string; email?: string }) {
    if (params.userId) {
      return this.prisma.orders.findMany({
        where: {
          user_id: Number(params.userId),
        },
        include: {
          order_items: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    }

    if (params.email) {
      return this.prisma.orders.findMany({
        where: {
          shipping_email: params.email.toLowerCase().trim(),
        },
        include: {
          order_items: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    }

    throw new BadRequestException('user_id or email is required');
  }

  async findAll() {
    return this.prisma.orders.findMany({
      include: {
        order_items: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async updateStatus(id: number, status: string) {
    if (!status) {
      throw new BadRequestException('status is required');
    }

    return this.prisma.orders.update({
      where: { id },
      data: {
        status,
        updated_at: new Date(),
      },
    });
  }
}