import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(user?: any) {
    if (user?.role === 'point_of_sale') {
  const pointOfSaleId = Number(user.point_of_sale_id);

  if (!pointOfSaleId) {
    return {
      point_of_sale_stock_units: 0,
      sales: 0,
      revenue: 0,
    };
  }

  const [stockResult, salesCount, revenueResult] = await Promise.all([
    this.prisma.point_of_sale_stocks.aggregate({
      where: {
        point_of_sale_id: pointOfSaleId,
      },
      _sum: {
        quantity: true,
      },
    }),
    this.prisma.point_of_sale_sales.count({
      where: {
        point_of_sale_id: pointOfSaleId,
      },
    }),
    this.prisma.point_of_sale_sales.aggregate({
      where: {
        point_of_sale_id: pointOfSaleId,
      },
      _sum: {
        total: true,
      },
    }),
  ]);

  return {
    point_of_sale_stock_units: Number(stockResult._sum.quantity || 0),
    sales: salesCount,
    revenue: Number(revenueResult._sum.total || 0),
  };
}
    const [
      products,
      activeProducts,
      orders,
      unreadMessages,
      revenueResult,
      pointsOfSale,
      posStockResult,
      globalStockResult,
      recentOrders,
      recentSales,
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
      this.prisma.point_of_sales.count({
        where: { is_active: true },
      }),
      this.prisma.point_of_sale_stocks.aggregate({
        _sum: {
          quantity: true,
        },
      }),
      this.prisma.products.aggregate({
        _sum: {
          stock: true,
        },
      }),
      this.prisma.orders.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: {
          point_of_sales: true,
          order_items: true,
        },
      }),
      this.prisma.point_of_sale_sales.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: {
          point_of_sales: true,
          point_of_sale_sale_items: true,
        },
      }),
    ]);

    return {
      products,
      active_products: activeProducts,
      orders,
      revenue: Number(revenueResult._sum.total || 0),
      unread_messages: unreadMessages,
      points_of_sale: pointsOfSale,
      global_stock_units: Number(globalStockResult._sum.stock || 0),
      point_of_sale_stock_units: Number(posStockResult._sum.quantity || 0),
      recent_orders: recentOrders,
      recent_sales: recentSales,
    };
  }

  async listPointsOfSale() {
    return this.prisma.point_of_sales.findMany({
      orderBy: { id: 'asc' },
      include: {
        point_of_sale_stocks: {
          include: {
            products: true,
          },
        },
      },
    });
  }

  async createPointOfSale(body: any) {
    if (!body.name) {
      throw new BadRequestException('name is required');
    }

    return this.prisma.point_of_sales.create({
      data: {
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        phone: body.phone || null,
        manager_name: body.manager_name || null,
        is_active:
          body.is_active !== undefined ? Boolean(body.is_active) : true,
      },
    });
  }

  async updatePointOfSale(id: number, body: any) {
    await this.findPointOfSale(id);

    return this.prisma.point_of_sales.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.manager_name !== undefined && {
          manager_name: body.manager_name,
        }),
        ...(body.is_active !== undefined && {
          is_active: Boolean(body.is_active),
        }),
        updated_at: new Date(),
      },
    });
  }

  async deletePointOfSale(id: number) {
    await this.findPointOfSale(id);

    return this.prisma.point_of_sales.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });
  }

  async findPointOfSale(id: number) {
    const pointOfSale = await this.prisma.point_of_sales.findUnique({
      where: { id },
    });

    if (!pointOfSale) {
      throw new NotFoundException('Point of sale not found');
    }

    return pointOfSale;
  }

  async pointOfSaleStock(id: number) {
    await this.findPointOfSale(id);

    return this.prisma.point_of_sale_stocks.findMany({
      where: {
        point_of_sale_id: id,
      },
      include: {
        products: true,
      },
      orderBy: {
        product_id: 'asc',
      },
    });
  }

  async transferGlobalStockToPointOfSale(body: any) {
    const productId = Number(body.product_id);
    const pointOfSaleId = Number(body.point_of_sale_id);
    const quantity = Number(body.quantity);

    if (!productId || !pointOfSaleId || !quantity || quantity <= 0) {
      throw new BadRequestException(
        'product_id, point_of_sale_id and positive quantity are required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.products.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const pointOfSale = await tx.point_of_sales.findUnique({
        where: { id: pointOfSaleId },
      });

      if (!pointOfSale) {
        throw new NotFoundException('Point of sale not found');
      }

      const stockBefore = Number(product.stock || 0);

      if (stockBefore < quantity) {
        throw new BadRequestException(
          `Insufficient global stock. Available: ${stockBefore}`,
        );
      }

      const existingPosStock = await tx.point_of_sale_stocks.findUnique({
        where: {
          point_of_sale_id_product_id: {
            point_of_sale_id: pointOfSaleId,
            product_id: productId,
          },
        },
      });

      const posBefore = Number(existingPosStock?.quantity || 0);
      const globalAfter = stockBefore - quantity;
      const posAfter = posBefore + quantity;

      const updatedProduct = await tx.products.update({
        where: { id: productId },
        data: {
          stock: globalAfter,
          updated_at: new Date(),
        },
      });

      const updatedPosStock = await tx.point_of_sale_stocks.upsert({
        where: {
          point_of_sale_id_product_id: {
            point_of_sale_id: pointOfSaleId,
            product_id: productId,
          },
        },
        create: {
          point_of_sale_id: pointOfSaleId,
          product_id: productId,
          quantity: posAfter,
        },
        update: {
          quantity: posAfter,
          updated_at: new Date(),
        },
      });

      await tx.stock_movements.create({
        data: {
          product_id: productId,
          point_of_sale_id: pointOfSaleId,
          movement_type: 'global_to_pos',
          quantity,
          stock_global_before: stockBefore,
          stock_global_after: globalAfter,
          stock_pos_before: posBefore,
          stock_pos_after: posAfter,
          note: body.note || null,
        },
      });

      return {
        product: updatedProduct,
        point_of_sale_stock: updatedPosStock,
      };
    });
  }

  async adjustGlobalStock(body: any) {
    const productId = Number(body.product_id);
    const quantity = Number(body.quantity);
    const mode = body.mode || 'add';

    if (!productId || Number.isNaN(quantity)) {
      throw new BadRequestException('product_id and quantity are required');
    }

    if (!['add', 'remove', 'set'].includes(mode)) {
      throw new BadRequestException('mode must be add, remove or set');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.products.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const before = Number(product.stock || 0);

      let after = before;

      if (mode === 'add') after = before + quantity;
      if (mode === 'remove') after = before - quantity;
      if (mode === 'set') after = quantity;

      if (after < 0) {
        throw new BadRequestException('Stock cannot be negative');
      }

      const updatedProduct = await tx.products.update({
        where: { id: productId },
        data: {
          stock: after,
          updated_at: new Date(),
        },
      });

      await tx.stock_movements.create({
        data: {
          product_id: productId,
          movement_type: 'global_adjustment',
          quantity: after - before,
          stock_global_before: before,
          stock_global_after: after,
          note: body.note || null,
        },
      });

      return updatedProduct;
    });
  }

  async adjustPointOfSaleStock(body: any) {
    const productId = Number(body.product_id);
    const pointOfSaleId = Number(body.point_of_sale_id);
    const quantity = Number(body.quantity);
    const mode = body.mode || 'set';

    if (!productId || !pointOfSaleId || Number.isNaN(quantity)) {
      throw new BadRequestException(
        'product_id, point_of_sale_id and quantity are required',
      );
    }

    if (!['add', 'remove', 'set'].includes(mode)) {
      throw new BadRequestException('mode must be add, remove or set');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.products.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const pointOfSale = await tx.point_of_sales.findUnique({
        where: { id: pointOfSaleId },
      });

      if (!pointOfSale) {
        throw new NotFoundException('Point of sale not found');
      }

      const existing = await tx.point_of_sale_stocks.findUnique({
        where: {
          point_of_sale_id_product_id: {
            point_of_sale_id: pointOfSaleId,
            product_id: productId,
          },
        },
      });

      const before = Number(existing?.quantity || 0);

      let after = before;

      if (mode === 'add') after = before + quantity;
      if (mode === 'remove') after = before - quantity;
      if (mode === 'set') after = quantity;

      if (after < 0) {
        throw new BadRequestException('Point of sale stock cannot be negative');
      }

      const updated = await tx.point_of_sale_stocks.upsert({
        where: {
          point_of_sale_id_product_id: {
            point_of_sale_id: pointOfSaleId,
            product_id: productId,
          },
        },
        create: {
          point_of_sale_id: pointOfSaleId,
          product_id: productId,
          quantity: after,
        },
        update: {
          quantity: after,
          updated_at: new Date(),
        },
      });

      await tx.stock_movements.create({
        data: {
          product_id: productId,
          point_of_sale_id: pointOfSaleId,
          movement_type: 'pos_adjustment',
          quantity: after - before,
          stock_pos_before: before,
          stock_pos_after: after,
          note: body.note || null,
        },
      });

      return updated;
    });
  }

  async createPointOfSaleSale(pointOfSaleId: number, body: any) {
    const items = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      const pointOfSale = await tx.point_of_sales.findUnique({
        where: { id: pointOfSaleId },
      });

      if (!pointOfSale) {
        throw new NotFoundException('Point of sale not found');
      }

      const normalizedItems: any[] = [];

      for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity || 1);

        if (!productId || quantity <= 0) {
          throw new BadRequestException(
            'Each item must contain product_id and positive quantity',
          );
        }

        const product = await tx.products.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${productId} not found`);
        }

        const posStock = await tx.point_of_sale_stocks.findUnique({
          where: {
            point_of_sale_id_product_id: {
              point_of_sale_id: pointOfSaleId,
              product_id: productId,
            },
          },
        });

        const stockBefore = Number(posStock?.quantity || 0);

        if (stockBefore < quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${stockBefore}`,
          );
        }

        const unitPrice = Number(item.unit_price || product.price || 0);

        normalizedItems.push({
          product,
          quantity,
          unitPrice,
          stockBefore,
          stockAfter: stockBefore - quantity,
        });
      }

      const subtotal = normalizedItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      const discountAmount = Number(body.discount_amount || 0);
      const total = subtotal - discountAmount;
      const saleNumber = `POS-${Date.now()}`;

      const sale = await tx.point_of_sale_sales.create({
        data: {
          point_of_sale_id: pointOfSaleId,
          sale_number: saleNumber,
          subtotal,
          discount_amount: discountAmount,
          total,
          customer_name: body.customer_name || null,
          customer_phone: body.customer_phone || null,
          note: body.note || null,
          point_of_sale_sale_items: {
            create: normalizedItems.map((item) => ({
              product_id: item.product.id,
              product_name: item.product.name,
              product_reference: item.product.reference,
              unit_price: item.unitPrice,
              quantity: item.quantity,
              line_total: item.unitPrice * item.quantity,
            })),
          },
        },
        include: {
          point_of_sale_sale_items: true,
          point_of_sales: true,
        },
      });

      for (const item of normalizedItems) {
        await tx.point_of_sale_stocks.update({
          where: {
            point_of_sale_id_product_id: {
              point_of_sale_id: pointOfSaleId,
              product_id: item.product.id,
            },
          },
          data: {
            quantity: item.stockAfter,
            updated_at: new Date(),
          },
        });

        await tx.stock_movements.create({
          data: {
            product_id: item.product.id,
            point_of_sale_id: pointOfSaleId,
            movement_type: 'pos_sale',
            quantity: -item.quantity,
            stock_pos_before: item.stockBefore,
            stock_pos_after: item.stockAfter,
            sale_id: sale.id,
            note: body.note || null,
          },
        });
      }

      return sale;
    });
  }

  async listPointOfSaleSales(query: any) {
    const pointOfSaleId = query.point_of_sale_id
      ? Number(query.point_of_sale_id)
      : undefined;

    return this.prisma.point_of_sale_sales.findMany({
      where: pointOfSaleId
        ? {
            point_of_sale_id: pointOfSaleId,
          }
        : undefined,
      include: {
        point_of_sales: true,
        point_of_sale_sale_items: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async listStockMovements(query: any) {
    const productId = query.product_id ? Number(query.product_id) : undefined;
    const pointOfSaleId = query.point_of_sale_id
      ? Number(query.point_of_sale_id)
      : undefined;

    return this.prisma.stock_movements.findMany({
      where: {
        ...(productId && { product_id: productId }),
        ...(pointOfSaleId && { point_of_sale_id: pointOfSaleId }),
      },
      include: {
        products: true,
        point_of_sales: true,
        point_of_sale_sales: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 300,
    });
  }
}