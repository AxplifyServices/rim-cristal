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

private parseProductSizeVariantId(
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

private async resolveProductSizeVariant(
  tx: any,
  productId: number,
  rawVariantId: unknown,
) {
  const variantId =
    this.parseProductSizeVariantId(
      rawVariantId,
    );

  const variant =
    variantId !== null
      ? await tx
          .product_size_variants
          .findFirst({
            where: {
              id: variantId,
              product_id:
                productId,
              is_active:
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
          });

  if (!variant) {
    throw new NotFoundException(
      `No active size variant found for product ${productId}`,
    );
  }

  return variant;
}

  private getDateFilter(query: any) {
  const startDate = query.start_date
    ? new Date(`${query.start_date}T00:00:00.000Z`)
    : undefined;

  const endDate = query.end_date
    ? new Date(`${query.end_date}T23:59:59.999Z`)
    : undefined;

  return startDate || endDate
    ? {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      }
    : undefined;
}

async stats(user?: any, query: any = {}) {
  const createdAtFilter = this.getDateFilter(query);
  const category = query.category ? String(query.category) : undefined;

  const requestedPointOfSaleId = query.point_of_sale_id
    ? Number(query.point_of_sale_id)
    : undefined;

  const pointOfSaleId =
    user?.role === 'point_of_sale'
      ? Number(user.point_of_sale_id)
      : requestedPointOfSaleId;

  if (user?.role === 'point_of_sale' && !pointOfSaleId) {
    return {
      sales: 0,
      revenue: 0,
      orders: 0,
      points_of_sale: 0,
      top_products_by_revenue: [],
      top_products_by_quantity: [],
      top_points_of_sale_by_revenue: [],
      top_points_of_sale_by_sales: [],
    };
  }

  const saleWhere: any = {
    ...(pointOfSaleId && { point_of_sale_id: pointOfSaleId }),
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

const orderWhere: any = {
  status: 'delivered',
  payment_status: 'paid',

  ...(createdAtFilter && {
    paid_at: createdAtFilter,
  }),

  ...(pointOfSaleId && {
    point_of_sale_id: pointOfSaleId,
  }),

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

  const [
    posSalesCount,
    posRevenueResult,
    webOrdersCount,
    webRevenueResult,
    pointsOfSale,
    topProductRevenueRows,
    topProductQuantityRows,
    topPointOfSaleRevenueRows,
    topPointOfSaleSalesRows,
  ] = await Promise.all([
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

    user?.role === 'admin'
      ? this.prisma.orders.count({
          where: orderWhere,
        })
      : Promise.resolve(0),

    user?.role === 'admin'
      ? category
        ? this.prisma.order_items.aggregate({
            where: orderItemsWhere,
            _sum: {
              line_total: true,
            },
          })
        : this.prisma.orders.aggregate({
            where: orderWhere,
            _sum: {
              total: true,
            },
          })
      : Promise.resolve({ _sum: { total: 0, line_total: 0 } } as any),

    user?.role === 'admin'
      ? this.prisma.point_of_sales.count({
          where: { is_active: true },
        })
      : Promise.resolve(0),

    this.prisma.point_of_sale_sale_items.groupBy({
      by: ['product_id', 'product_name', 'product_reference'],
      where: saleItemsWhere,
      _sum: {
        line_total: true,
        quantity: true,
      },
      orderBy: {
        _sum: {
          line_total: 'desc',
        },
      },
      take: 5,
    }),

    this.prisma.point_of_sale_sale_items.groupBy({
      by: ['product_id', 'product_name', 'product_reference'],
      where: saleItemsWhere,
      _sum: {
        line_total: true,
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    }),

    user?.role === 'admin'
      ? this.prisma.point_of_sale_sales.groupBy({
          by: ['point_of_sale_id'],
          where: saleWhere,
          _sum: {
            total: true,
          },
          _count: {
            id: true,
          },
          orderBy: {
            _sum: {
              total: 'desc',
            },
          },
          take: 5,
        })
      : Promise.resolve([]),

    user?.role === 'admin'
      ? this.prisma.point_of_sale_sales.groupBy({
          by: ['point_of_sale_id'],
          where: saleWhere,
          _sum: {
            total: true,
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const posRevenue = category
    ? Number((posRevenueResult._sum as { line_total: any }).line_total || 0)
    : Number((posRevenueResult._sum as { total: any }).total || 0);

  const webRevenue = category
    ? Number((webRevenueResult._sum as { line_total: any }).line_total || 0)
    : Number((webRevenueResult._sum as { total: any }).total || 0);

  const pointOfSaleIds = [
    ...topPointOfSaleRevenueRows.map(row => row.point_of_sale_id),
    ...topPointOfSaleSalesRows.map(row => row.point_of_sale_id),
  ].filter(Boolean);

  const pointOfSaleNames = pointOfSaleIds.length
    ? await this.prisma.point_of_sales.findMany({
        where: {
          id: {
            in: pointOfSaleIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];

  const pointOfSaleNameById = new Map(
    pointOfSaleNames.map(pointOfSale => [pointOfSale.id, pointOfSale.name]),
  );

  function normalizeTopProduct(row: any) {
    return {
      product_id: row.product_id,
      product_name: row.product_name || 'Produit supprimé',
      product_reference: row.product_reference || null,
      revenue: Number(row._sum.line_total || 0),
      quantity: Number(row._sum.quantity || 0),
    };
  }

  function normalizeTopPointOfSale(row: any) {
    return {
      point_of_sale_id: row.point_of_sale_id,
      point_of_sale_name:
        pointOfSaleNameById.get(row.point_of_sale_id) || 'Point de vente',
      revenue: Number(row._sum.total || 0),
      sales: Number(row._count.id || 0),
    };
  }

  return {
    sales: posSalesCount,
    orders: webOrdersCount,
    revenue: posRevenue + webRevenue,
    pos_revenue: posRevenue,
    web_revenue: webRevenue,
    points_of_sale: pointsOfSale,
    top_products_by_revenue: topProductRevenueRows.map(normalizeTopProduct),
    top_products_by_quantity: topProductQuantityRows.map(normalizeTopProduct),
    top_points_of_sale_by_revenue:
      topPointOfSaleRevenueRows.map(normalizeTopPointOfSale),
    top_points_of_sale_by_sales:
      topPointOfSaleSalesRows.map(normalizeTopPointOfSale),
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
const products = await this.prisma.products.findMany({
  where: {
    is_active: true,
    point_of_sale_stocks: {
      some: {
        point_of_sale_id: Number(user.point_of_sale_id),
      },
    },
  },
  select: {
    id: true,
    name: true,
    reference: true,
  },
  orderBy: {
    name: 'asc',
  },
});

return {
  points_of_sale: [],
  categories,
  products,
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

const products = await this.prisma.products.findMany({
  where: {
    is_active: true,
  },
  select: {
    id: true,
    name: true,
    reference: true,
  },
  orderBy: {
    name: 'asc',
  },
});

return {
  points_of_sale: pointsOfSale,
  categories,
  products,
};
}

async dashboardStock(user?: any, query: any = {}) {
  const productId = query.product_id ? Number(query.product_id) : undefined;

  let locationType = query.location_type || 'global';

  let pointOfSaleId = query.point_of_sale_id
    ? Number(query.point_of_sale_id)
    : undefined;

  if (user?.role === 'point_of_sale') {
    locationType = 'pos';

    pointOfSaleId = Number(user.point_of_sale_id || 0);

    if (!pointOfSaleId && user.sub) {
      const fullUser = await this.prisma.users.findUnique({
        where: {
          id: Number(user.sub),
        },
        select: {
          point_of_sale_id: true,
        },
      });

      pointOfSaleId = Number(fullUser?.point_of_sale_id || 0);
    }
  }

  if (!productId) {
    return {
      location_type: locationType,
      point_of_sale_id: pointOfSaleId || null,
      stock_series: [],
      sales_series: [],
      revenue_series: [],
    };
  }

  if (locationType === 'pos' && !pointOfSaleId) {
    return {
      location_type: locationType,
      point_of_sale_id: null,
      stock_series: [],
      sales_series: [],
      revenue_series: [],
    };
  }

  const createdAtFilter = this.getDateFilter(query);

  const stockMovementWhere: any = {
    product_id: productId,
    ...(createdAtFilter && { created_at: createdAtFilter }),
  };

  if (locationType === 'global') {
    stockMovementWhere.stock_global_after = {
      not: null,
    };
  } else {
    stockMovementWhere.point_of_sale_id = pointOfSaleId;
    stockMovementWhere.stock_pos_after = {
      not: null,
    };
  }

  const movements = await this.prisma.stock_movements.findMany({
    where: stockMovementWhere,
    orderBy: {
      created_at: 'asc',
    },
    select: {
      id: true,
      created_at: true,
      stock_global_before: true,
      stock_global_after: true,
      stock_pos_before: true,
      stock_pos_after: true,
    },
  });

  const stockSeries: Array<{ date: string; value: number }> = [];

  for (const movement of movements) {
    const date = movement.created_at.toISOString().slice(0, 16).replace('T', ' ');

    const before =
      locationType === 'global'
        ? movement.stock_global_before
        : movement.stock_pos_before;

    const after =
      locationType === 'global'
        ? movement.stock_global_after
        : movement.stock_pos_after;

    if (stockSeries.length === 0 && before !== null && before !== undefined) {
      stockSeries.push({
        date: `${date} avant`,
        value: Number(before),
      });
    }

    if (after !== null && after !== undefined) {
      stockSeries.push({
        date: `${date} après`,
        value: Number(after),
      });
    }
  }

  const saleItemsWhere: any = {
    product_id: productId,
    point_of_sale_sales: {
      ...(createdAtFilter && { created_at: createdAtFilter }),
      ...(locationType === 'pos'
        ? { point_of_sale_id: pointOfSaleId }
        : {}),
    },
  };

  const saleItems = await this.prisma.point_of_sale_sale_items.findMany({
    where: saleItemsWhere,
    select: {
      quantity: true,
      line_total: true,
      point_of_sale_sales: {
        select: {
          created_at: true,
        },
      },
    },
    orderBy: {
      point_of_sale_sales: {
        created_at: 'asc',
      },
    },
  });

  const salesByDate = new Map<string, { sales: number; revenue: number }>();

  for (const item of saleItems) {
    const date = item.point_of_sale_sales.created_at
      .toISOString()
      .slice(0, 10);

    const current = salesByDate.get(date) || {
      sales: 0,
      revenue: 0,
    };

    current.sales += Number(item.quantity || 0);
    current.revenue += Number(item.line_total || 0);

    salesByDate.set(date, current);
  }

  const salesSeries = [...salesByDate.entries()].map(([date, value]) => ({
    date,
    value: value.sales,
  }));

  const revenueSeries = [...salesByDate.entries()].map(([date, value]) => ({
    date,
    value: value.revenue,
  }));

  return {
    location_type: locationType,
    point_of_sale_id: pointOfSaleId || null,
    stock_series: stockSeries,
    sales_series: salesSeries,
    revenue_series: revenueSeries,
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

async transferGlobalStockToPointOfSale(
  body: any,
) {
  const productId =
    Number(
      body.product_id,
    );

  const pointOfSaleId =
    Number(
      body.point_of_sale_id,
    );

  const quantity =
    Number(
      body.quantity,
    );

  if (
    !productId ||
    !pointOfSaleId ||
    !Number.isInteger(
      quantity,
    ) ||
    quantity <= 0
  ) {
    throw new BadRequestException(
      'product_id, point_of_sale_id and positive integer quantity are required',
    );
  }

  return this.prisma.$transaction(
    async tx => {
      const product =
        await tx.products
          .findUnique({
            where: {
              id: productId,
            },
          });

      if (!product) {
        throw new NotFoundException(
          'Product not found',
        );
      }

      const variant =
        await this
          .resolveProductSizeVariant(
            tx,
            productId,
            body.product_size_variant_id,
          );

      const pointOfSale =
        await tx
          .point_of_sales
          .findUnique({
            where: {
              id:
                pointOfSaleId,
            },
          });

      if (!pointOfSale) {
        throw new NotFoundException(
          'Point of sale not found',
        );
      }

      const variantStockBefore =
        Number(
          variant.stock || 0,
        );

      if (
        variantStockBefore <
        quantity
      ) {
        throw new BadRequestException(
          `Insufficient global stock for ${variant.label || 'Taille standard'}. Available: ${variantStockBefore}`,
        );
      }

      const existingPosStock =
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

      const posBefore =
        Number(
          existingPosStock?.quantity ||
            0,
        );

      const variantStockAfter =
        variantStockBefore -
        quantity;

      const posAfter =
        posBefore +
        quantity;

      await tx
        .product_size_variants
        .update({
          where: {
            id: variant.id,
          },

          data: {
            stock:
              variantStockAfter,

            updated_at:
              new Date(),
          },
        });

      const updatedPosStock =
        await tx
          .point_of_sale_stocks
          .upsert({
            where: {
              point_of_sale_id_product_size_variant_id:
                {
                  point_of_sale_id:
                    pointOfSaleId,

                  product_size_variant_id:
                    variant.id,
                },
            },

            create: {
              point_of_sale_id:
                pointOfSaleId,

              product_id:
                productId,

              product_size_variant_id:
                variant.id,

              quantity:
                posAfter,
            },

            update: {
              quantity:
                posAfter,

              updated_at:
                new Date(),
            },
          });

      /*
       * Le trigger SQL recalcule products.stock
       * après la modification de la variante.
       */
      const updatedProduct =
        await tx.products
          .findUnique({
            where: {
              id:
                productId,
            },
          });

      await tx
        .stock_movements
        .create({
          data: {
            product_id:
              productId,

            product_size_variant_id:
              variant.id,

            point_of_sale_id:
              pointOfSaleId,

            movement_type:
              'global_to_pos',

            quantity,

            stock_global_before:
              variantStockBefore,

            stock_global_after:
              variantStockAfter,

            stock_pos_before:
              posBefore,

            stock_pos_after:
              posAfter,

            note:
              body.note ||
              null,
          },
        });

      return {
        product:
          updatedProduct,

        size_variant: {
          ...variant,
          id:
            variant.id.toString(),
          stock:
            variantStockAfter,
        },

        point_of_sale_stock:
          {
            ...updatedPosStock,
            product_size_variant_id:
              updatedPosStock.product_size_variant_id.toString(),
          },
      };
    },
  );
}

async adjustGlobalStock(
  body: any,
) {
  const productId =
    Number(
      body.product_id,
    );

  const quantity =
    Number(
      body.quantity,
    );

  const mode =
    body.mode ||
    'add';

  if (
    !productId ||
    !Number.isInteger(
      quantity,
    )
  ) {
    throw new BadRequestException(
      'product_id and integer quantity are required',
    );
  }

  if (
    ![
      'add',
      'remove',
      'set',
    ].includes(mode)
  ) {
    throw new BadRequestException(
      'mode must be add, remove or set',
    );
  }

  return this.prisma.$transaction(
    async tx => {
      const product =
        await tx.products
          .findUnique({
            where: {
              id: productId,
            },
          });

      if (!product) {
        throw new NotFoundException(
          'Product not found',
        );
      }

      const variant =
        await this
          .resolveProductSizeVariant(
            tx,
            productId,
            body.product_size_variant_id,
          );

      const before =
        Number(
          variant.stock || 0,
        );

      let after =
        before;

      if (mode === 'add') {
        after =
          before +
          quantity;
      }

      if (mode === 'remove') {
        after =
          before -
          quantity;
      }

      if (mode === 'set') {
        after =
          quantity;
      }

      if (after < 0) {
        throw new BadRequestException(
          'Stock cannot be negative',
        );
      }

      const updatedVariant =
        await tx
          .product_size_variants
          .update({
            where: {
              id: variant.id,
            },

            data: {
              stock: after,
              updated_at:
                new Date(),
            },
          });

      await tx
        .stock_movements
        .create({
          data: {
            product_id:
              productId,

            product_size_variant_id:
              variant.id,

            movement_type:
              'global_adjustment',

            quantity:
              after -
              before,

            stock_global_before:
              before,

            stock_global_after:
              after,

            note:
              body.note ||
              null,
          },
        });

      return {
        ...updatedVariant,
        id:
          updatedVariant.id.toString(),
      };
    },
  );
}

async adjustPointOfSaleStock(
  body: any,
) {
  const productId =
    Number(
      body.product_id,
    );

  const pointOfSaleId =
    Number(
      body.point_of_sale_id,
    );

  const quantity =
    Number(
      body.quantity,
    );

  const mode =
    body.mode ||
    'set';

  if (
    !productId ||
    !pointOfSaleId ||
    !Number.isInteger(
      quantity,
    )
  ) {
    throw new BadRequestException(
      'product_id, point_of_sale_id and integer quantity are required',
    );
  }

  if (
    ![
      'add',
      'remove',
      'set',
    ].includes(mode)
  ) {
    throw new BadRequestException(
      'mode must be add, remove or set',
    );
  }

  return this.prisma.$transaction(
    async tx => {
      const product =
        await tx.products
          .findUnique({
            where: {
              id: productId,
            },
          });

      if (!product) {
        throw new NotFoundException(
          'Product not found',
        );
      }

      const variant =
        await this
          .resolveProductSizeVariant(
            tx,
            productId,
            body.product_size_variant_id,
          );

      const pointOfSale =
        await tx
          .point_of_sales
          .findUnique({
            where: {
              id:
                pointOfSaleId,
            },
          });

      if (!pointOfSale) {
        throw new NotFoundException(
          'Point of sale not found',
        );
      }

      const existing =
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

      const before =
        Number(
          existing?.quantity ||
            0,
        );

      let after =
        before;

      if (mode === 'add') {
        after =
          before +
          quantity;
      }

      if (mode === 'remove') {
        after =
          before -
          quantity;
      }

      if (mode === 'set') {
        after =
          quantity;
      }

      if (after < 0) {
        throw new BadRequestException(
          'Point of sale stock cannot be negative',
        );
      }

      const updated =
        await tx
          .point_of_sale_stocks
          .upsert({
            where: {
              point_of_sale_id_product_size_variant_id:
                {
                  point_of_sale_id:
                    pointOfSaleId,

                  product_size_variant_id:
                    variant.id,
                },
            },

            create: {
              point_of_sale_id:
                pointOfSaleId,

              product_id:
                productId,

              product_size_variant_id:
                variant.id,

              quantity:
                after,
            },

            update: {
              quantity:
                after,

              updated_at:
                new Date(),
            },
          });

      await tx
        .stock_movements
        .create({
          data: {
            product_id:
              productId,

            product_size_variant_id:
              variant.id,

            point_of_sale_id:
              pointOfSaleId,

            movement_type:
              'pos_adjustment',

            quantity:
              after -
              before,

            stock_pos_before:
              before,

            stock_pos_after:
              after,

            note:
              body.note ||
              null,
          },
        });

      return {
        ...updated,
        product_size_variant_id:
          updated.product_size_variant_id.toString(),
      };
    },
  );
}

async createPointOfSaleSale(
  pointOfSaleId: number,
  body: any,
) {
  const items = body.items || [];

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new BadRequestException(
      'Sale must contain at least one item',
    );
  }

  return this.prisma.$transaction(
    async tx => {
      const pointOfSale =
        await tx.point_of_sales.findUnique({
          where: {
            id: pointOfSaleId,
          },
        });

      if (!pointOfSale) {
        throw new NotFoundException(
          'Point of sale not found',
        );
      }

      const normalizedItems: any[] = [];

      for (const item of items) {
        const productId = Number(
          item.product_id,
        );

        const quantity = Number(
          item.quantity || 1,
        );

        if (
          !productId ||
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new BadRequestException(
            'Each item must contain product_id and a positive integer quantity',
          );
        }

        const product =
          await tx.products.findUnique({
            where: {
              id: productId,
            },
          });

        if (!product) {
          throw new NotFoundException(
            `Product ${productId} not found`,
          );
        }

        /*
         * resolveProductSizeVariant() utilise :
         * - la variante envoyée par le frontend ;
         * - sinon la variante principale.
         */
        const variant =
          await this.resolveProductSizeVariant(
            tx,
            productId,
            item.product_size_variant_id,
          );

        const posStock =
          await tx.point_of_sale_stocks.findUnique({
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

        const stockBefore = Number(
          posStock?.quantity || 0,
        );

        if (stockBefore < quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name} - ${
              variant.label || 'Taille standard'
            }. Available: ${stockBefore}`,
          );
        }

        /*
         * Sécurité :
         * le prix fourni par le frontend est ignoré.
         * Le prix est toujours lu depuis la variante.
         */
        const retailPrice = Number(
          variant.price || 0,
        );

        const wholesalePrice = Number(
          variant.price_wholesale || 0,
        );

        const wholesaleMinQty = Number(
          variant.wholesale_min_qty || 1,
        );

        const unitPrice =
          wholesalePrice > 0 &&
          quantity >= wholesaleMinQty
            ? wholesalePrice
            : retailPrice;

        normalizedItems.push({
          product,
          variant,
          quantity,
          unitPrice,
          stockBefore,
          stockAfter:
            stockBefore - quantity,
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

      const discountAmount = Number(
        body.discount_amount || 0,
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
        subtotal - discountAmount;

      if (total < 0) {
        throw new BadRequestException(
          'Discount cannot exceed subtotal',
        );
      }

      const saleNumber =
        `POS-${Date.now()}`;

      const sale =
        await tx.point_of_sale_sales.create({
          data: {
            point_of_sale_id:
              pointOfSaleId,

            sale_number:
              saleNumber,

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

            point_of_sale_sale_items: {
              create:
                normalizedItems.map(
                  item => ({
                    product_id:
                      item.product.id,

                    product_size_variant_id:
                      item.variant.id,

                    product_name:
                      item.product.name,

                    product_reference:
                      item.product.reference,

                    selected_size:
                      item.variant.label ||
                      'Taille standard',

                    selected_width_cm:
                      item.variant.width_cm,

                    selected_depth_cm:
                      item.variant.depth_cm,

                    selected_height_cm:
                      item.variant.height_cm,

                    unit_price:
                      item.unitPrice,

                    quantity:
                      item.quantity,

                    line_total:
                      item.unitPrice *
                      item.quantity,
                  }),
                ),
            },
          },

          include: {
            point_of_sale_sale_items:
              true,

            point_of_sales:
              true,
          },
        });

      for (
        const item of normalizedItems
      ) {
        /*
         * updateMany avec quantity >= quantité demandée
         * évite un stock négatif en cas de ventes concurrentes.
         */
        const updatedStock =
          await tx.point_of_sale_stocks.updateMany({
            where: {
              point_of_sale_id:
                pointOfSaleId,

              product_size_variant_id:
                item.variant.id,

              quantity: {
                gte: item.quantity,
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
          updatedStock.count !== 1
        ) {
          throw new BadRequestException(
            `Insufficient stock for ${item.product.name} - ${
              item.variant.label ||
              'Taille standard'
            }`,
          );
        }

        await tx.stock_movements.create({
          data: {
            product_id:
              item.product.id,

            product_size_variant_id:
              item.variant.id,

            point_of_sale_id:
              pointOfSaleId,

            movement_type:
              'pos_sale',

            quantity:
              -item.quantity,

            stock_pos_before:
              item.stockBefore,

            stock_pos_after:
              item.stockAfter,

            sale_id:
              sale.id,

            note:
              body.note ||
              null,
          },
        });
      }

      return {
        ...sale,

        point_of_sale_sale_items:
          sale.point_of_sale_sale_items.map(
            item => ({
              ...item,

              product_size_variant_id:
                item.product_size_variant_id
                  ? item.product_size_variant_id.toString()
                  : null,
            }),
          ),
      };
    },
  );
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