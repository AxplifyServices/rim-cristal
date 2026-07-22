import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isProductRubrique,
  PRODUCT_RUBRIQUES,
} from './product-rubriques';


import {
  MediaRegistryService,
} from '../media-processing/media-registry.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

constructor(
  private readonly prisma:
    PrismaService,

  private readonly mediaRegistryService:
    MediaRegistryService,
) {}

private normalizeProductColors(
  hasColorVariants: boolean,
  colors: unknown,
): string[] {
  if (!hasColorVariants) {
    return [];
  }

  if (!Array.isArray(colors)) {
    return [];
  }

  return [
    ...new Set(
      colors
        .map(color => String(color || '').trim())
        .filter(Boolean),
    ),
  ];
}

private parseRequiredNumber(
  value: unknown,
  fieldName: string,
  minimum = 0,
): number {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    throw new BadRequestException(
      `${fieldName} is required`,
    );
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(
      `${fieldName} must be a valid number`,
    );
  }

  if (parsed < minimum) {
    throw new BadRequestException(
      `${fieldName} must be greater than or equal to ${minimum}`,
    );
  }

  return parsed;
}

private parseNullableNumber(
  value: unknown,
  fieldName: string,
  minimum = 0,
): number | null {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(
      `${fieldName} must be a valid number`,
    );
  }

  if (parsed < minimum) {
    throw new BadRequestException(
      `${fieldName} must be greater than or equal to ${minimum}`,
    );
  }

  return parsed;
}

private parseRequiredInteger(
  value: unknown,
  fieldName: string,
  minimum = 0,
): number {
  const parsed = this.parseRequiredNumber(
    value,
    fieldName,
    minimum,
  );

  if (!Number.isInteger(parsed)) {
    throw new BadRequestException(
      `${fieldName} must be an integer`,
    );
  }

  return parsed;
}

private parseBoolean(
  value: unknown,
  fallback = false,
): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  return [
    'true',
    '1',
    'yes',
    'oui',
    'on',
  ].includes(normalized);
}

private normalizePromotionPercentage(
  value: unknown,
): number | null {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const percentage = Number(value);

  if (!Number.isFinite(percentage)) {
    throw new BadRequestException(
      'promotion_percentage must be a valid number',
    );
  }

  if (
    percentage <= 0 ||
    percentage >= 100
  ) {
    throw new BadRequestException(
      'promotion_percentage must be greater than 0 and lower than 100',
    );
  }

  return Math.round(
    percentage * 100,
  ) / 100;
}

private calculatePromotionalPrice(
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
    price <= 0 ||
    !Number.isFinite(percentage) ||
    percentage <= 0 ||
    percentage >= 100
  ) {
    return Math.max(
      price,
      0,
    );
  }

  const rawDiscountedPrice =
    price *
    (1 - percentage / 100);

  /*
   * Majoration vers le prochain multiple de 10.
   *
   * 847 DH -> 850 DH
   * 840 DH -> 840 DH
   */
  return (
    Math.ceil(
      rawDiscountedPrice / 10,
    ) * 10
  );
}

private buildPromotionData(
  originalPrice: unknown,
  promotionPercentage: unknown,
) {
  const originalPriceNumber =
    Number(
      originalPrice || 0,
    );

  const percentage =
    promotionPercentage === null ||
    promotionPercentage === undefined
      ? null
      : Number(
          promotionPercentage,
        );

  const hasPromotion =
    Number.isFinite(
      percentage,
    ) &&
    Number(percentage) > 0 &&
    Number(percentage) < 100;

  const promotionalPrice =
    hasPromotion
      ? this.calculatePromotionalPrice(
          originalPriceNumber,
          percentage,
        )
      : originalPriceNumber;

  return {
    has_promotion:
      hasPromotion,

    promotion_percentage:
      hasPromotion
        ? Number(percentage)
        : null,

    original_price:
      originalPriceNumber,

    promotional_price:
      promotionalPrice,
  };
}

private buildSizeLabel(
  widthCm: number | null,
  depthCm: number | null,
  heightCm: number | null,
): string {
  const dimensions = [
    widthCm,
    depthCm,
    heightCm,
  ].filter(
    (value): value is number =>
      value !== null,
  );

  if (dimensions.length === 0) {
    return 'Taille standard';
  }

  return `${dimensions
    .map(value => {
      return Number.isInteger(value)
        ? String(value)
        : String(value).replace('.', ',');
    })
    .join(' × ')} cm`;
}

private normalizeSizeVariants(
  body: any,
  currentProduct?: any,
) {
  const hasSizeVariants =
    body.has_size_variants !== undefined
      ? this.parseBoolean(
          body.has_size_variants,
        )
      : Boolean(
          currentProduct?.has_size_variants,
        );

  const rawVariants = Array.isArray(
    body.size_variants,
  )
    ? body.size_variants
    : [];

  /*
   * Compatibilité avec l'ancien formulaire :
   * tant que le frontend admin n'envoie pas size_variants,
   * les anciens champs constituent la taille principale.
   */
  if (rawVariants.length === 0) {
    const widthCm = this.parseNullableNumber(
      body.width_cm ??
        currentProduct?.width_cm,
      'width_cm',
    );

    const depthCm = this.parseNullableNumber(
      body.depth_cm ??
        currentProduct?.depth_cm,
      'depth_cm',
    );

    const heightCm = this.parseNullableNumber(
      body.height_cm ??
        currentProduct?.height_cm,
      'height_cm',
    );

    return {
      hasSizeVariants: false,
      variants: [
        {
          id: null as bigint | null,
          label:
            String(
              body.size_label || '',
            ).trim() ||
            this.buildSizeLabel(
              widthCm,
              depthCm,
              heightCm,
            ),
          reference: null as string | null,
          widthCm,
          depthCm,
          heightCm,
          price: this.parseRequiredNumber(
            body.price ??
              currentProduct?.price ??
              0,
            'price',
          ),
          priceWholesale:
            this.parseRequiredNumber(
              body.price_wholesale ??
                currentProduct
                  ?.price_wholesale ??
                0,
              'price_wholesale',
            ),
          wholesaleMinQty:
            this.parseRequiredInteger(
              body.wholesale_min_qty ??
                currentProduct
                  ?.wholesale_min_qty ??
                1,
              'wholesale_min_qty',
              1,
            ),
          stock: this.parseRequiredInteger(
            body.stock ??
              currentProduct?.stock ??
              0,
            'stock',
          ),
          isPrimary: true,
          isActive: true,
          displayOrder: 0,
        },
      ],
    };
  }

  if (
    !hasSizeVariants &&
    rawVariants.length > 1
  ) {
    throw new BadRequestException(
      'has_size_variants must be true when several size variants are provided',
    );
  }

  const variants = rawVariants.map(
    (variant: any, index: number) => {
      const widthCm =
        this.parseNullableNumber(
          variant.width_cm,
          `size_variants[${index}].width_cm`,
        );

      const depthCm =
        this.parseNullableNumber(
          variant.depth_cm,
          `size_variants[${index}].depth_cm`,
        );

      const heightCm =
        this.parseNullableNumber(
          variant.height_cm,
          `size_variants[${index}].height_cm`,
        );

      let id: bigint | null = null;

      if (
        variant.id !== undefined &&
        variant.id !== null &&
        String(variant.id).trim() !== ''
      ) {
        try {
          id = BigInt(variant.id);
        } catch {
          throw new BadRequestException(
            `size_variants[${index}].id is invalid`,
          );
        }

        if (id <= BigInt(0)) {
          throw new BadRequestException(
            `size_variants[${index}].id is invalid`,
          );
        }
      }

      return {
        id,
        label:
          String(
            variant.label || '',
          ).trim() ||
          this.buildSizeLabel(
            widthCm,
            depthCm,
            heightCm,
          ),
        reference:
          String(
            variant.reference || '',
          ).trim() || null,
        widthCm,
        depthCm,
        heightCm,
        price:
          this.parseRequiredNumber(
            variant.price,
            `size_variants[${index}].price`,
          ),
        priceWholesale:
          this.parseRequiredNumber(
            variant.price_wholesale ?? 0,
            `size_variants[${index}].price_wholesale`,
          ),
        wholesaleMinQty:
          this.parseRequiredInteger(
            variant.wholesale_min_qty ??
              1,
            `size_variants[${index}].wholesale_min_qty`,
            1,
          ),
        stock:
          this.parseRequiredInteger(
            variant.stock ?? 0,
            `size_variants[${index}].stock`,
          ),
        isPrimary:
          index === 0,
        isActive:
          variant.is_active !== undefined
            ? this.parseBoolean(
                variant.is_active,
              )
            : true,
        displayOrder: index,
      };
    },
  );

  if (variants.length === 0) {
    throw new BadRequestException(
      'At least one size variant is required',
    );
  }

  if (
    !variants[0].isActive
  ) {
    throw new BadRequestException(
      'The primary size variant must be active',
    );
  }

  const existingIds = variants
    .map(variant => variant.id)
    .filter(
      (id): id is bigint =>
        id !== null,
    );

  const uniqueIds = new Set(
    existingIds.map(id =>
      id.toString(),
    ),
  );

  if (
    uniqueIds.size !==
    existingIds.length
  ) {
    throw new BadRequestException(
      'A size variant cannot be submitted more than once',
    );
  }

  return {
    hasSizeVariants:
      hasSizeVariants &&
      variants.length > 1,
    variants,
  };
}

private async getProductMediaVariants(
  productIds: number[],
) {
  const normalizedIds = [
    ...new Set(
      productIds.filter(
        id =>
          Number.isInteger(id) &&
          id > 0,
      ),
    ),
  ];

  if (normalizedIds.length === 0) {
    return [];
  }

  return this.prisma.media_variants.findMany({
    where: {
      owner_type: 'PRODUCT',

      owner_id: {
        in: normalizedIds,
      },

      processing_status: 'READY',
    },

    select: {
      owner_id: true,
      source_slot: true,
      variant_type: true,
      original_url: true,
      variant_url: true,
      width: true,
      height: true,
      file_size_bytes: true,
      mime_type: true,
    },

    orderBy: [
      {
        owner_id: 'asc',
      },
      {
        source_slot: 'asc',
      },
      {
        variant_type: 'asc',
      },
    ],
  });
}

private buildProductImages(
  product: any,
  mediaVariants: any[],
) {
  const slotDefinitions = [
    {
      slot: 'PRODUCT_IMAGE_1',
      legacyUrl:
        product.url_image1,
    },
    {
      slot: 'PRODUCT_IMAGE_2',
      legacyUrl:
        product.url_image2,
    },
    {
      slot: 'PRODUCT_IMAGE_3',
      legacyUrl:
        product.url_image3,
    },
    {
      slot: 'PRODUCT_IMAGE_4',
      legacyUrl:
        product.url_image4,
    },
    {
      slot: 'PRODUCT_IMAGE_5',
      legacyUrl:
        product.url_image5,
    },
  ];

  return slotDefinitions
    .filter(definition =>
      Boolean(
        String(
          definition.legacyUrl || '',
        ).trim(),
      ),
    )
    .map((definition, index) => {
      const rows =
        mediaVariants.filter(
          row =>
            row.owner_id ===
              product.id &&
            row.source_slot ===
              definition.slot,
        );

      const findVariant = (
        variantType: string,
      ) => {
        const row = rows.find(
          item =>
            item.variant_type ===
            variantType,
        );

        return row?.variant_url ||
          null;
      };

      const original =
        findVariant(
          'ORIGINAL',
        ) ||
        definition.legacyUrl;

      const thumbnail =
        findVariant(
          'THUMBNAIL',
        ) ||
        findVariant(
          'CARD',
        ) ||
        original;

      const card =
        findVariant(
          'CARD',
        ) ||
        findVariant(
          'DETAIL',
        ) ||
        original;

      const detail =
        findVariant(
          'DETAIL',
        ) ||
        findVariant(
          'LARGE',
        ) ||
        original;

      const large =
        findVariant(
          'LARGE',
        ) ||
        detail ||
        original;

      return {
        slot:
          definition.slot,

        displayOrder:
          index,

        original,
        thumbnail,
        card,
        detail,
        large,
      };
    });
}

private serializeProduct(
  product: any,
  mediaVariants: any[] = [],
) {
  if (!product) {
    return product;
  }

  const images =
    this.buildProductImages(
      product,
      mediaVariants,
    );

  const productPromotion =
    this.buildPromotionData(
      product.price,
      product.promotion_percentage,
    );    

  return {
    ...product,
    ...productPromotion,

    /*
     * Compatibilité avec le frontend et l'admin actuels.
     * Ces champs ne sont pas supprimés.
     */
    url_image1:
      product.url_image1,
    url_image2:
      product.url_image2,
    url_image3:
      product.url_image3,
    url_image4:
      product.url_image4,
    url_image5:
      product.url_image5,

    /*
     * Nouveau format optimisé.
     */
    images,

    image_urls: {
      thumbnail:
        images[0]?.thumbnail ||
        product.url_image1 ||
        null,

      card:
        images[0]?.card ||
        product.url_image1 ||
        null,

      detail:
        images[0]?.detail ||
        product.url_image1 ||
        null,

      large:
        images[0]?.large ||
        product.url_image1 ||
        null,
    },

product_size_variants:
  Array.isArray(
    product.product_size_variants,
  )
    ? product.product_size_variants.map(
        (variant: any) => {
          /*
           * La promotion appartient au produit,
           * mais elle est recalculée séparément
           * pour chaque prix de taille.
           */
          const variantPromotion =
            this.buildPromotionData(
              variant.price,
              product.promotion_percentage,
            );

          return {
            ...variant,

            id:
              String(
                variant.id,
              ),

            product_id:
              Number(
                variant.product_id,
              ),

            /*
             * Ajoute :
             * - has_promotion
             * - promotion_percentage
             * - original_price
             * - promotional_price
             * - price, avec le tarif promotionnel
             */
            ...variantPromotion,

            price_wholesale:
              Number(
                variant.price_wholesale,
              ),

            width_cm:
              variant.width_cm ===
              null
                ? null
                : Number(
                    variant.width_cm,
                  ),

            depth_cm:
              variant.depth_cm ===
              null
                ? null
                : Number(
                    variant.depth_cm,
                  ),

            height_cm:
              variant.height_cm ===
              null
                ? null
                : Number(
                    variant.height_cm,
                  ),
          };
        },
      )
    : [],
  };
}

private getProductSizeVariantsInclude(
  includeInactive = false,
) {
  return {
    product_size_variants: {
      where: includeInactive
        ? undefined
        : {
            is_active: true,
          },
      orderBy: [
        {
          is_primary:
            'desc' as const,
        },
        {
          display_order:
            'asc' as const,
        },
        {
          id: 'asc' as const,
        },
      ],
    },
  };
}

private normalizeRubrique(
  value: unknown,
  required = false,
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    if (required) {
      throw new BadRequestException(
        'rubrique is required',
      );
    }

    return null;
  }

  const rubrique = String(value).trim();

  if (!isProductRubrique(rubrique)) {
    throw new BadRequestException({
      message: 'Invalid rubrique',
      allowed_values: PRODUCT_RUBRIQUES,
    });
  }

  return rubrique;
}

  private slugify(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

private async generateUniqueSlug(name: string, ignoredId?: number) {
  const base = this.slugify(name) || 'produit';
  let slug = base;
  let index = 2;

  while (true) {
    const existing = await this.prisma.products.findUnique({
      where: { slug },
    });

    if (!existing || existing.id === ignoredId) {
      return slug;
    }

    slug = `${base}-${index}`;
    index += 1;
  }
}

private async generateReference() {
  const lastProduct = await this.prisma.products.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  });

  const nextId = Number(lastProduct?.id || 0) + 1;

  return `RC-P${String(nextId).padStart(6, '0')}`;
}

  private parseList(value: unknown): string[] {
    const values = Array.isArray(value)
      ? value
      : [value];

    return [
      ...new Set(
        values
          .flatMap(item => {
            return String(item ?? '').split(',');
          })
          .map(item => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  private parseOptionalNumber(
    value: unknown,
  ): number | undefined {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {
      return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(
        'Invalid numeric filter',
      );
    }

    return parsed;
  }

  private getPublicCatalogWhere() {
    return {
      is_active: true,
      is_available_on_site: true,
    };
  }

  async getFilters(query: any) {
    const selectedRubriques =
      this.parseList(query.rubrique);

    const selectedCategories =
      this.parseList(
        query.categorie ||
          query.category,
      );

    selectedRubriques.forEach(
      rubrique => {
        this.normalizeRubrique(
          rubrique,
          true,
        );
      },
    );

    const publicWhere: any =
      this.getPublicCatalogWhere();

    const categoryWhere: any = {
      ...publicWhere,
      categorie: {
        not: null,
      },
    };

    if (
      selectedRubriques.length > 0
    ) {
      categoryWhere.rubrique = {
        in: selectedRubriques,
      };
    }

    const familyWhere: any = {
      ...publicWhere,
      famille: {
        not: null,
      },
    };

    if (
      selectedRubriques.length > 0
    ) {
      familyWhere.rubrique = {
        in: selectedRubriques,
      };
    }

    if (
      selectedCategories.length > 0
    ) {
      familyWhere.categorie = {
        in: selectedCategories,
      };
    }

    const priceWhere: any = {
      ...publicWhere,
    };

    if (
      selectedRubriques.length > 0
    ) {
      priceWhere.rubrique = {
        in: selectedRubriques,
      };
    }

    if (
      selectedCategories.length > 0
    ) {
      priceWhere.categorie = {
        in: selectedCategories,
      };
    }

    const [
      rubriqueRows,
      categoryRows,
      familyRows,
      priceRange,
    ] =
      await this.prisma.$transaction([
        this.prisma.products.findMany({
          where: {
            ...publicWhere,
            rubrique: {
              not: null,
            },
          },
          distinct: ['rubrique'],
          select: {
            rubrique: true,
          },
          orderBy: {
            rubrique: 'asc',
          },
        }),

        this.prisma.products.findMany({
          where: categoryWhere,
          distinct: ['categorie'],
          select: {
            categorie: true,
          },
          orderBy: {
            categorie: 'asc',
          },
        }),

        this.prisma.products.findMany({
          where: familyWhere,
          distinct: ['famille'],
          select: {
            famille: true,
          },
          orderBy: {
            famille: 'asc',
          },
        }),

        this.prisma.products.aggregate({
          where: priceWhere,
          _min: {
            price: true,
          },
          _max: {
            price: true,
          },
        }),
      ]);

    return {
      rubriques: rubriqueRows
        .map(row => row.rubrique)
        .filter(Boolean),

      categories: categoryRows
        .map(row => row.categorie)
        .filter(Boolean),

      families: familyRows
        .map(row => row.famille)
        .filter(Boolean),

      price: {
        min: Math.floor(
          Number(
            priceRange._min.price || 0,
          ),
        ),

        max: Math.ceil(
          Number(
            priceRange._max.price || 0,
          ),
        ),
      },
    };
  }

  async findAll(query: any) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(
      Math.max(Number(query.page_size || query.limit || 24), 1),
      20,
    );

const where: any = {};

const includeInactive =
  String(
    query.include_inactive || '',
  ).toLowerCase() === 'true';

const includeUnavailableOnSite =
  String(
    query.include_unavailable_on_site ||
      '',
  ).toLowerCase() === 'true';

const isPublicCatalog =
  !includeInactive &&
  !includeUnavailableOnSite;

if (!includeInactive) {
  where.is_active = true;
}

if (isPublicCatalog) {
  where.is_available_on_site =
    true;
}

    const categories =
      this.parseList(
        query.categorie ||
          query.category,
      );

    const rubriques =
      this.parseList(
        query.rubrique,
      );

    const families =
      this.parseList(
        query.famille ||
          query.family,
      );

    rubriques.forEach(
      rubrique => {
        this.normalizeRubrique(
          rubrique,
          true,
        );
      },
    );

    if (categories.length > 0) {
      where.categorie = {
        in: categories,
      };
    }

    if (rubriques.length > 0) {
      where.rubrique = {
        in: rubriques,
      };
    }

    if (families.length > 0) {
      where.famille = {
        in: families,
      };
    }

    const minPrice =
      this.parseOptionalNumber(
        query.prix_min ??
          query.min_price,
      );

    const maxPrice =
      this.parseOptionalNumber(
        query.prix_max ??
          query.max_price,
      );

    if (
      minPrice !== undefined ||
      maxPrice !== undefined
    ) {
      if (
        minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice
      ) {
        throw new BadRequestException(
          'prix_min cannot be greater than prix_max',
        );
      }

      where.price = {
        ...(minPrice !== undefined && {
          gte: minPrice,
        }),

        ...(maxPrice !== undefined && {
          lte: maxPrice,
        }),
      };
    }

    if (query.featured !== undefined) {
      where.is_featured = String(query.featured) === 'true';
    }

if (query.bestseller !== undefined) {
  where.is_bestseller =
    String(query.bestseller).toLowerCase() ===
    'true';
}

/*
 * Une promotion est active lorsque :
 * - promotion_percentage existe ;
 * - elle est strictement supérieure à 0 ;
 * - elle est strictement inférieure à 100.
 *
 * Le champ products.price reste toujours le prix initial.
 * Le prix promotionnel est calculé uniquement lors de
 * la sérialisation du produit.
 */
if (query.promotion !== undefined) {
  const promotionRequested =
    String(query.promotion).toLowerCase() ===
    'true';

  if (promotionRequested) {
    where.promotion_percentage = {
      gt: 0,
      lt: 100,
    };
  } else {
    where.OR = [
      {
        promotion_percentage: null,
      },
      {
        promotion_percentage: {
          lte: 0,
        },
      },
      {
        promotion_percentage: {
          gte: 100,
        },
      },
    ];
  }
}

if (
  query.is_new !== undefined ||
  query.new !== undefined
) {
  where.is_new =
    String(
      query.is_new ?? query.new,
    ).toLowerCase() === 'true';
}

    const search = query.search || query.q;

    if (search) {
      where.OR = [
        {
          name: {
            contains: String(search),
            mode: 'insensitive',
          },
        },
        {
          reference: {
            contains: String(search),
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: String(search),
            mode: 'insensitive',
          },
        },
      ];
    }

const [items, total] =
  await this.prisma.$transaction([
    this.prisma.products.findMany({
      where,
      include:
        this.getProductSizeVariantsInclude(
          !isPublicCatalog,
        ),
      orderBy: {
        id: 'asc',
      },
      skip:
        (page - 1) *
        pageSize,
      take: pageSize,
    }),

    this.prisma.products.count({
      where,
    }),
  ]);

const mediaVariants =
  await this.getProductMediaVariants(
    items.map(item =>
      item.id,
    ),
  );

return {
  items: items.map(item =>
    this.serializeProduct(
      item,
      mediaVariants,
    ),
  ),

  total,
  page,
  page_size: pageSize,

  pages: Math.ceil(
    total / pageSize,
  ),
};
  }

async findById(id: number) {
  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new BadRequestException(
      'Invalid product id',
    );
  }

  const product =
    await this.prisma.products.findUnique({
      where: {
        id,
      },

      include:
        this.getProductSizeVariantsInclude(
          true,
        ),
    });

  if (!product) {
    throw new NotFoundException(
      'Product not found',
    );
  }

const mediaVariants =
  await this.getProductMediaVariants([
    product.id,
  ]);

return this.serializeProduct(
  product,
  mediaVariants,
);
}

async findBySlug(
  slug: string,
) {
  const normalizedSlug =
    String(slug || '').trim();

  if (!normalizedSlug) {
    throw new BadRequestException(
      'Invalid product slug',
    );
  }

  const product =
    await this.prisma.products.findFirst({
      where: {
        slug: normalizedSlug,
        is_active: true,
        is_available_on_site:
          true,
      },

      include:
        this.getProductSizeVariantsInclude(
          false,
        ),
    });

  if (!product) {
    throw new NotFoundException(
      'Product not found',
    );
  }

const mediaVariants =
  await this.getProductMediaVariants([
    product.id,
  ]);

return this.serializeProduct(
  product,
  mediaVariants,
);
}

async create(body: any) {
  const name = String(
    body.name || '',
  ).trim();

  if (!name) {
    throw new BadRequestException(
      'name is required',
    );
  }

  const rubrique =
    this.normalizeRubrique(
      body.rubrique,
      true,
    );

  const slug =
    await this.generateUniqueSlug(
      name,
    );

  const reference =
    await this.generateReference();

  const {
    hasSizeVariants,
    variants,
  } = this.normalizeSizeVariants(
    body,
  );

  const primaryVariant =
    variants[0];

  try {
    const product =
      await this.prisma.$transaction(
        async tx => {
          const createdProduct =
            await tx.products.create({
              data: {
                name,
                slug,
                reference,

                marque:
                  body.marque ||
                  null,

                rubrique,

                categorie:
                  body.categorie ||
                  body.category ||
                  null,

                famille:
                  body.famille ||
                  null,

                description:
                  body.description ||
                  null,

                url_image1:
                  body.url_image1 ||
                  null,

                url_image2:
                  body.url_image2 ||
                  null,

                url_image3:
                  body.url_image3 ||
                  null,

                url_image4:
                  body.url_image4 ||
                  null,

                url_image5:
                  body.url_image5 ||
                  null,

                /*
                 * Les champs historiques restent
                 * synchronisés avec la taille principale.
                 */
                price:
                  primaryVariant.price,

promotion_percentage:
  this.normalizePromotionPercentage(
    body.promotion_percentage,
  ),                  

                price_wholesale:
                  primaryVariant
                    .priceWholesale,

                wholesale_min_qty:
                  primaryVariant
                    .wholesaleMinQty,

                width_cm:
                  primaryVariant
                    .widthCm,

                depth_cm:
                  primaryVariant
                    .depthCm,

                height_cm:
                  primaryVariant
                    .heightCm,

                stock:
                  variants
                    .filter(
                      variant =>
                        variant.isActive,
                    )
                    .reduce(
                      (
                        total,
                        variant,
                      ) =>
                        total +
                        variant.stock,
                      0,
                    ),

                has_size_variants:
                  hasSizeVariants,

                has_color_variants:
                  this.parseBoolean(
                    body.has_color_variants,
                  ),

                colors:
                  this.normalizeProductColors(
                    this.parseBoolean(
                      body.has_color_variants,
                    ),
                    body.colors,
                  ),

                weight:
                  body.weight !==
                    undefined &&
                  body.weight !==
                    null &&
                  body.weight !== ''
                    ? this.parseRequiredNumber(
                        body.weight,
                        'weight',
                      )
                    : null,

                badge:
                  body.badge ||
                  null,

                is_active:
                  body.is_active !==
                  undefined
                    ? this.parseBoolean(
                        body.is_active,
                      )
                    : true,

                is_available_on_site:
                  body
                    .is_available_on_site !==
                  undefined
                    ? this.parseBoolean(
                        body
                          .is_available_on_site,
                      )
                    : true,

                is_featured:
                  this.parseBoolean(
                    body.is_featured,
                  ),

                is_new:
                  this.parseBoolean(
                    body.is_new,
                  ),

                is_bestseller:
                  this.parseBoolean(
                    body.is_bestseller,
                  ),

                rating: Number(
                  body.rating || 0,
                ),

                reviews_count:
                  Number(
                    body.reviews_count ||
                      0,
                  ),

                category_id:
                  body.category_id
                    ? Number(
                        body.category_id,
                      )
                    : null,

                subcategory_id:
                  body.subcategory_id
                    ? Number(
                        body.subcategory_id,
                      )
                    : null,

                care_instructions:
                  body
                    .care_instructions ||
                  null,

                origin_country:
                  body.origin_country ||
                  null,

                collection_name:
                  body
                    .collection_name ||
                  null,

                seo_title:
                  body.seo_title ||
                  null,

                seo_description:
                  body
                    .seo_description ||
                  null,

                updated_at:
                  new Date(),
              },
            });

          for (
            let index = 0;
            index <
            variants.length;
            index += 1
          ) {
            const variant =
              variants[index];

            await tx
              .product_size_variants
              .create({
                data: {
                  product_id:
                    createdProduct.id,

                  label:
                    variant.label,

                  reference:
                    variant.reference ||
                    `${reference}-T${index + 1}`,

                  width_cm:
                    variant.widthCm,

                  depth_cm:
                    variant.depthCm,

                  height_cm:
                    variant.heightCm,

                  price:
                    variant.price,

                  price_wholesale:
                    variant
                      .priceWholesale,

                  wholesale_min_qty:
                    variant
                      .wholesaleMinQty,

                  stock:
                    variant.stock,

                  is_primary:
                    index === 0,

                  is_active:
                    variant.isActive,

                  display_order:
                    index,

                  updated_at:
                    new Date(),
                },
              });
          }

          return tx.products.findUnique({
            where: {
              id: createdProduct.id,
            },

            include:
              this.getProductSizeVariantsInclude(
                true,
              ),
          });
        },
      );

    if (!product) {
      throw new InternalServerErrorException(
        'Le produit a été créé mais sa lecture a échoué.',
      );
    }

try {
  await this.mediaRegistryService
    .syncProductImages(
      product.id,
      {
        urlImage1:
          product.url_image1,

        urlImage2:
          product.url_image2,

        urlImage3:
          product.url_image3,

        urlImage4:
          product.url_image4,

        urlImage5:
          product.url_image5,
      },
    );
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  this.logger.warn(
    `Le produit ${product.id} a été créé, mais l’enregistrement de ses variantes médias a échoué : ${message}`,
  );
}

const mediaVariants =
  await this.getProductMediaVariants([
    product.id,
  ]);

return this.serializeProduct(
  product,
  mediaVariants,
);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    this.logger.error(
      `Création du produit impossible : ${message}`,
    );

    if (
      message.includes(
        'uq_product_size_variants_reference',
      ) ||
      message.includes(
        'Unique constraint',
      )
    ) {
      throw new BadRequestException(
        'Une référence de taille est déjà utilisée.',
      );
    }

    throw error;
  }
}

async update(
  id: number,
  body: any,
) {
  const currentProduct =
    await this.prisma.products
      .findUnique({
        where: {
          id,
        },

        include:
          this.getProductSizeVariantsInclude(
            true,
          ),
      });

  if (!currentProduct) {
    throw new NotFoundException(
      'Product not found',
    );
  }

  const nextName =
    body.name !== undefined
      ? String(
          body.name || '',
        ).trim()
      : currentProduct.name;

  if (!nextName) {
    throw new BadRequestException(
      'name is required',
    );
  }

  const nextSlug =
    body.name !== undefined
      ? await this.generateUniqueSlug(
          nextName,
          id,
        )
      : currentProduct.slug;

  const {
    hasSizeVariants,
    variants,
  } = this.normalizeSizeVariants(
    body,
    currentProduct,
  );

  /*
   * Lors d'une modification provenant encore
   * de l'ancien frontend, on conserve l'identifiant
   * de la taille principale existante.
   */
  if (
    !Array.isArray(
      body.size_variants,
    ) ||
    body.size_variants.length === 0
  ) {
    const currentPrimary =
      currentProduct
        .product_size_variants
        .find(
          variant =>
            variant.is_primary,
        ) ||
      currentProduct
        .product_size_variants[0];

    if (currentPrimary) {
      variants[0].id =
        currentPrimary.id;

      variants[0].reference =
        currentPrimary.reference;
    }
  }

  const submittedExistingIds =
    variants
      .map(variant => variant.id)
      .filter(
        (variantId): variantId is bigint =>
          variantId !== null,
      );

  if (
    submittedExistingIds.length >
    0
  ) {
    const ownedVariants =
      await this.prisma
        .product_size_variants
        .findMany({
          where: {
            product_id: id,
            id: {
              in: submittedExistingIds,
            },
          },

          select: {
            id: true,
          },
        });

    if (
      ownedVariants.length !==
      submittedExistingIds.length
    ) {
      throw new BadRequestException(
        'One or more size variants do not belong to this product',
      );
    }
  }

  const primaryVariant =
    variants[0];

  try {
    const product =
      await this.prisma.$transaction(
        async tx => {
          /*
           * On retire temporairement le statut principal.
           * L'index SQL interdit plusieurs variantes
           * principales pour le même produit.
           */
          await tx
            .product_size_variants
            .updateMany({
              where: {
                product_id: id,
              },
              data: {
                is_primary:
                  false,
              },
            });

          const retainedIds:
            bigint[] = [];

          for (
            let index = 0;
            index <
            variants.length;
            index += 1
          ) {
            const variant =
              variants[index];

            if (variant.id) {
              const updatedVariant =
                await tx
                  .product_size_variants
                  .update({
                    where: {
                      id: variant.id,
                    },

                    data: {
                      label:
                        variant.label,

                      reference:
                        variant.reference ||
                        `${currentProduct.reference}-T${index + 1}`,

                      width_cm:
                        variant.widthCm,

                      depth_cm:
                        variant.depthCm,

                      height_cm:
                        variant.heightCm,

                      price:
                        variant.price,

                      price_wholesale:
                        variant
                          .priceWholesale,

                      wholesale_min_qty:
                        variant
                          .wholesaleMinQty,

                      stock:
                        variant.stock,

                      is_primary:
                        index === 0,

                      is_active:
                        variant
                          .isActive,

                      display_order:
                        index,

                      updated_at:
                        new Date(),
                    },
                  });

              retainedIds.push(
                updatedVariant.id,
              );

              continue;
            }

            const createdVariant =
              await tx
                .product_size_variants
                .create({
                  data: {
                    product_id:
                      id,

                    label:
                      variant.label,

                    reference:
                      variant.reference ||
                      `${currentProduct.reference}-T${index + 1}`,

                    width_cm:
                      variant.widthCm,

                    depth_cm:
                      variant.depthCm,

                    height_cm:
                      variant.heightCm,

                    price:
                      variant.price,

                    price_wholesale:
                      variant
                        .priceWholesale,

                    wholesale_min_qty:
                      variant
                        .wholesaleMinQty,

                    stock:
                      variant.stock,

                    is_primary:
                      index === 0,

                    is_active:
                      variant
                        .isActive,

                    display_order:
                      index,

                    updated_at:
                      new Date(),
                  },
                });

            retainedIds.push(
              createdVariant.id,
            );
          }

          /*
           * Les variantes supprimées de l'interface
           * sont supprimées de la fiche produit.
           *
           * Les lignes historiques des commandes et
           * ventes gardent selected_size et les
           * dimensions copiées. Leur FK passera à NULL.
           */
          await tx
            .product_size_variants
            .deleteMany({
              where: {
                product_id: id,
                id: {
                  notIn:
                    retainedIds,
                },
              },
            });

          const totalStock =
            variants
              .filter(
                variant =>
                  variant.isActive,
              )
              .reduce(
                (
                  total,
                  variant,
                ) =>
                  total +
                  variant.stock,
                0,
              );

          await tx.products.update({
            where: {
              id,
            },

            data: {
              name: nextName,
              slug: nextSlug,

              ...(body.marque !==
                undefined && {
                marque:
                  body.marque ||
                  null,
              }),

              ...(body.rubrique !==
                undefined && {
                rubrique:
                  this.normalizeRubrique(
                    body.rubrique,
                    true,
                  ),
              }),

              ...(
                body.categorie !==
                  undefined ||
                body.category !==
                  undefined
                  ? {
                      categorie:
                        body.categorie ||
                        body.category ||
                        null,
                    }
                  : {}
              ),

              ...(body.famille !==
                undefined && {
                famille:
                  body.famille ||
                  null,
              }),

              ...(body.description !==
                undefined && {
                description:
                  body.description ||
                  null,
              }),

              ...(body.url_image1 !==
                undefined && {
                url_image1:
                  body.url_image1 ||
                  null,
              }),

              ...(body.url_image2 !==
                undefined && {
                url_image2:
                  body.url_image2 ||
                  null,
              }),

              ...(body.url_image3 !==
                undefined && {
                url_image3:
                  body.url_image3 ||
                  null,
              }),

              ...(body.url_image4 !==
                undefined && {
                url_image4:
                  body.url_image4 ||
                  null,
              }),

              ...(body.url_image5 !==
                undefined && {
                url_image5:
                  body.url_image5 ||
                  null,
              }),

              has_size_variants:
                hasSizeVariants,

              price:
                primaryVariant.price,

              price_wholesale:
                primaryVariant
                  .priceWholesale,

              wholesale_min_qty:
                primaryVariant
                  .wholesaleMinQty,

              width_cm:
                primaryVariant.widthCm,

              depth_cm:
                primaryVariant.depthCm,

              height_cm:
                primaryVariant.heightCm,

              stock:
                totalStock,

              ...(body
                .has_color_variants !==
                undefined && {
                has_color_variants:
                  this.parseBoolean(
                    body
                      .has_color_variants,
                  ),
              }),

              ...(
                body.colors !==
                  undefined ||
                body
                  .has_color_variants !==
                  undefined
                  ? {
                      colors:
                        this.normalizeProductColors(
                          body
                            .has_color_variants !==
                            undefined
                            ? this.parseBoolean(
                                body
                                  .has_color_variants,
                              )
                            : Boolean(
                                currentProduct
                                  .has_color_variants,
                              ),
                          body.colors !==
                            undefined
                            ? body.colors
                            : currentProduct.colors,
                        ),
                    }
                  : {}
              ),

              ...(body.weight !==
                undefined && {
                weight:
                  body.weight !==
                    null &&
                  body.weight !== ''
                    ? this.parseRequiredNumber(
                        body.weight,
                        'weight',
                      )
                    : null,
              }),

...(body.badge !==
  undefined && {
  badge:
    body.badge ||
    null,
}),

...(body.promotion_percentage !==
  undefined && {
  promotion_percentage:
    this.normalizePromotionPercentage(
      body.promotion_percentage,
    ),
}),

...(body.is_active !==
  undefined && {
                is_active:
                  this.parseBoolean(
                    body.is_active,
                  ),
              }),

              ...(body
                .is_available_on_site !==
                undefined && {
                is_available_on_site:
                  this.parseBoolean(
                    body
                      .is_available_on_site,
                  ),
              }),

              ...(body.is_featured !==
                undefined && {
                is_featured:
                  this.parseBoolean(
                    body.is_featured,
                  ),
              }),

              ...(body.is_new !==
                undefined && {
                is_new:
                  this.parseBoolean(
                    body.is_new,
                  ),
              }),

              ...(body.is_bestseller !==
                undefined && {
                is_bestseller:
                  this.parseBoolean(
                    body.is_bestseller,
                  ),
              }),

              ...(body.rating !==
                undefined && {
                rating: Number(
                  body.rating ||
                    0,
                ),
              }),

              ...(body.reviews_count !==
                undefined && {
                reviews_count:
                  Number(
                    body.reviews_count ||
                      0,
                  ),
              }),

              ...(body.category_id !==
                undefined && {
                category_id:
                  body.category_id
                    ? Number(
                        body.category_id,
                      )
                    : null,
              }),

              ...(body.subcategory_id !==
                undefined && {
                subcategory_id:
                  body.subcategory_id
                    ? Number(
                        body.subcategory_id,
                      )
                    : null,
              }),

              ...(body
                .care_instructions !==
                undefined && {
                care_instructions:
                  body
                    .care_instructions ||
                  null,
              }),

              ...(body.origin_country !==
                undefined && {
                origin_country:
                  body.origin_country ||
                  null,
              }),

              ...(body.collection_name !==
                undefined && {
                collection_name:
                  body.collection_name ||
                  null,
              }),

              ...(body.seo_title !==
                undefined && {
                seo_title:
                  body.seo_title ||
                  null,
              }),

              ...(body.seo_description !==
                undefined && {
                seo_description:
                  body
                    .seo_description ||
                  null,
              }),

              updated_at:
                new Date(),
            },
          });

          return tx.products.findUnique({
            where: {
              id,
            },

            include:
              this.getProductSizeVariantsInclude(
                true,
              ),
          });
        },
      );

    if (!product) {
      throw new InternalServerErrorException(
        'Le produit a été modifié mais sa lecture a échoué.',
      );
    }

try {
  await this.mediaRegistryService
    .syncProductImages(
      product.id,
      {
        urlImage1:
          product.url_image1,

        urlImage2:
          product.url_image2,

        urlImage3:
          product.url_image3,

        urlImage4:
          product.url_image4,

        urlImage5:
          product.url_image5,
      },
    );
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  this.logger.warn(
    `Le produit ${product.id} a été modifié, mais la synchronisation de ses variantes médias a échoué : ${message}`,
  );
}

const mediaVariants =
  await this.getProductMediaVariants([
    product.id,
  ]);

return this.serializeProduct(
  product,
  mediaVariants,
);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    this.logger.error(
      `Modification du produit ${id} impossible : ${message}`,
    );

    if (
      message.includes(
        'uq_product_size_variants_reference',
      ) ||
      message.includes(
        'Unique constraint',
      )
    ) {
      throw new BadRequestException(
        'Une référence de taille est déjà utilisée.',
      );
    }

    throw error;
  }
}

async remove(id: number) {
  await this.findById(id);

  try {
    await this.prisma.$transaction(async tx => {
      /*
       * Les commandes doivent conserver leur historique.
       * On détache donc le produit au lieu de supprimer les lignes.
       */
await tx.order_items.updateMany({
  where: {
    product_id: id,
  },

  data: {
    product_id: null,
    product_size_variant_id:
      null,
  },
});

      /*
       * Même logique pour les ventes effectuées en point de vente.
       */
await tx
  .point_of_sale_sale_items
  .updateMany({
    where: {
      product_id: id,
    },

    data: {
      product_id: null,
      product_size_variant_id:
        null,
    },
  });

      /*
       * Ces mouvements dépendent directement du produit et bloquent
       * actuellement la suppression à cause du ON DELETE RESTRICT.
       */
      await tx.stock_movements.deleteMany({
        where: {
          product_id: id,
        },
      });

      /*
       * Suppressions explicites pour rendre le comportement clair,
       * même si certaines contraintes sont déjà en cascade.
       */
      await tx.point_of_sale_stocks.deleteMany({
        where: {
          product_id: id,
        },
      });

      await tx.wishlist_items.deleteMany({
        where: {
          product_id: id,
        },
      });

      await tx.reviews.deleteMany({
        where: {
          product_id: id,
        },
      });

await tx
  .product_size_variants
  .deleteMany({
    where: {
      product_id: id,
    },
  });      

      await tx.products.delete({
        where: {
          id,
        },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    this.logger.error(
      `Suppression impossible pour le produit ${id} : ${message}`,
    );

    throw new InternalServerErrorException(
      'Le produit n’a pas pu être supprimé.',
    );
  }

let imageCleanupWarning = false;

try {
  await this.mediaRegistryService
    .removeProductMedia(id);
} catch (error) {
  imageCleanupWarning = true;

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  this.logger.warn(
    `Le produit ${id} a été supprimé, mais le nettoyage de ses médias a échoué : ${message}`,
  );
}

return {
  success: true,
  deleted_product_id: id,
  detached_order_items: true,
  detached_point_of_sale_sale_items: true,
  image_cleanup_warning:
    imageCleanupWarning,
};
}
}