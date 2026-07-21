import {
  BadRequestException,
  ForbiddenException,
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

const STOCK_SOURCE_TYPES = [
  'global',
  'point_of_sale',
];

type StockSourceType =
  | 'global'
  | 'point_of_sale';

type NormalizedOrderItem = {
  productId: number;
  productSizeVariantId: bigint | null;
  quantity: number;
  selectedColor: string | null;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Prisma expose la relation :
   * order_status_history
   *
   * Le frontend attend :
   * status_history
   */
private serializeBigInt(value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(item =>
      this.serializeBigInt(item),
    );
  }

  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Date)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, item]) => [
          key,
          this.serializeBigInt(item),
        ],
      ),
    );
  }

  return value;
}

private calculateWebPromotionalPrice(
  originalPrice: unknown,
  promotionPercentage: unknown,
): number {
  const price = Number(
    originalPrice || 0,
  );

  const percentage = Number(
    promotionPercentage || 0,
  );

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new BadRequestException(
      'Invalid product price',
    );
  }

  if (
    !Number.isFinite(percentage) ||
    percentage <= 0 ||
    percentage >= 100
  ) {
    return price;
  }

  return (
    Math.ceil(
      (
        price *
        (1 - percentage / 100)
      ) / 10,
    ) * 10
  );
}

private formatOrder(order: any) {
  if (!order) {
    return order;
  }

  const {
    order_status_history,
    ...orderData
  } = order;

  return this.serializeBigInt({
    ...orderData,

    status_history:
      order_status_history || [],
  });
}

  private normalizeRequiredString(
    value: unknown,
    field: string,
  ) {
    const normalized =
      String(value || '').trim();

    if (!normalized) {
      throw new BadRequestException(
        `${field} is required`,
      );
    }

    return normalized;
  }

  private normalizeOptionalString(
    value: unknown,
  ) {
    const normalized =
      String(value || '').trim();

    return normalized || null;
  }

private normalizeEmail(
  value: unknown,
): string {
  const email =
    this.normalizeRequiredString(
      value,
      'email',
    ).toLowerCase();

  /*
   * Validation volontairement simple :
   * elle évite les valeurs manifestement invalides
   * sans rejeter des adresses valides inhabituelles.
   */
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailPattern.test(email)
  ) {
    throw new BadRequestException(
      'Invalid email address',
    );
  }

  if (email.length > 255) {
    throw new BadRequestException(
      'Email address is too long',
    );
  }

  return email;
}  

private normalizeProductSizeVariantId(
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

private normalizeItems(
  body: any,
): NormalizedOrderItem[] {
  const requestedItems =
    body.items ||
    body.cart_items ||
    [];

  if (
    !Array.isArray(requestedItems) ||
    requestedItems.length === 0
  ) {
    throw new BadRequestException(
      'Order must contain at least one item',
    );
  }

  const normalizedItems =
    requestedItems.map(
      (item: any) => {
        const productId =
          Number(
            item.product_id ||
              item.id,
          );

        const quantity =
          Number(
            item.quantity ||
              item.qty ||
              1,
          );

        if (
          !Number.isInteger(
            productId,
          ) ||
          productId <= 0
        ) {
          throw new BadRequestException(
            'Invalid product',
          );
        }

        if (
          !Number.isInteger(
            quantity,
          ) ||
          quantity <= 0
        ) {
          throw new BadRequestException(
            'Invalid quantity',
          );
        }

        return {
          productId,

          productSizeVariantId:
            this.normalizeProductSizeVariantId(
              item.product_size_variant_id ??
                item.productSizeVariantId ??
                item.size_variant_id ??
                item.sizeVariantId,
            ),

          quantity,

          selectedColor:
            this.normalizeOptionalString(
              item.selected_color ||
                item.selectedColor ||
                item.color,
            ),
        };
      },
    );

  /*
   * Deux tailles différentes du même produit
   * doivent rester deux lignes distinctes.
   */
  const groupedItems =
    new Map<
      string,
      NormalizedOrderItem
    >();

  for (
    const item of normalizedItems
  ) {
    const key = [
      item.productId,

      item.productSizeVariantId
        ? item.productSizeVariantId.toString()
        : 'primary',

      item.selectedColor || '',
    ].join('::');

    const existing =
      groupedItems.get(key);

    if (existing) {
      existing.quantity +=
        item.quantity;
    } else {
      groupedItems.set(
        key,
        { ...item },
      );
    }
  }

  return Array.from(
    groupedItems.values(),
  );
}

  private createOrderNumber() {
    const random =
      Math.floor(
        1000 +
          Math.random() * 9000,
      );

    return `KH-${Date.now()}-${random}`;
  }



  private resolveStockSource(
    user: any,
    body: any,
  ): {
    stockSourceType:
      StockSourceType;
    pointOfSaleId:
      number | null;
  } {
    const stockSourceType =
      String(
        body.stock_source_type ||
          'global',
      )
        .trim()
        .toLowerCase();

    if (
      !STOCK_SOURCE_TYPES.includes(
        stockSourceType,
      )
    ) {
      throw new BadRequestException(
        'Invalid stock source',
      );
    }

    if (
      stockSourceType ===
      'global'
    ) {
      return {
        stockSourceType:
          'global',
        pointOfSaleId: null,
      };
    }

    const pointOfSaleId =
      Number(
        body.point_of_sale_id,
      );

    if (
      !Number.isInteger(
        pointOfSaleId,
      ) ||
      pointOfSaleId <= 0
    ) {
      throw new BadRequestException(
        'Point of sale is required',
      );
    }

    /*
     * Un utilisateur point de vente
     * ne peut utiliser que son propre stock.
     *
     * Il reste autorisé à choisir le stock global.
     */
    if (
      user?.role ===
        'point_of_sale' &&
      pointOfSaleId !==
        Number(
          user.point_of_sale_id,
        )
    ) {
      throw new ForbiddenException(
        'A point of sale can only use its own stock',
      );
    }

    return {
      stockSourceType:
        'point_of_sale',
      pointOfSaleId,
    };
  }

  private async validatePointOfSale(
    pointOfSaleId: number | null,
  ) {
    if (!pointOfSaleId) {
      return null;
    }

    const pointOfSale =
      await this.prisma.point_of_sales.findFirst(
        {
          where: {
            id: pointOfSaleId,
            is_active: true,
          },

          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      );

    if (!pointOfSale) {
      throw new BadRequestException(
        'Point of sale not found or inactive',
      );
    }

    return pointOfSale;
  }

  /**
   * Création publique depuis le site.
   *
   * Le site utilise toujours le stock global.
   */
  async create(body: any) {
    return this.createOrder({
      body,

      context: {
        orderOrigin: 'website',
        createdByUserId: null,
        stockSourceType:
          'global',
        pointOfSaleId: null,
        requireSiteAvailability:
          true,
        historyNote:
          'Commande créée depuis le site web',
      },
    });
  }

  /**
   * Options nécessaires à la modale de création
   * d’une commande dans le back-office.
   */
  async backofficeOptions(
    user: any,
    query: any,
  ) {
    const source =
      this.resolveStockSource(
        user,
        query,
      );

    if (
      source.stockSourceType ===
      'point_of_sale'
    ) {
      await this.validatePointOfSale(
        source.pointOfSaleId,
      );
    }

    const pointsOfSaleWhere =
      user?.role === 'admin'
        ? {
            is_active: true,
          }
        : {
            id: Number(
              user?.point_of_sale_id ||
                0,
            ),
            is_active: true,
          };

    const pointsOfSale =
      await this.prisma.point_of_sales.findMany(
        {
          where:
            pointsOfSaleWhere,

          select: {
            id: true,
            name: true,
            city: true,
          },

          orderBy: {
            name: 'asc',
          },
        },
      );

    if (
      source.stockSourceType ===
      'point_of_sale'
    ) {
      const stocks =
        await this.prisma.point_of_sale_stocks.findMany(
          {
            where: {
              point_of_sale_id:
                source.pointOfSaleId as number,

              quantity: {
                gt: 0,
              },

              products: {
                is_active: true,
              },
            },

            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  reference: true,
                  price: true,
                  price_wholesale:
                    true,
                  wholesale_min_qty:
                    true,
                  has_color_variants:
                    true,
                  colors: true,
                  url_image1: true,
                },
              },
            },

            orderBy: {
              product_id: 'asc',
            },
          },
        );

      return {
        stock_source_type:
          source.stockSourceType,

        point_of_sale_id:
          source.pointOfSaleId,

        points_of_sale:
          pointsOfSale,

        products:
          stocks.map(
            stock => ({
              id:
                stock.products.id,

              name:
                stock.products.name,

              reference:
                stock.products
                  .reference,

              price:
                Number(
                  stock.products
                    .price,
                ),

              price_wholesale:
                Number(
                  stock.products
                    .price_wholesale ||
                    0,
                ),

              wholesale_min_qty:
                Number(
                  stock.products
                    .wholesale_min_qty ||
                    1,
                ),

              stock:
                stock.quantity,

              has_color_variants:
                stock.products
                  .has_color_variants,

              colors:
                stock.products
                  .colors,

              url_image1:
                stock.products
                  .url_image1,
            }),
          ),
      };
    }

    const products =
      await this.prisma.products.findMany(
        {
          where: {
            is_active: true,

            stock: {
              gt: 0,
            },
          },

          select: {
            id: true,
            name: true,
            reference: true,
            price: true,
            price_wholesale: true,
            wholesale_min_qty: true,
            stock: true,
            has_color_variants:
              true,
            colors: true,
            url_image1: true,
          },

          orderBy: {
            name: 'asc',
          },
        },
      );

    return {
      stock_source_type:
        source.stockSourceType,

      point_of_sale_id: null,

      points_of_sale:
        pointsOfSale,

      products:
        products.map(
          product => ({
            ...product,

            price:
              Number(
                product.price,
              ),

            price_wholesale:
              Number(
                product.price_wholesale ||
                  0,
              ),

            wholesale_min_qty:
              Number(
                product.wholesale_min_qty ||
                  1,
              ),
          }),
        ),
    };
  }

  /**
   * Création d’une commande depuis
   * l’admin ou un point de vente.
   */
  async createBackoffice(
    body: any,
    user: any,
  ) {
    if (
      !user ||
      ![
        'admin',
        'point_of_sale',
      ].includes(user.role)
    ) {
      throw new ForbiddenException(
        'Access denied',
      );
    }

    const source =
      this.resolveStockSource(
        user,
        body,
      );

    if (
      source.stockSourceType ===
      'point_of_sale'
    ) {
      await this.validatePointOfSale(
        source.pointOfSaleId,
      );
    }

    const userId =
      Number(user?.sub || 0);

    return this.createOrder({
      body,

      context: {
        orderOrigin:
          user.role ===
          'point_of_sale'
            ? 'point_of_sale'
            : 'admin',

        createdByUserId:
          userId > 0
            ? userId
            : null,

        stockSourceType:
          source.stockSourceType,

        pointOfSaleId:
          source.pointOfSaleId,

        requireSiteAvailability:
          false,

        historyNote:
          user.role ===
          'point_of_sale'
            ? 'Commande créée depuis un point de vente'
            : 'Commande créée depuis l’administration',
      },
    });
  }

private async createOrder({
  body,
  context,
}: {
  body: any;

  context: {
    orderOrigin:
      | 'website'
      | 'admin'
      | 'point_of_sale';

    createdByUserId:
      number | null;

    stockSourceType:
      StockSourceType;

    pointOfSaleId:
      number | null;

    requireSiteAvailability:
      boolean;

    historyNote:
      string;
  };
}) {
  const normalizedItems =
    this.normalizeItems(body);

  const productIds = [
    ...new Set(
      normalizedItems.map(
        item =>
          item.productId,
      ),
    ),
  ];

  const products =
    await this.prisma.products.findMany({
      where: {
        id: {
          in: productIds,
        },

        is_active: true,

        ...(context.requireSiteAvailability
          ? {
              is_available_on_site:
                true,
            }
          : {}),
      },

      select: {
        id: true,
        name: true,
        reference: true,
        url_image1: true,
        colors: true,
        has_color_variants:
          true,
        has_size_variants:
          true,

promotion_percentage:
  true,          

        product_size_variants: {
          where: {
            is_active: true,
          },

          orderBy: [
            {
              is_primary:
                'desc',
            },
            {
              display_order:
                'asc',
            },
            {
              id:
                'asc',
            },
          ],

          select: {
            id: true,
            product_id: true,
            label: true,
            reference: true,
            width_cm: true,
            depth_cm: true,
            height_cm: true,
            price: true,
            price_wholesale:
              true,
            wholesale_min_qty:
              true,
            stock: true,
            is_primary: true,
            is_active: true,
          },
        },
      },
    });

  const productById =
    new Map(
      products.map(
        product => [
          product.id,
          product,
        ],
      ),
    );

  /*
   * Résolution de la taille demandée.
   *
   * Pendant la transition avec l’ancien frontend :
   * si aucun identifiant n’est envoyé, la taille
   * principale est automatiquement sélectionnée.
   */
  const resolvedItems =
    normalizedItems.map(item => {
      const product =
        productById.get(
          item.productId,
        );

      if (!product) {
        throw new BadRequestException(
          `Product ${item.productId} is unavailable`,
        );
      }

      if (
        product.product_size_variants
          .length === 0
      ) {
        throw new BadRequestException(
          `No active size is available for ${product.name}`,
        );
      }

      let variant =
        item.productSizeVariantId
          ? product
              .product_size_variants
              .find(
                candidate =>
                  candidate.id ===
                  item.productSizeVariantId,
              )
          : product
              .product_size_variants
              .find(
                candidate =>
                  candidate.is_primary,
              ) ||
            product
              .product_size_variants[0];

      if (!variant) {
        throw new BadRequestException(
          `The selected size is unavailable for ${product.name}`,
        );
      }

      if (
        product.has_color_variants &&
        !item.selectedColor
      ) {
        throw new BadRequestException(
          `A color must be selected for ${product.name}`,
        );
      }

      if (
        product.has_color_variants
      ) {
        const availableColors =
          Array.isArray(
            product.colors,
          )
            ? product.colors
                .map(color =>
                  String(color)
                    .trim()
                    .toLowerCase(),
                )
                .filter(Boolean)
            : [];

        if (
          availableColors.length >
            0 &&
          !availableColors.includes(
            String(
              item.selectedColor,
            )
              .trim()
              .toLowerCase(),
          )
        ) {
          throw new BadRequestException(
            `The selected color is unavailable for ${product.name}`,
          );
        }
      }

      return {
        product,
        variant,
        quantity:
          item.quantity,
        selectedColor:
          item.selectedColor,
      };
    });

  /*
   * Chargement du stock POS par variante.
   */
  const posStockByVariant =
    new Map<string, number>();

  if (
    context.stockSourceType ===
      'point_of_sale' &&
    context.pointOfSaleId
  ) {
    const variantIds =
      resolvedItems.map(
        item =>
          item.variant.id,
      );

    const pointOfSaleStocks =
      await this.prisma
        .point_of_sale_stocks
        .findMany({
          where: {
            point_of_sale_id:
              context.pointOfSaleId,

            product_size_variant_id:
              {
                in:
                  variantIds,
              },
          },

          select: {
            product_size_variant_id:
              true,
            quantity: true,
          },
        });

    for (
      const stock of pointOfSaleStocks
    ) {
      posStockByVariant.set(
        stock.product_size_variant_id.toString(),
        stock.quantity,
      );
    }
  }

  const computedItems =
    resolvedItems.map(item => {
      const availableStock =
        context.stockSourceType ===
        'point_of_sale'
          ? posStockByVariant.get(
              item.variant.id.toString(),
            ) || 0
          : Number(
              item.variant.stock ||
                0,
            );

      const isBackorder =
        availableStock <
        item.quantity;

      if (
        isBackorder &&
        context.orderOrigin !==
          'website'
      ) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name} - ${
            item.variant.label ||
            'Taille standard'
          }`,
        );
      }

const originalRetailPrice =
  Number(
    item.variant.price,
  );

const promotionalRetailPrice =
  context.orderOrigin ===
  'website'
    ? this.calculateWebPromotionalPrice(
        originalRetailPrice,
        item.product
          .promotion_percentage,
      )
    : originalRetailPrice;

const wholesalePrice =
  Number(
    item.variant
      .price_wholesale ||
      0,
  );

const wholesaleMinQty =
  Number(
    item.variant
      .wholesale_min_qty ||
      1,
  );

/*
 * Les promotions sont appliquées uniquement
 * aux commandes provenant du site web.
 *
 * Les commandes admin et POS conservent :
 * - le prix normal ;
 * - ou le prix de gros si le seuil est atteint.
 */
const unitPrice =
  context.orderOrigin ===
  'website'
    ? promotionalRetailPrice
    : wholesalePrice > 0 &&
        item.quantity >=
          wholesaleMinQty
      ? wholesalePrice
      : originalRetailPrice;

      return {
        product_id:
          item.product.id,

        product_size_variant_id:
          item.variant.id,

        product_name:
          item.product.name,

        product_reference:
          item.product.reference,

        product_image:
          item.product.url_image1,

        selected_color:
          item.selectedColor,

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
          unitPrice,

        quantity:
          item.quantity,

        is_backorder:
          isBackorder,          

        line_total:
          unitPrice *
          item.quantity,

          
      };
    });

  const requiresStockConfirmation =
    computedItems.some(
      item =>
        item.is_backorder,
    );    

  const subtotal =
    computedItems.reduce(
      (sum, item) =>
        sum +
        item.line_total,
      0,
    );

  const shippingCost =
    Number(
      body.shipping_cost ||
        0,
    );

  const discountAmount =
    Number(
      body.discount_amount ||
        0,
    );

  if (
    !Number.isFinite(
      shippingCost,
    ) ||
    shippingCost < 0
  ) {
    throw new BadRequestException(
      'Invalid shipping cost',
    );
  }

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
    subtotal +
    shippingCost -
    discountAmount;

  if (total < 0) {
    throw new BadRequestException(
      'Invalid order total',
    );
  }

  const customer =
    body.customer ||
    body.shipping ||
    body;

  const firstName =
    this.normalizeRequiredString(
      customer.first_name ||
        customer.firstName,
      'first_name',
    );

  const lastName =
    this.normalizeRequiredString(
      customer.last_name ||
        customer.lastName,
      'last_name',
    );

  const email =
    this.normalizeEmail(
      customer.email,
    );

  const phone =
    this.normalizeRequiredString(
      customer.phone,
      'phone',
    );

  const address =
    this.normalizeRequiredString(
      customer.address,
      'address',
    );

  const city =
    this.normalizeRequiredString(
      customer.city,
      'city',
    );

  const order =
    await this.prisma.$transaction(
      async tx => {
        /*
         * Décrément atomique du stock de la taille.
         */
        if (
          context.stockSourceType ===
          'global'
        ) {
          for (
            const item of computedItems
          ) {

            if (
              item.is_backorder
            ) {
              continue;
            }

            const updated =
              await tx
                .product_size_variants
                .updateMany({
                  where: {
                    id:
                      item.product_size_variant_id,

                    product_id:
                      item.product_id,

                    is_active:
                      true,

                    stock: {
                      gte:
                        item.quantity,
                    },
                  },

                  data: {
                    stock: {
                      decrement:
                        item.quantity,
                    },

                    updated_at:
                      new Date(),
                  },
                });

            if (
              updated.count !== 1
            ) {
              throw new BadRequestException(
                `Insufficient stock for ${item.product_name} - ${item.selected_size}`,
              );
            }
          }
        } else {
          for (
            const item of computedItems
          ) {
            const updated =
              await tx
                .point_of_sale_stocks
                .updateMany({
                  where: {
                    point_of_sale_id:
                      context.pointOfSaleId as number,

                    product_size_variant_id:
                      item.product_size_variant_id,

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
              updated.count !== 1
            ) {
              throw new BadRequestException(
                `Insufficient point of sale stock for ${item.product_name} - ${item.selected_size}`,
              );
            }
          }
        }

        const createdOrder =
          await tx.orders.create({
            data: {
              order_number:
                this.createOrderNumber(),

              user_id:
                body.user_id !==
                  undefined &&
                body.user_id !==
                  null
                  ? Number(
                      body.user_id,
                    )
                  : null,

              subtotal,

              shipping_cost:
                shippingCost,

              discount_amount:
                discountAmount,

              coupon_code:
                this.normalizeOptionalString(
                  body.coupon_code,
                ),

              total,

              status:
                'pending',

              payment_status:
                'pending',

              payment_method:
                'cash_on_delivery',

              shipping_first_name:
                firstName,

              shipping_last_name:
                lastName,

              shipping_email:
                email,

              shipping_phone:
                phone,

              shipping_address:
                address,

              shipping_apt:
                this.normalizeOptionalString(
                  customer.apt,
                ),

              shipping_city:
                city,

              shipping_state:
                this.normalizeOptionalString(
                  customer.state,
                ),

              shipping_zip:
                String(
                  customer.zip ||
                    '',
                ).trim(),

              shipping_country:
                String(
                  customer.country ||
                    'Morocco',
                ).trim() ||
                'Morocco',

              notes:
                this.normalizeOptionalString(
                  body.notes ||
                    customer.notes,
                ),

              point_of_sale_id:
                context.pointOfSaleId,

              order_origin:
                context.orderOrigin,

              created_by_user_id:
                context.createdByUserId,

              stock_source_type:
                context.stockSourceType,

              requires_stock_confirmation:
                requiresStockConfirmation,                

              stock_deducted_at:
                computedItems.some(
                  item =>
                    !item.is_backorder
                )
                  ? new Date()
                  : null,

              stock_restored_at:
                null,

              order_items: {
                create:
                  computedItems,
              },
            },

            include: {
              order_items:
                true,

              point_of_sales: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

        /*
         * Création des mouvements après la commande,
         * avec l’identifiant exact de la taille.
         */
        for (
          const item of computedItems
        ) {

          if (
            item.is_backorder
          ) {
            continue;
          }          

          if (
            context.stockSourceType ===
            'global'
          ) {
            const variant =
              await tx
                .product_size_variants
                .findUnique({
                  where: {
                    id:
                      item.product_size_variant_id,
                  },

                  select: {
                    stock:
                      true,
                  },
                });

            const stockAfter =
              Number(
                variant?.stock ||
                  0,
              );

            await tx
              .stock_movements
              .create({
                data: {
                  product_id:
                    item.product_id,

                  product_size_variant_id:
                    item.product_size_variant_id,

                  point_of_sale_id:
                    null,

                  order_id:
                    createdOrder.id,

                  movement_type:
                    'web_order',

                  quantity:
                    -item.quantity,

                  stock_global_before:
                    stockAfter +
                    item.quantity,

                  stock_global_after:
                    stockAfter,

                  stock_pos_before:
                    null,

                  stock_pos_after:
                    null,

                  note:
                    `Commande ${createdOrder.order_number} - ${item.selected_size}`,
                },
              });
          } else {
            const pointOfSaleStock =
              await tx
                .point_of_sale_stocks
                .findUnique({
                  where: {
                    point_of_sale_id_product_size_variant_id:
                      {
                        point_of_sale_id:
                          context.pointOfSaleId as number,

                        product_size_variant_id:
                          item.product_size_variant_id,
                      },
                  },

                  select: {
                    quantity:
                      true,
                  },
                });

            const stockAfter =
              Number(
                pointOfSaleStock?.quantity ||
                  0,
              );

            await tx
              .stock_movements
              .create({
                data: {
                  product_id:
                    item.product_id,

                  product_size_variant_id:
                    item.product_size_variant_id,

                  point_of_sale_id:
                    context.pointOfSaleId,

                  order_id:
                    createdOrder.id,

                  movement_type:
                    'web_order',

                  quantity:
                    -item.quantity,

                  stock_global_before:
                    null,

                  stock_global_after:
                    null,

                  stock_pos_before:
                    stockAfter +
                    item.quantity,

                  stock_pos_after:
                    stockAfter,

                  note:
                    `Commande ${createdOrder.order_number} - ${item.selected_size}`,
                },
              });
          }
        }

        await tx
          .order_status_history
          .create({
            data: {
              order_id:
                createdOrder.id,

              status:
                'pending',

              payment_status:
                'pending',

              note:
                requiresStockConfirmation
                  ? `${context.historyNote} - Une ou plusieurs lignes nécessitent une confirmation de disponibilité`
                  : context.historyNote,

              created_by_user_id:
                context.createdByUserId,
            },
          });

        return createdOrder;
      },
    );

  return this.formatOrder(
    order,
  );
}

  async track(
    orderNumber: string,
  ) {
    const order =
      await this.prisma.orders.findUnique(
        {
          where: {
            order_number:
              orderNumber,
          },

          include: {
            order_items: true,

            point_of_sales: {
              select: {
                id: true,
                name: true,
              },
            },

            order_status_history:
              {
                orderBy: {
                  created_at:
                    'asc',
                },
              },
          },
        },
      );

    if (!order) {
      throw new NotFoundException(
        'Order not found',
      );
    }

    return this.formatOrder(
      order,
    );
  }

  async myOrders(params: {
    userId?: string;
    email?: string;
  }) {
    const where =
      params.userId
        ? {
            user_id:
              Number(
                params.userId,
              ),
          }
        : params.email
          ? {
              shipping_email:
                params.email
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
      await this.prisma.orders.findMany(
        {
          where,

          include: {
            order_items: true,

            point_of_sales: {
              select: {
                id: true,
                name: true,
              },
            },

            order_status_history:
              {
                orderBy: {
                  created_at:
                    'asc',
                },
              },
          },

          orderBy: {
            created_at:
              'desc',
          },
        },
      );

    return orders.map(
      order =>
        this.formatOrder(
          order,
        ),
    );
  }

  async findAll(user?: any) {
    const userId =
      Number(
        user?.sub ||
          0,
      );

    const pointOfSaleId =
      Number(
        user?.point_of_sale_id ||
          0,
      );

    const where =
      user?.role ===
      'point_of_sale'
        ? {
            OR: [
              {
                point_of_sale_id:
                  pointOfSaleId,
              },
              {
                created_by_user_id:
                  userId,
              },
            ],
          }
        : {};

    const orders =
      await this.prisma.orders.findMany(
        {
          where,

          include: {
            order_items: true,

            point_of_sales: {
              select: {
                id: true,
                name: true,
              },
            },

            order_status_history:
              {
                orderBy: {
                  created_at:
                    'asc',
                },
              },
          },

          orderBy: {
            created_at:
              'desc',
          },
        },
      );

    return orders.map(
      order =>
        this.formatOrder(
          order,
        ),
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
      await this.prisma.orders.findUnique(
        {
          where: {
            id,
          },

          include: {
            order_items: true,
          },
        },
      );

    if (!currentOrder) {
      throw new NotFoundException(
        'Order not found',
      );
    }

    if (
      user?.role ===
      'point_of_sale'
    ) {
      const userId =
        Number(
          user?.sub ||
            0,
        );

      const pointOfSaleId =
        Number(
          user?.point_of_sale_id ||
            0,
        );

      const canAccessOrder =
        currentOrder.point_of_sale_id ===
          pointOfSaleId ||
        currentOrder.created_by_user_id ===
          userId;

      if (!canAccessOrder) {
        throw new ForbiddenException(
          'You cannot update this order',
        );
      }
    }

    const nextStatus =
      body.status ||
      currentOrder.status;

    const nextPaymentStatus =
      body.payment_status ||
      currentOrder.payment_status;

    if (
      !ORDER_STATUSES.includes(
        nextStatus,
      )
    ) {
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

    if (
      currentOrder.status ===
        'cancelled' &&
      nextStatus !==
        'cancelled'
    ) {
      throw new BadRequestException(
        'A cancelled order cannot be reopened',
      );
    }

    const note =
      String(
        body.note ||
          '',
      ).trim();

    return this.prisma.$transaction(
      async tx => {
        const mustRestoreStock =
          nextStatus ===
            'cancelled' &&
          currentOrder.status !==
            'cancelled' &&
          Boolean(
            currentOrder.stock_deducted_at,
          ) &&
          !currentOrder.stock_restored_at;

if (mustRestoreStock) {
  for (
    const item of currentOrder.order_items
  ) {
    /*
     * Une ligne en rupture n'a jamais
     * décrémenté le stock.
     * Elle ne doit donc jamais être restaurée.
     */
    if (
      item.is_backorder
    ) {
      continue;
    }

    if (!item.product_id) {
      continue;
    }

    if (
      !item.product_size_variant_id
    ) {
      throw new BadRequestException(
        `Cannot restore stock for order item ${item.id}: missing product size variant`,
      );
    }

    if (
      currentOrder.stock_source_type ===
        'point_of_sale' &&
      currentOrder.point_of_sale_id
    ) {
      const stock =
        await tx
          .point_of_sale_stocks
          .upsert({
            where: {
              point_of_sale_id_product_size_variant_id:
                {
                  point_of_sale_id:
                    currentOrder.point_of_sale_id,

                  product_size_variant_id:
                    item.product_size_variant_id,
                },
            },

            create: {
              point_of_sale_id:
                currentOrder.point_of_sale_id,

              product_id:
                item.product_id,

              product_size_variant_id:
                item.product_size_variant_id,

              quantity:
                item.quantity,
            },

            update: {
              quantity: {
                increment:
                  item.quantity,
              },

              updated_at:
                new Date(),
            },
          });

      await tx
        .stock_movements
        .create({
          data: {
            product_id:
              item.product_id,

            product_size_variant_id:
              item.product_size_variant_id,

            point_of_sale_id:
              currentOrder.point_of_sale_id,

            order_id:
              currentOrder.id,

            movement_type:
              'web_order_cancelled',

            quantity:
              item.quantity,

            stock_global_before:
              null,

            stock_global_after:
              null,

            stock_pos_before:
              stock.quantity -
              item.quantity,

            stock_pos_after:
              stock.quantity,

            note:
              `Annulation ${currentOrder.order_number} - ${
                item.selected_size ||
                'Taille standard'
              }`,
          },
        });
    } else {
      const variant =
        await tx
          .product_size_variants
          .update({
            where: {
              id:
                item.product_size_variant_id,
            },

            data: {
              stock: {
                increment:
                  item.quantity,
              },

              updated_at:
                new Date(),
            },

            select: {
              stock:
                true,
            },
          });

      await tx
        .stock_movements
        .create({
          data: {
            product_id:
              item.product_id,

            product_size_variant_id:
              item.product_size_variant_id,

            point_of_sale_id:
              null,

            order_id:
              currentOrder.id,

            movement_type:
              'web_order_cancelled',

            quantity:
              item.quantity,

            stock_global_before:
              variant.stock -
              item.quantity,

            stock_global_after:
              variant.stock,

            stock_pos_before:
              null,

            stock_pos_after:
              null,

            note:
              `Annulation ${currentOrder.order_number} - ${
                item.selected_size ||
                'Taille standard'
              }`,
          },
        });
    }
  }
}

        await tx.orders.update({
          where: {
            id,
          },

          data: {
            status:
              nextStatus,

            payment_status:
              nextPaymentStatus,

            delivered_at:
              nextStatus ===
              'delivered'
                ? currentOrder.delivered_at ||
                  new Date()
                : currentOrder.delivered_at,

            paid_at:
              nextPaymentStatus ===
              'paid'
                ? currentOrder.paid_at ||
                  new Date()
                : currentOrder.paid_at,

            stock_restored_at:
              mustRestoreStock
                ? new Date()
                : currentOrder.stock_restored_at,

            updated_at:
              new Date(),
          },
        });

        const hasChanged =
          currentOrder.status !==
            nextStatus ||
          currentOrder.payment_status !==
            nextPaymentStatus ||
          Boolean(note);

        if (hasChanged) {
          await tx.order_status_history.create(
            {
              data: {
                order_id:
                  id,

                status:
                  nextStatus,

                payment_status:
                  nextPaymentStatus,

                note:
                  note ||
                  null,

                created_by_user_id:
                  user?.sub
                    ? Number(
                        user.sub,
                      )
                    : null,
              },
            },
          );
        }

        const updatedOrder =
          await tx.orders.findUnique(
            {
              where: {
                id,
              },

              include: {
                order_items: true,

                point_of_sales: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

                order_status_history:
                  {
                    orderBy: {
                      created_at:
                        'asc',
                    },
                  },
              },
            },
          );

        return this.formatOrder(
          updatedOrder,
        );
      },
    );
  }
}