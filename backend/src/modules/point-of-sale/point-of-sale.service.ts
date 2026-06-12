import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PointOfSaleService {
  constructor(private readonly prisma: PrismaService) {}

  private getPointOfSaleId(user: any) {
    if (user?.role !== 'point_of_sale') {
      throw new ForbiddenException('Point of sale access only');
    }

    const pointOfSaleId = Number(user.point_of_sale_id);

    if (!pointOfSaleId) {
      throw new ForbiddenException('No point of sale linked to this account');
    }

    return pointOfSaleId;
  }

  async products(user: any) {
    const pointOfSaleId = this.getPointOfSaleId(user);

    return this.prisma.point_of_sale_stocks.findMany({
      where: {
        point_of_sale_id: pointOfSaleId,
        quantity: {
          gt: 0,
        },
      },
      include: {
        products: true,
      },
      orderBy: {
        product_id: 'asc',
      },
    });
  }

  async sales(user: any) {
    const pointOfSaleId = this.getPointOfSaleId(user);

    return this.prisma.point_of_sale_sales.findMany({
      where: {
        point_of_sale_id: pointOfSaleId,
      },
      include: {
        point_of_sale_sale_items: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 200,
    });
  }

  async dashboard(user: any) {
    const pointOfSaleId = this.getPointOfSaleId(user);

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

  async createSale(user: any, body: any) {
    const pointOfSaleId = this.getPointOfSaleId(user);
    const items = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    return this.prisma.$transaction(async tx => {
      const normalizedItems: any[] = [];

      for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity || 1);

        if (!productId || quantity <= 0) {
          throw new BadRequestException('Invalid product or quantity');
        }

        const stock = await tx.point_of_sale_stocks.findUnique({
          where: {
            point_of_sale_id_product_id: {
              point_of_sale_id: pointOfSaleId,
              product_id: productId,
            },
          },
          include: {
            products: true,
          },
        });

        if (!stock || stock.quantity < quantity) {
          throw new BadRequestException('Insufficient point of sale stock');
        }

        const product = stock.products;

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        const unitPrice = Number(item.unit_price || product.price || 0);

        normalizedItems.push({
          stock,
          product,
          quantity,
          unitPrice,
          before: stock.quantity,
          after: stock.quantity - quantity,
        });
      }

      const subtotal = normalizedItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      const discountAmount = Number(body.discount_amount || 0);
      const total = subtotal - discountAmount;

      const sale = await tx.point_of_sale_sales.create({
        data: {
          point_of_sale_id: pointOfSaleId,
          sale_number: `POS-${Date.now()}`,
          subtotal,
          discount_amount: discountAmount,
          total,
          customer_name: body.customer_name || null,
          customer_phone: body.customer_phone || null,
          note: body.note || null,
          point_of_sale_sale_items: {
            create: normalizedItems.map(item => ({
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
            quantity: item.after,
            updated_at: new Date(),
          },
        });

        await tx.stock_movements.create({
          data: {
            product_id: item.product.id,
            point_of_sale_id: pointOfSaleId,
            movement_type: 'pos_sale',
            quantity: -item.quantity,
            stock_pos_before: item.before,
            stock_pos_after: item.after,
            sale_id: sale.id,
            note: body.note || null,
          },
        });
      }

      return sale;
    });
  }
}