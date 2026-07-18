import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PointOfSaleService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private getPointOfSaleId(
    user: any,
  ): number {
    if (
      user?.role !==
      'point_of_sale'
    ) {
      throw new ForbiddenException(
        'Point of sale access only',
      );
    }

    const pointOfSaleId =
      Number(
        user.point_of_sale_id,
      );

    if (!pointOfSaleId) {
      throw new ForbiddenException(
        'No point of sale linked to this account',
      );
    }

    return pointOfSaleId;
  }

  private parseVariantId(
    value: unknown,
  ): bigint | null {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {
      return null;
    }

    try {
      const id = BigInt(
        String(value),
      );

      if (id <= BigInt(0)) {
        throw new Error();
      }

      return id;
    } catch {
      throw new BadRequestException(
        'Invalid product_size_variant_id',
      );
    }
  }

  private serializeBigInt(
    value: any,
  ): any {
    if (
      typeof value === 'bigint'
    ) {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map(item =>
        this.serializeBigInt(
          item,
        ),
      );
    }

    if (
      value &&
      typeof value === 'object'
    ) {
      return Object.fromEntries(
        Object.entries(value).map(
          ([key, item]) => [
            key,
            this.serializeBigInt(
              item,
            ),
          ],
        ),
      );
    }

    return value;
  }

  private async resolveVariant(
    tx: any,
    productId: number,
    rawVariantId: unknown,
  ) {
    const requestedVariantId =
      this.parseVariantId(
        rawVariantId,
      );

    const variant =
      requestedVariantId !== null
        ? await tx
            .product_size_variants
            .findFirst({
              where: {
                id:
                  requestedVariantId,
                product_id:
                  productId,
                is_active:
                  true,
              },

              include: {
                products:
                  true,
              },
            })
        : await tx
            .product_size_variants
            .findFirst({
              where: {
                product_id:
                  productId,
                is_primary:
                  true,
                is_active:
                  true,
              },

              include: {
                products:
                  true,
              },
            });

    if (!variant) {
      throw new NotFoundException(
        `No active size variant found for product ${productId}`,
      );
    }

    return variant;
  }

  async products(user: any) {
    const pointOfSaleId =
      this.getPointOfSaleId(
        user,
      );

    const stocks =
      await this.prisma
        .point_of_sale_stocks
        .findMany({
          where: {
            point_of_sale_id:
              pointOfSaleId,

            quantity: {
              gt: 0,
            },
          },

          include: {
            products: true,

            product_size_variants:
              true,
          },

          orderBy: [
            {
              product_id:
                'asc',
            },
            {
              product_size_variant_id:
                'asc',
            },
          ],
        });

    return this.serializeBigInt(
      stocks,
    );
  }

  async sales(user: any) {
    const pointOfSaleId =
      this.getPointOfSaleId(
        user,
      );

    const sales =
      await this.prisma
        .point_of_sale_sales
        .findMany({
          where: {
            point_of_sale_id:
              pointOfSaleId,
          },

          include: {
            point_of_sale_sale_items:
              true,
          },

          orderBy: {
            created_at:
              'desc',
          },

          take: 200,
        });

    return this.serializeBigInt(
      sales,
    );
  }

  async dashboard(user: any) {
    const pointOfSaleId =
      this.getPointOfSaleId(
        user,
      );

    const [
      stockResult,
      salesCount,
      revenueResult,
    ] = await Promise.all([
      this.prisma
        .point_of_sale_stocks
        .aggregate({
          where: {
            point_of_sale_id:
              pointOfSaleId,
          },

          _sum: {
            quantity:
              true,
          },
        }),

      this.prisma
        .point_of_sale_sales
        .count({
          where: {
            point_of_sale_id:
              pointOfSaleId,
          },
        }),

      this.prisma
        .point_of_sale_sales
        .aggregate({
          where: {
            point_of_sale_id:
              pointOfSaleId,
          },

          _sum: {
            total:
              true,
          },
        }),
    ]);

    return {
      point_of_sale_stock_units:
        Number(
          stockResult._sum
            .quantity || 0,
        ),

      sales:
        salesCount,

      revenue:
        Number(
          revenueResult._sum
            .total || 0,
        ),
    };
  }

  async createSale(
    user: any,
    body: any,
  ) {
    const pointOfSaleId =
      this.getPointOfSaleId(
        user,
      );

    const items =
      body.items || [];

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new BadRequestException(
        'Sale must contain at least one item',
      );
    }

    const sale =
      await this.prisma.$transaction(
        async tx => {
          const normalizedItems: any[] =
            [];

          for (
            const item of items
          ) {
            const productId =
              Number(
                item.product_id,
              );

            const quantity =
              Number(
                item.quantity ||
                  1,
              );

            if (
              !productId ||
              !Number.isInteger(
                quantity,
              ) ||
              quantity <= 0
            ) {
              throw new BadRequestException(
                'Invalid product or quantity',
              );
            }

            const variant =
              await this.resolveVariant(
                tx,
                productId,
                item.product_size_variant_id,
              );

            const stock =
              await tx
                .point_of_sale_stocks
                .findUnique({
                  where: {
                    point_of_sale_id_product_size_variant_id:
                      {
                        point_of_sale_id:
                          pointOfSaleId,

                        product_size_variant_id:
                          variant.id,
                      },
                  },
                });

            if (
              !stock ||
              stock.quantity <
                quantity
            ) {
              throw new BadRequestException(
                `Insufficient point of sale stock for ${variant.products.name} - ${variant.label || 'Taille standard'}`,
              );
            }

            /*
             * Sécurité :
             * le prix envoyé par le frontend
             * n'est jamais utilisé.
             */
            const retailPrice =
              Number(
                variant.price,
              );

            const wholesalePrice =
              Number(
                variant
                  .price_wholesale ||
                  0,
              );

            const wholesaleMinQty =
              Number(
                variant
                  .wholesale_min_qty ||
                  1,
              );

            const unitPrice =
              wholesalePrice >
                0 &&
              quantity >=
                wholesaleMinQty
                ? wholesalePrice
                : retailPrice;

            normalizedItems.push({
              stock,
              variant,
              product:
                variant.products,
              quantity,
              unitPrice,
              before:
                stock.quantity,
              after:
                stock.quantity -
                quantity,
            });
          }

          const subtotal =
            normalizedItems.reduce(
              (sum, item) =>
                sum +
                item.unitPrice *
                  item.quantity,
              0,
            );

          const discountAmount =
            Number(
              body.discount_amount ||
                0,
            );

          if (
            !Number.isFinite(
              discountAmount,
            ) ||
            discountAmount < 0
          ) {
            throw new BadRequestException(
              'Invalid discount amount',
            );
          }

          const total =
            subtotal -
            discountAmount;

          if (total < 0) {
            throw new BadRequestException(
              'Discount cannot exceed subtotal',
            );
          }

          const createdSale =
            await tx
              .point_of_sale_sales
              .create({
                data: {
                  point_of_sale_id:
                    pointOfSaleId,

                  sale_number:
                    `POS-${Date.now()}`,

                  subtotal,

                  discount_amount:
                    discountAmount,

                  total,

                  customer_name:
                    body.customer_name ||
                    null,

                  customer_phone:
                    body.customer_phone ||
                    null,

                  note:
                    body.note ||
                    null,

                  point_of_sale_sale_items:
                    {
                      create:
                        normalizedItems.map(
                          item => ({
                            product_id:
                              item
                                .product
                                .id,

                            product_size_variant_id:
                              item
                                .variant
                                .id,

                            product_name:
                              item
                                .product
                                .name,

                            product_reference:
                              item
                                .product
                                .reference,

                            selected_size:
                              item
                                .variant
                                .label,

                            selected_width_cm:
                              item
                                .variant
                                .width_cm,

                            selected_depth_cm:
                              item
                                .variant
                                .depth_cm,

                            selected_height_cm:
                              item
                                .variant
                                .height_cm,

                            unit_price:
                              item
                                .unitPrice,

                            quantity:
                              item
                                .quantity,

                            line_total:
                              item
                                .unitPrice *
                              item
                                .quantity,
                          }),
                        ),
                    },
                },

                include: {
                  point_of_sale_sale_items:
                    true,
                },
              });

          for (
            const item of normalizedItems
          ) {
            const updated =
              await tx
                .point_of_sale_stocks
                .updateMany({
                  where: {
                    point_of_sale_id:
                      pointOfSaleId,

                    product_size_variant_id:
                      item.variant
                        .id,

                    quantity: {
                      gte:
                        item.quantity,
                    },
                  },

                  data: {
                    quantity: {
                      decrement:
                        item.quantity,
                    },

                    updated_at:
                      new Date(),
                  },
                });

            if (
              updated.count !==
              1
            ) {
              throw new BadRequestException(
                `Insufficient point of sale stock for ${item.product.name}`,
              );
            }

            await tx
              .stock_movements
              .create({
                data: {
                  product_id:
                    item.product
                      .id,

                  product_size_variant_id:
                    item.variant
                      .id,

                  point_of_sale_id:
                    pointOfSaleId,

                  movement_type:
                    'pos_sale',

                  quantity:
                    -item.quantity,

                  stock_pos_before:
                    item.before,

                  stock_pos_after:
                    item.after,

                  sale_id:
                    createdSale.id,

                  note:
                    body.note ||
                    null,
                },
              });
          }

          return createdSale;
        },
      );

    return this.serializeBigInt(
      sale,
    );
  }
}