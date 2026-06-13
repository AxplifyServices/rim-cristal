import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(user?: any, query: any = {}) {
    const startDate = query.start_date
      ? new Date(`${query.start_date}T00:00:00.000Z`)
      : undefined;

    const endDate = query.end_date
      ? new Date(`${query.end_date}T23:59:59.999Z`)
      : undefined;

    const createdAtFilter =
      startDate || endDate
        ? {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          }
        : undefined;

    const category = query.category ? String(query.category) : undefined;

    if (user?.role === 'point_of_sale') {
      const pointOfSaleId = Number(user.point_of_sale_id);

      if (!pointOfSaleId) {
        return {
          point_of_sale_stock_units: 0,
          sales: 0,
          revenue: 0,
        };
      }

      const stockWhere: any = {
        point_of_sale_id: pointOfSaleId,
        ...(category && {
          products: {
            categorie: category,
          },
        }),
      };

      const saleWhere: any = {
        point_of_sale_id: pointOfSaleId,
        ...(createdAtFilter && { created_at: createdAtFilter }),
        ...(category && {
          point_of_sale_sale_items: {
            some: {
              products: {
                categorie: category,
              },
            },
          },
        }),
      };

      const saleItemsWhere: any = {
        point_of_sale_sales: saleWhere,
        ...(category && {
          products: {
            categorie: category,
          },
        }),
      };

      const [stockResult, salesCount, revenueResult] = await Promise.all([
        this.prisma.point_of_sale_stocks.aggregate({
          where: stockWhere,
          _sum: {
            quantity: true,
          },
        }),
        this.prisma.point_of_sale_sales.count({
          where: saleWhere,
        }),
        category
          ? this.prisma.point_of_sale_sale_items.aggregate({
              where: saleItemsWhere,
              _sum: {
                line_total: true,
              },
            })
          : this.prisma.point_of_sale_sales.aggregate({
              where: saleWhere,
              _sum: {
                total: true,
              },
            }),
      ]);

      const revenue = category
        ? Number((revenueResult._sum as { line_total: any }).line_total || 0)
        : Number((revenueResult._sum as { total: any }).total || 0);

      return {
        point_of_sale_stock_units: Number(stockResult._sum.quantity || 0),
        sales: salesCount,
        revenue,
      };
    }

    const pointOfSaleId = query.point_of_sale_id
      ? Number(query.point_of_sale_id)
      : undefined;

    const orderWhere: any = {
      ...(createdAtFilter && { created_at: createdAtFilter }),
      ...(pointOfSaleId && { point_of_sale_id: pointOfSaleId }),
      ...(category && {
        order_items: {
          some: {
            products: {
              categorie: category,
            },
          },
        },
      }),
    };

    const orderItemsWhere: any = {
      orders: orderWhere,
      ...(category && {
        products: {
          categorie: category,
        },
      }),
    };

    const stockWhere: any = {
      ...(category && {
        categorie: category,
      }),
    };

    const [
      orders,
      revenueResult,
      pointsOfSale,
      globalStockResult,
    ] = await Promise.all([
      this.prisma.orders.count({
        where: orderWhere,
      }),
      category
        ? this.prisma.order_items.aggregate({
            where: orderItemsWhere,
            _sum: {
              line_total: true,
            },
          })
        : this.prisma.orders.aggregate({
            where: {
              ...orderWhere,
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
      this.prisma.products.aggregate({
        where: stockWhere,
        _sum: {
          stock: true,
        },
      }),
    ]);

    const revenue = category
      ? Number((revenueResult._sum as { line_total: any }).line_total || 0)
      : Number((revenueResult._sum as { total: any }).total || 0);

    return {
      orders,
      revenue,
      points_of_sale: pointsOfSale,
      global_stock_units: Number(globalStockResult._sum.stock || 0),
    };
  }

  async dashboardFilters(user?: any) {
    const categoriesResult = await this.prisma.products.findMany({
      where: {
        is_active: true,
        categorie: {
          not: null,
        },
      },
      select: {
        categorie: true,
      },
      distinct: ['categorie'],
      orderBy: {
        categorie: 'asc',
      },
    });

    const categories = categoriesResult
      .map(item => item.categorie)
      .filter(Boolean);

    if (user?.role === 'point_of_sale') {
      return {
        points_of_sale: [],
        categories,
      };
    }

    const pointsOfSale = await this.prisma.point_of_sales.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      points_of_sale: pointsOfSale,
      categories,
    };
  }

  async listPointsOfSale() {
    return this.prisma.point_of_sales.findMany({
      orderBy: { id: 'asc' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            is_active: true,
            role: true,
            last_login_at: true,
          },
        },
        point_of_sale_stocks: {
          include: {
            products: true,
          },
        },
      },
    });
  }

  async createPointOfSale(body: any) {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');

    if (!name) {
      throw new BadRequestException('name is required');
    }

    if (!email) {
      throw new BadRequestException('email is required');
    }

    if (!password || password.length < 6) {
      throw new BadRequestException('password must contain at least 6 characters');
    }

    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async tx => {
      const pointOfSale = await tx.point_of_sales.create({
        data: {
          name,
          address: body.address || null,
          city: body.city || null,
          phone: body.phone || null,
          manager_name: body.manager_name || null,
          is_active:
            body.is_active !== undefined ? Boolean(body.is_active) : true,
        },
      });

      const user = await tx.users.create({
        data: {
          email,
          hashed_password: hashedPassword,
          first_name: body.manager_name || name,
          last_name: '',
          phone: body.phone || null,
          is_active: true,
          is_admin: false,
          role: 'point_of_sale',
          point_of_sale_id: pointOfSale.id,
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          is_active: true,
          role: true,
          point_of_sale_id: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        ...pointOfSale,
        user,
      };
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

    return this.prisma.$transaction(async tx => {
      const pointOfSale = await tx.point_of_sales.update({
        where: { id },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });

      await tx.users.updateMany({
        where: {
          point_of_sale_id: id,
          role: 'point_of_sale',
        },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });

      return pointOfSale;
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

  async listPointOfSaleSales(query: any, user?: any) {
    let pointOfSaleId = query.point_of_sale_id
      ? Number(query.point_of_sale_id)
      : undefined;

    if (user?.role === 'point_of_sale') {
      pointOfSaleId = Number(user.point_of_sale_id);

      if (!pointOfSaleId) {
        throw new BadRequestException('No point of sale linked to this account');
      }
    }

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