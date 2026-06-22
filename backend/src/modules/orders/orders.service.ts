import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'cancelled',
];

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}
  /**
 * Prisma nomme automatiquement la relation :
 * order_status_history
 *
 * Le frontend utilise :
 * status_history
 *
 * On convertit uniquement la réponse API.
 */
private formatOrder(order: any) {
  if (!order) {
    return order;
  }

  const {
    order_status_history,
    ...orderData
  } = order;

  return {
    ...orderData,
    status_history:
      order_status_history || [],
  };
}  

  private normalizeRequiredString(value: unknown, field: string) {
    const normalized = String(value || '').trim();

    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }

    return normalized;
  }

  private normalizeEmail(value: unknown) {
    const email = this.normalizeRequiredString(value, 'email').toLowerCase();

    if (!email.includes('@')) {
      throw new BadRequestException('Invalid email');
    }

    return email;
  }

  private createOrderNumber() {
    const random = Math.floor(1000 + Math.random() * 9000);

    return `RC-${Date.now()}-${random}`;
  }

  async create(body: any) {
    const requestedItems = body.items || body.cart_items || [];

    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
      throw new BadRequestException(
        'Order must contain at least one item',
      );
    }

    const normalizedItems = requestedItems.map((item: any) => {
      const productId = Number(item.product_id || item.id);
      const quantity = Number(item.quantity || item.qty || 1);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new BadRequestException('Invalid product');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException('Invalid quantity');
      }

      return {
        productId,
        quantity,
        selectedColor:
          item.selected_color || item.selectedColor || item.color || null,
        selectedSize:
          item.selected_size || item.selectedSize || item.size || null,
      };
    });

    const productIds = [
      ...new Set(normalizedItems.map(item => item.productId)),
    ];

    const products = await this.prisma.products.findMany({
      where: {
        id: {
          in: productIds,
        },
        is_active: true,
        is_available_on_site: true,
      },
      select: {
        id: true,
        name: true,
        reference: true,
        url_image1: true,
        price: true,
        price_wholesale: true,
        wholesale_min_qty: true,
        stock: true,
        colors: true,
        has_color_variants: true,
      },
    });

    const productById = new Map(
      products.map(product => [product.id, product]),
    );

    const computedItems = normalizedItems.map(item => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new BadRequestException(
          `Product ${item.productId} is unavailable`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}`,
        );
      }

      const retailPrice = Number(product.price);
      const wholesalePrice = Number(product.price_wholesale || 0);
      const wholesaleMinQty = Number(product.wholesale_min_qty || 1);

      const unitPrice =
        wholesalePrice > 0 && item.quantity >= wholesaleMinQty
          ? wholesalePrice
          : retailPrice;

      if (product.has_color_variants && !item.selectedColor) {
        throw new BadRequestException(
          `A color must be selected for ${product.name}`,
        );
      }

      return {
        product_id: product.id,
        product_name: product.name,
        product_reference: product.reference,
        product_image: product.url_image1,
        selected_color: item.selectedColor,
        selected_size: item.selectedSize,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: unitPrice * item.quantity,
      };
    });

    const subtotal = computedItems.reduce(
      (sum, item) => sum + item.line_total,
      0,
    );

    const shippingCost = 0;
    const discountAmount = 0;
    const total = subtotal + shippingCost - discountAmount;

    const customer = body.customer || body.shipping || body;

    const firstName = this.normalizeRequiredString(
      customer.first_name || customer.firstName,
      'first_name',
    );

    const lastName = this.normalizeRequiredString(
      customer.last_name || customer.lastName,
      'last_name',
    );

    const email = this.normalizeEmail(customer.email);
    const phone = this.normalizeRequiredString(customer.phone, 'phone');
    const address = this.normalizeRequiredString(
      customer.address,
      'address',
    );
    const city = this.normalizeRequiredString(customer.city, 'city');

    const order = await this.prisma.$transaction(async tx => {
      const createdOrder = await tx.orders.create({
        data: {
          order_number: this.createOrderNumber(),
          user_id:
            body.user_id !== undefined && body.user_id !== null
              ? Number(body.user_id)
              : null,

          subtotal,
          shipping_cost: shippingCost,
          discount_amount: discountAmount,
          coupon_code: null,
          total,

          status: 'pending',
          payment_status: 'pending',
          payment_method: 'cash_on_delivery',

          shipping_first_name: firstName,
          shipping_last_name: lastName,
          shipping_email: email,
          shipping_phone: phone,
          shipping_address: address,
          shipping_apt:
            String(customer.apt || '').trim() || null,
          shipping_city: city,
          shipping_state:
            String(customer.state || '').trim() || null,
          shipping_zip:
            String(customer.zip || '').trim() || '',
          shipping_country:
            String(customer.country || 'Morocco').trim() || 'Morocco',
          notes:
            String(body.notes || customer.notes || '').trim() || null,

          order_items: {
            create: computedItems,
          },
        },
        include: {
          order_items: true,
        },
      });

      await tx.order_status_history.create({
        data: {
          order_id: createdOrder.id,
          status: 'pending',
          payment_status: 'pending',
          note: 'Commande créée depuis le site web',
        },
      });

      return createdOrder;
    });

    return order;
  }

async track(orderNumber: string) {
  const order =
    await this.prisma.orders.findUnique({
      where: {
        order_number: orderNumber,
      },

      include: {
        order_items: true,

        order_status_history: {
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

  if (!order) {
    throw new NotFoundException(
      'Order not found',
    );
  }

  return this.formatOrder(order);
}

async myOrders(params: {
  userId?: string;
  email?: string;
}) {
  const where = params.userId
    ? {
        user_id: Number(params.userId),
      }
    : params.email
      ? {
          shipping_email: params.email
            .toLowerCase()
            .trim(),
        }
      : null;

  if (!where) {
    throw new BadRequestException(
      'user_id or email is required',
    );
  }

  const orders =
    await this.prisma.orders.findMany({
      where,

      include: {
        order_items: true,

        order_status_history: {
          orderBy: {
            created_at: 'asc',
          },
        },
      },

      orderBy: {
        created_at: 'desc',
      },
    });

  return orders.map(order =>
    this.formatOrder(order),
  );
}

async findAll() {
  const orders =
    await this.prisma.orders.findMany({
      include: {
        order_items: true,

        order_status_history: {
          orderBy: {
            created_at: 'asc',
          },
        },
      },

      orderBy: {
        created_at: 'desc',
      },
    });

  return orders.map(order =>
    this.formatOrder(order),
  );
}

async updateStatus(
  id: number,
  body: {
    status?: string;
    payment_status?: string;
    note?: string;
  },
  user?: any,
) {
  const currentOrder =
    await this.prisma.orders.findUnique({
      where: {
        id,
      },
    });

  if (!currentOrder) {
    throw new NotFoundException(
      'Order not found',
    );
  }

  const nextStatus =
    body.status || currentOrder.status;

  const nextPaymentStatus =
    body.payment_status ||
    currentOrder.payment_status;

  if (!ORDER_STATUSES.includes(nextStatus)) {
    throw new BadRequestException(
      'Invalid order status',
    );
  }

  if (
    !PAYMENT_STATUSES.includes(
      nextPaymentStatus,
    )
  ) {
    throw new BadRequestException(
      'Invalid payment status',
    );
  }

  const note = String(
    body.note || '',
  ).trim();

  return this.prisma.$transaction(
    async tx => {
      await tx.orders.update({
        where: {
          id,
        },

        data: {
          status: nextStatus,
          payment_status:
            nextPaymentStatus,

          /*
           * La date de livraison est renseignée
           * à la première validation "delivered".
           */
          delivered_at:
            nextStatus === 'delivered'
              ? currentOrder.delivered_at ||
                new Date()
              : currentOrder.delivered_at,

          /*
           * La date de paiement est renseignée
           * à la première validation "paid".
           */
          paid_at:
            nextPaymentStatus === 'paid'
              ? currentOrder.paid_at ||
                new Date()
              : currentOrder.paid_at,

          updated_at: new Date(),
        },
      });

      const hasChanged =
        currentOrder.status !== nextStatus ||
        currentOrder.payment_status !==
          nextPaymentStatus ||
        Boolean(note);

      if (hasChanged) {
        await tx.order_status_history.create({
          data: {
            order_id: id,
            status: nextStatus,
            payment_status:
              nextPaymentStatus,
            note: note || null,

            created_by_user_id: user?.sub
              ? Number(user.sub)
              : null,
          },
        });
      }

      /*
       * On relit la commande après insertion
       * de l'historique.
       */
      const updatedOrder =
        await tx.orders.findUnique({
          where: {
            id,
          },

          include: {
            order_items: true,

            order_status_history: {
              orderBy: {
                created_at: 'asc',
              },
            },
          },
        });

      return this.formatOrder(updatedOrder);
    },
  );
}
}