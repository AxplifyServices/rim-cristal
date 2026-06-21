import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isProductRubrique,
  PRODUCT_RUBRIQUES,
} from './product-rubriques';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
      stock: {
        gt: 0,
      },
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
  where.is_available_on_site = true;
  where.stock = {
    gt: 0,
  };
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
      where.is_bestseller = String(query.bestseller) === 'true';
    }

    if (query.is_new !== undefined || query.new !== undefined) {
      where.is_new = String(query.is_new || query.new) === 'true';
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

    const [items, total] = await this.prisma.$transaction([
      this.prisma.products.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.products.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      page_size: pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: number) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

async findBySlug(slug: string) {
  const product =
    await this.prisma.products.findFirst({
      where: {
        slug,
        is_active: true,
        is_available_on_site: true,
        stock: {
          gt: 0,
        },
      },
    });

  if (!product) {
    throw new NotFoundException(
      'Product not found',
    );
  }

  return product;
}

async create(body: any) {
  if (!body.name) {
    throw new BadRequestException('name is required');
  }

  const slug = await this.generateUniqueSlug(body.name);
  const reference = await this.generateReference();

  return this.prisma.products.create({
    data: {
      name: body.name,
      slug,
      reference,

      marque: body.marque || null,
rubrique:
  this.normalizeRubrique(
    body.rubrique,
    true,
  ),
      categorie: body.categorie || body.category || null,
      famille: body.famille || null,

      description: body.description || null,

      url_image1: body.url_image1 || null,
      url_image2: body.url_image2 || null,
      url_image3: body.url_image3 || null,
      url_image4: body.url_image4 || null,
      url_image5: body.url_image5 || null,

      price: Number(body.price || 0),

      colors: body.colors || [],
      sizes: body.sizes || [],

      stock: Number(body.stock || 0),
      weight:
        body.weight !== undefined && body.weight !== null && body.weight !== ''
          ? Number(body.weight)
          : null,

      badge: body.badge || null,

      is_active:
        body.is_active !== undefined ? Boolean(body.is_active) : true,
      is_available_on_site:
        body.is_available_on_site !== undefined
          ? Boolean(body.is_available_on_site)
          : true,
      is_featured: Boolean(body.is_featured),
      is_new: Boolean(body.is_new),
      is_bestseller: Boolean(body.is_bestseller),

      rating: Number(body.rating || 0),
      reviews_count: Number(body.reviews_count || 0),

      category_id: body.category_id ? Number(body.category_id) : null,
      subcategory_id: body.subcategory_id ? Number(body.subcategory_id) : null,

      care_instructions: body.care_instructions || null,
      origin_country: body.origin_country || null,
      collection_name: body.collection_name || null,

      seo_title: body.seo_title || null,
      seo_description: body.seo_description || null,

      price_wholesale: Number(body.price_wholesale || 0),
      wholesale_min_qty: Number(body.wholesale_min_qty || 1),
    },
  });
}

  async update(id: number, body: any) {
    await this.findById(id);

const nextSlug =
  body.name !== undefined ? await this.generateUniqueSlug(body.name, id) : undefined;

    return this.prisma.products.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(nextSlug !== undefined && { slug: nextSlug }),

        ...(body.marque !== undefined && { marque: body.marque || null }),
...(body.rubrique !== undefined && {
  rubrique: this.normalizeRubrique(
    body.rubrique,
    true,
  ),
}),
        ...((body.categorie !== undefined || body.category !== undefined) && {
          categorie: body.categorie || body.category || null,
        }),
        ...(body.famille !== undefined && { famille: body.famille || null }),

        ...(body.description !== undefined && {
          description: body.description || null,
        }),

        ...(body.url_image1 !== undefined && { url_image1: body.url_image1 || null }),
        ...(body.url_image2 !== undefined && { url_image2: body.url_image2 || null }),
        ...(body.url_image3 !== undefined && { url_image3: body.url_image3 || null }),
        ...(body.url_image4 !== undefined && { url_image4: body.url_image4 || null }),
        ...(body.url_image5 !== undefined && { url_image5: body.url_image5 || null }),

        ...(body.price !== undefined && { price: Number(body.price || 0) }),

        ...(body.colors !== undefined && { colors: body.colors || [] }),
        ...(body.sizes !== undefined && { sizes: body.sizes || [] }),

        ...(body.stock !== undefined && { stock: Number(body.stock || 0) }),
        ...(body.weight !== undefined && {
          weight:
            body.weight !== null && body.weight !== ''
              ? Number(body.weight)
              : null,
        }),

        ...(body.badge !== undefined && { badge: body.badge || null }),

        ...(body.is_active !== undefined && {
          is_active: Boolean(body.is_active),
        }),
        ...(body.is_featured !== undefined && {
          is_featured: Boolean(body.is_featured),
        }),
        ...(body.is_new !== undefined && {
          is_new: Boolean(body.is_new),
        }),
        ...(body.is_bestseller !== undefined && {
          is_bestseller: Boolean(body.is_bestseller),
        }),

        ...(body.is_available_on_site !== undefined && {
          is_available_on_site: Boolean(body.is_available_on_site),
        }),

        ...(body.rating !== undefined && { rating: Number(body.rating || 0) }),
        ...(body.reviews_count !== undefined && {
          reviews_count: Number(body.reviews_count || 0),
        }),

        ...(body.category_id !== undefined && {
          category_id: body.category_id ? Number(body.category_id) : null,
        }),
        ...(body.subcategory_id !== undefined && {
          subcategory_id: body.subcategory_id ? Number(body.subcategory_id) : null,
        }),

        ...(body.care_instructions !== undefined && {
          care_instructions: body.care_instructions || null,
        }),
        ...(body.origin_country !== undefined && {
          origin_country: body.origin_country || null,
        }),
        ...(body.collection_name !== undefined && {
          collection_name: body.collection_name || null,
        }),

        ...(body.seo_title !== undefined && {
          seo_title: body.seo_title || null,
        }),
        ...(body.seo_description !== undefined && {
          seo_description: body.seo_description || null,
        }),

        ...(body.price_wholesale !== undefined && {
          price_wholesale: Number(body.price_wholesale || 0),
        }),
        ...(body.wholesale_min_qty !== undefined && {
          wholesale_min_qty: Number(body.wholesale_min_qty || 1),
        }),

        updated_at: new Date(),
      },
    });
  }

  async remove(id: number) {
    await this.findById(id);

    await this.prisma.products.delete({
      where: { id },
    });

    return { success: true };
  }
}