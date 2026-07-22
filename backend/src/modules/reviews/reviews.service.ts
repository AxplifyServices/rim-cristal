import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

const REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private normalizeToken(
    value: unknown,
  ) {
    return String(
      value || '',
    ).trim();
  }

  private normalizeName(
    value: unknown,
  ) {
    const name =
      String(
        value || '',
      )
        .replace(/\s+/g, ' ')
        .trim();

    if (
      name.length < 2 ||
      name.length > 160
    ) {
      throw new BadRequestException(
        'Le nom doit contenir entre 2 et 160 caractères.',
      );
    }

    return name;
  }

  private normalizeComment(
    value: unknown,
  ) {
    const comment =
      String(
        value || '',
      ).trim();

    if (
      comment.length < 10 ||
      comment.length > 1500
    ) {
      throw new BadRequestException(
        'Le commentaire doit contenir entre 10 et 1500 caractères.',
      );
    }

    return comment;
  }

  private normalizeRating(
    value: unknown,
  ) {
    const rating =
      Number(value);

    if (
      !Number.isInteger(
        rating,
      ) ||
      rating < 1 ||
      rating > 5
    ) {
      throw new BadRequestException(
        'La note doit être un entier compris entre 1 et 5.',
      );
    }

    return rating;
  }

  private serializeReview(
    review: any,
  ) {
    return {
      id:
        review.id,

      name:
        review.guest_name,

      rating:
        review.rating,

      comment:
        review.body,

      is_verified:
        Boolean(
          review.is_verified,
        ),

      moderation_status:
        review.moderation_status,

      display_on_home:
        Boolean(
          review.display_on_home,
        ),

      created_at:
        review.created_at,

      updated_at:
        review.updated_at,

      order:
        review.orders
          ? {
              id:
                review.orders.id,

              order_number:
                review.orders
                  .order_number,

              customer_name:
                [
                  review.orders
                    .shipping_first_name,

                  review.orders
                    .shipping_last_name,
                ]
                  .filter(Boolean)
                  .join(' '),

              email:
                review.orders
                  .shipping_email,

              status:
                review.orders
                  .status,

              created_at:
                review.orders
                  .created_at,
            }
          : null,
    };
  }

async getInvitation(
  tokenValue: string,
) {
  const token =
    this.normalizeToken(
      tokenValue,
    );

  if (!token) {
    throw new BadRequestException(
      'Jeton d’avis manquant.',
    );
  }

  /*
   * review_token dispose d’un index unique partiel
   * côté PostgreSQL. Prisma ne l’expose donc pas
   * dans ordersWhereUniqueInput.
   *
   * On utilise findFirst au lieu de findUnique.
   */
  const order =
    await this.prisma.orders.findFirst({
      where: {
        review_token:
          token,
      },

      select: {
        id: true,
        order_number:
          true,
        shipping_first_name:
          true,
        shipping_last_name:
          true,
        order_origin:
          true,
      },
    });

  if (
    !order ||
    order.order_origin !==
      'website'
  ) {
    throw new NotFoundException(
      'Cette invitation n’est pas valide.',
    );
  }

  /*
   * La relation inverse orders.reviews n’est pas
   * générée dans le client Prisma actuel.
   * On vérifie donc directement la table reviews.
   */
  const existingReview =
    await this.prisma.reviews.findFirst({
      where: {
        order_id:
          order.id,
      },

      select: {
        id: true,
      },
    });

  return {
    order_number:
      order.order_number,

    suggested_name:
      [
        order.shipping_first_name,
        order.shipping_last_name,
      ]
        .filter(Boolean)
        .join(' '),

    already_submitted:
      Boolean(
        existingReview,
      ),
  };
}

async create(
  body: any,
) {
  const token =
    this.normalizeToken(
      body?.token,
    );

  if (!token) {
    throw new BadRequestException(
      'Jeton d’avis manquant.',
    );
  }

  const name =
    this.normalizeName(
      body?.name,
    );

  const rating =
    this.normalizeRating(
      body?.rating,
    );

  const comment =
    this.normalizeComment(
      body?.comment,
    );

  /*
   * review_token n’est pas présent dans
   * ordersWhereUniqueInput, car son unicité
   * est assurée par un index PostgreSQL partiel.
   */
  const order =
    await this.prisma.orders.findFirst({
      where: {
        review_token:
          token,
      },

      select: {
        id: true,
        order_origin:
          true,
        user_id:
          true,
        shipping_email:
          true,
      },
    });

  if (
    !order ||
    order.order_origin !==
      'website'
  ) {
    throw new NotFoundException(
      'Cette commande ne permet pas de déposer un avis.',
    );
  }

  /*
   * Vérification directe dans reviews :
   * le client Prisma actuel ne possède pas
   * la propriété relationnelle orders.reviews.
   */
  const existingReview =
    await this.prisma.reviews.findFirst({
      where: {
        order_id:
          order.id,
      },

      select: {
        id: true,
      },
    });

  if (existingReview) {
    throw new ConflictException(
      'Un avis a déjà été déposé pour cette commande.',
    );
  }

  try {
    const review =
      await this.prisma.reviews.create({
        data: {
          order_id:
            order.id,

          product_id:
            null,

          user_id:
            order.user_id,

          guest_name:
            name,

          guest_email:
            order.shipping_email,

          rating,

          title:
            null,

          body:
            comment,

          is_verified:
            true,

          is_approved:
            false,

          moderation_status:
            'pending',

          display_on_home:
            false,

          updated_at:
            new Date(),
        },
      });

    return {
      id:
        review.id,

      submitted:
        true,

      moderation_status:
        review.moderation_status,
    };
  } catch (error: any) {
    /*
     * L’index unique PostgreSQL sur reviews.order_id
     * reste la protection définitive contre deux
     * envois simultanés pour la même commande.
     */
    if (
      error?.code ===
      'P2002'
    ) {
      throw new ConflictException(
        'Un avis a déjà été déposé pour cette commande.',
      );
    }

    throw error;
  }
}

  async getHomeReviews() {
    const reviews =
      await this.prisma.reviews.findMany({
        where: {
          moderation_status:
            'approved',

          is_approved:
            true,

          display_on_home:
            true,

          body: {
            not: null,
          },
        },

        select: {
          id: true,
          guest_name:
            true,
          rating: true,
          body: true,
          is_verified:
            true,
          created_at:
            true,
        },

        orderBy: [
          {
            created_at:
              'desc',
          },
          {
            id:
              'desc',
          },
        ],
      });

    return reviews.map(
      review => ({
        id:
          review.id,

        name:
          review.guest_name,

        rating:
          review.rating,

        comment:
          review.body,

        is_verified:
          Boolean(
            review.is_verified,
          ),

        created_at:
          review.created_at,
      }),
    );
  }

  async findAll(
    query: {
      status?: string;
    },
  ) {
    const requestedStatus =
      String(
        query.status || '',
      )
        .trim()
        .toLowerCase();

    const status =
      REVIEW_STATUSES.includes(
        requestedStatus as any,
      )
        ? requestedStatus
        : null;

    const reviews =
      await this.prisma.reviews.findMany({
        where: status
          ? {
              moderation_status:
                status,
            }
          : undefined,

        include: {
          orders: {
            select: {
              id: true,
              order_number:
                true,
              shipping_first_name:
                true,
              shipping_last_name:
                true,
              shipping_email:
                true,
              status: true,
              created_at:
                true,
            },
          },
        },

        orderBy: [
          {
            created_at:
              'desc',
          },
          {
            id:
              'desc',
          },
        ],
      });

    return reviews.map(
      review =>
        this.serializeReview(
          review,
        ),
    );
  }

  async updateModeration(
    id: number,
    body: any,
  ) {
    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        'Identifiant d’avis invalide.',
      );
    }

    const status =
      String(
        body?.status || '',
      )
        .trim()
        .toLowerCase();

    if (
      !REVIEW_STATUSES.includes(
        status as any,
      )
    ) {
      throw new BadRequestException(
        'Statut de modération invalide.',
      );
    }

    const existing =
      await this.prisma.reviews.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Avis introuvable.',
      );
    }

    const approved =
      status ===
      'approved';

    const review =
      await this.prisma.reviews.update({
        where: {
          id,
        },

        data: {
          moderation_status:
            status,

          is_approved:
            approved,

          display_on_home:
            approved
              ? existing.display_on_home
              : false,

          updated_at:
            new Date(),
        },

        include: {
          orders: {
            select: {
              id: true,
              order_number:
                true,
              shipping_first_name:
                true,
              shipping_last_name:
                true,
              shipping_email:
                true,
              status: true,
              created_at:
                true,
            },
          },
        },
      });

    return this.serializeReview(
      review,
    );
  }

  async updateHomeVisibility(
    id: number,
    body: any,
  ) {
    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        'Identifiant d’avis invalide.',
      );
    }

    const displayOnHome =
      body?.display_on_home ===
        true ||
      String(
        body?.display_on_home,
      ).toLowerCase() ===
        'true';

    const existing =
      await this.prisma.reviews.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Avis introuvable.',
      );
    }

    if (
      displayOnHome &&
      existing.moderation_status !==
        'approved'
    ) {
      throw new BadRequestException(
        'Seul un avis approuvé peut être affiché sur la page d’accueil.',
      );
    }

    const review =
      await this.prisma.reviews.update({
        where: {
          id,
        },

        data: {
          display_on_home:
            displayOnHome,

          updated_at:
            new Date(),
        },

        include: {
          orders: {
            select: {
              id: true,
              order_number:
                true,
              shipping_first_name:
                true,
              shipping_last_name:
                true,
              shipping_email:
                true,
              status: true,
              created_at:
                true,
            },
          },
        },
      });

    return this.serializeReview(
      review,
    );
  }
}