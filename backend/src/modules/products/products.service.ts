import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(
      Math.max(Number(query.page_size || query.limit || 24), 1),
      20,
    );

    const where: any = {};

    if (String(query.include_inactive || '').toLowerCase() !== 'true') {
      where.is_active = true;
    }

    const categorie = query.categorie || query.category;
    const rubrique = query.rubrique;

    if (categorie) {
      where.categorie = String(categorie);
    }

    if (rubrique) {
      where.rubrique = String(rubrique);
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

    if (query.sale !== undefined) {
      where.discount_percent = {
        gt: 0,
      };
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
    const product = await this.prisma.products.findUnique({
      where: { slug },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(body: any) {
    if (!body.name || !body.slug || !body.reference) {
      throw new BadRequestException('name, slug and reference are required');
    }

    return this.prisma.products.create({
      data: {
        name: body.name,
        slug: body.slug,
        reference: body.reference,

        marque: body.marque || null,
        rubrique: body.rubrique || null,
        categorie: body.categorie || body.category || null,
        famille: body.famille || null,

        description: body.description || null,
        features: body.features || [],
        specs: body.specs || {},

        url_image1: body.url_image1 || null,
        url_image2: body.url_image2 || null,
        url_image3: body.url_image3 || null,
        url_image4: body.url_image4 || null,
        url_image5: body.url_image5 || null,

        price: Number(body.price || 0),
        price_wholesale: Number(body.price_wholesale || 0),
        wholesale_min_qty: Number(body.wholesale_min_qty || 1),
        sale_price:
          body.sale_price !== undefined && body.sale_price !== null
            ? Number(body.sale_price)
            : null,
        discount_percent: Number(body.discount_percent || 0),

        colors: body.colors || [],
        sizes: body.sizes || [],

        stock: Number(body.stock || 0),
        weight:
          body.weight !== undefined && body.weight !== null
            ? Number(body.weight)
            : null,

        badge: body.badge || null,
        is_active:
          body.is_active !== undefined ? Boolean(body.is_active) : true,
        is_featured: Boolean(body.is_featured),
        is_new: Boolean(body.is_new),
        is_bestseller: Boolean(body.is_bestseller),

        rating: Number(body.rating || 0),
        reviews_count: Number(body.reviews_count || 0),
      },
    });
  }

  async update(id: number, body: any) {
    await this.findById(id);

    return this.prisma.products.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.reference !== undefined && { reference: body.reference }),

        ...(body.marque !== undefined && { marque: body.marque }),
        ...(body.rubrique !== undefined && { rubrique: body.rubrique }),
        ...((body.categorie !== undefined || body.category !== undefined) && {
          categorie: body.categorie || body.category,
        }),
        ...(body.famille !== undefined && { famille: body.famille }),

        ...(body.description !== undefined && { description: body.description }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.specs !== undefined && { specs: body.specs }),

        ...(body.url_image1 !== undefined && { url_image1: body.url_image1 }),
        ...(body.url_image2 !== undefined && { url_image2: body.url_image2 }),
        ...(body.url_image3 !== undefined && { url_image3: body.url_image3 }),
        ...(body.url_image4 !== undefined && { url_image4: body.url_image4 }),
        ...(body.url_image5 !== undefined && { url_image5: body.url_image5 }),

        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.price_wholesale !== undefined && {
          price_wholesale: Number(body.price_wholesale),
        }),
        ...(body.wholesale_min_qty !== undefined && {
          wholesale_min_qty: Number(body.wholesale_min_qty),
        }),
        ...(body.sale_price !== undefined && {
          sale_price:
            body.sale_price !== null ? Number(body.sale_price) : null,
        }),
        ...(body.discount_percent !== undefined && {
          discount_percent: Number(body.discount_percent),
        }),

        ...(body.colors !== undefined && { colors: body.colors }),
        ...(body.sizes !== undefined && { sizes: body.sizes }),

        ...(body.stock !== undefined && { stock: Number(body.stock) }),
        ...(body.weight !== undefined && {
          weight: body.weight !== null ? Number(body.weight) : null,
        }),

        ...(body.badge !== undefined && { badge: body.badge }),
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

        ...(body.rating !== undefined && { rating: Number(body.rating) }),
        ...(body.reviews_count !== undefined && {
          reviews_count: Number(body.reviews_count),
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