import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

import {
  MediaRegistryService,
} from '../media-processing/media-registry.service';

import {
  BROCHURE_IMAGE_FITS,
  BROCHURE_LINK_TARGETS,
  BrochureImageFit,
  BrochureLinkTarget,
  BrochureReorderItem,
  NormalizedBrochurePayload,
} from './homepage-brochures.types';

@Injectable()
export class HomepageBrochuresService {
  private readonly logger =
    new Logger(
      HomepageBrochuresService.name,
    );

  constructor(
    private readonly prisma:
      PrismaService,

    private readonly mediaRegistryService:
      MediaRegistryService,
  ) {}

  /**
   * Route publique.
   *
   * Ne retourne que les brochures actives, dans l'ordre défini
   * dans l'administration.
   */
  async findPublic() {
    const brochures =
      await this.prisma.homepage_brochures.findMany({
        where: {
          is_active: true,
        },
        orderBy: [
          {
            sort_order: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

const mediaVariants =
  await this.getBrochureMediaVariants(
    brochures.map(brochure =>
      brochure.id,
    ),
  );

return brochures.map(brochure =>
  this.formatBrochure(
    brochure,
    mediaVariants,
  ),
);
  }

  /**
   * Route administrateur.
   *
   * Retourne les brochures actives et inactives.
   */
  async findAllAdmin() {
    const brochures =
      await this.prisma.homepage_brochures.findMany({
        orderBy: [
          {
            sort_order: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

const mediaVariants =
  await this.getBrochureMediaVariants(
    brochures.map(brochure =>
      brochure.id,
    ),
  );

return brochures.map(brochure =>
  this.formatBrochure(
    brochure,
    mediaVariants,
  ),
);
  }

  async findById(id: number) {
    const normalizedId = this.normalizeId(id);

    const brochure =
      await this.prisma.homepage_brochures.findUnique({
        where: {
          id: normalizedId,
        },
      });

    if (!brochure) {
      throw new NotFoundException(
        'Brochure introuvable.',
      );
    }

const mediaVariants =
  await this.getBrochureMediaVariants([
    brochure.id,
  ]);

return this.formatBrochure(
  brochure,
  mediaVariants,
);
  }

  async create(body: any, user?: any) {
    const payload = this.normalizePayload(body);

    const createdByUserId =
      this.normalizeOptionalUserId(user?.sub);

    const brochure =
      await this.prisma.homepage_brochures.create({
        data: {
          image_url: payload.imageUrl,
          mobile_image_url: payload.mobileImageUrl,

          alt_text_fr: payload.altTextFr,
          alt_text_en: payload.altTextEn,

          link_url: payload.linkUrl,
          link_target: payload.linkTarget,

          sort_order: payload.sortOrder,
          is_active: payload.isActive,

          desktop_fit: payload.desktopFit,
          desktop_position_x: new Prisma.Decimal(
            payload.desktopPositionX,
          ),
          desktop_position_y: new Prisma.Decimal(
            payload.desktopPositionY,
          ),
          desktop_zoom: new Prisma.Decimal(
            payload.desktopZoom,
          ),

          mobile_fit: payload.mobileFit,
          mobile_position_x: new Prisma.Decimal(
            payload.mobilePositionX,
          ),
          mobile_position_y: new Prisma.Decimal(
            payload.mobilePositionY,
          ),
          mobile_zoom: new Prisma.Decimal(
            payload.mobileZoom,
          ),

          created_by_user_id: createdByUserId,
          updated_at: new Date(),
        },
      });

try {
  await this.mediaRegistryService
    .syncBrochureImages(
      brochure.id,
      {
        desktopImageUrl:
          brochure.image_url,

        mobileImageUrl:
          brochure.mobile_image_url,
      },
    );
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  this.logger.warn(
    `La brochure ${brochure.id} a été créée, mais l’enregistrement de ses variantes médias a échoué : ${message}`,
  );
}

const mediaVariants =
  await this.getBrochureMediaVariants([
    brochure.id,
  ]);

return this.formatBrochure(
  brochure,
  mediaVariants,
);
  }

  async update(
    id: number,
    body: any,
  ) {
    const normalizedId = this.normalizeId(id);

    const existing =
      await this.prisma.homepage_brochures.findUnique({
        where: {
          id: normalizedId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Brochure introuvable.',
      );
    }

    const payload = this.normalizePayload(body, existing);

    const updated =
      await this.prisma.homepage_brochures.update({
        where: {
          id: normalizedId,
        },
        data: {
          image_url: payload.imageUrl,
          mobile_image_url: payload.mobileImageUrl,

          alt_text_fr: payload.altTextFr,
          alt_text_en: payload.altTextEn,

          link_url: payload.linkUrl,
          link_target: payload.linkTarget,

          sort_order: payload.sortOrder,
          is_active: payload.isActive,

          desktop_fit: payload.desktopFit,
          desktop_position_x: new Prisma.Decimal(
            payload.desktopPositionX,
          ),
          desktop_position_y: new Prisma.Decimal(
            payload.desktopPositionY,
          ),
          desktop_zoom: new Prisma.Decimal(
            payload.desktopZoom,
          ),

          mobile_fit: payload.mobileFit,
          mobile_position_x: new Prisma.Decimal(
            payload.mobilePositionX,
          ),
          mobile_position_y: new Prisma.Decimal(
            payload.mobilePositionY,
          ),
          mobile_zoom: new Prisma.Decimal(
            payload.mobileZoom,
          ),

          updated_at: new Date(),
        },
      });

try {
  await this.mediaRegistryService
    .syncBrochureImages(
      updated.id,
      {
        desktopImageUrl:
          updated.image_url,

        mobileImageUrl:
          updated.mobile_image_url,
      },
    );
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  this.logger.warn(
    `La brochure ${updated.id} a été modifiée, mais la synchronisation de ses variantes médias a échoué : ${message}`,
  );
}

const mediaVariants =
  await this.getBrochureMediaVariants([
    updated.id,
  ]);

return this.formatBrochure(
  updated,
  mediaVariants,
);
  }

  async remove(id: number) {
    const normalizedId = this.normalizeId(id);

    const existing =
      await this.prisma.homepage_brochures.findUnique({
        where: {
          id: normalizedId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Brochure introuvable.',
      );
    }

await this.prisma.homepage_brochures.delete({
  where: {
    id: normalizedId,
  },
});

let imageCleanupWarning = false;

try {
  await this.mediaRegistryService
    .removeBrochureMedia(
      normalizedId,
    );
} catch (error) {
  imageCleanupWarning = true;

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  this.logger.warn(
    `La brochure ${normalizedId} a été supprimée, mais le nettoyage de ses médias a échoué : ${message}`,
  );
}

return {
  success: true,
  id: normalizedId,
  image_cleanup_warning:
    imageCleanupWarning,
};
  }

  /**
   * Le frontend doit envoyer :
   *
   * {
   *   "items": [
   *     { "id": 5, "sortOrder": 0 },
   *     { "id": 2, "sortOrder": 1 },
   *     { "id": 8, "sortOrder": 2 }
   *   ]
   * }
   */
  async reorder(body: any) {
    const items = this.normalizeReorderItems(
      body?.items,
    );

    const ids = items.map(item => item.id);

    const existingBrochures =
      await this.prisma.homepage_brochures.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        select: {
          id: true,
        },
      });

    const existingIds = new Set(
      existingBrochures.map(item => item.id),
    );

    const missingIds = ids.filter(
      id => !existingIds.has(id),
    );

    if (missingIds.length > 0) {
      throw new BadRequestException(
        `Brochures introuvables : ${missingIds.join(', ')}.`,
      );
    }

    await this.prisma.$transaction(
      items.map(item =>
        this.prisma.homepage_brochures.update({
          where: {
            id: item.id,
          },
          data: {
            sort_order: item.sortOrder,
            updated_at: new Date(),
          },
        }),
      ),
    );

    return this.findAllAdmin();
  }

  private normalizePayload(
    body: any,
    existing?: any,
  ): NormalizedBrochurePayload {
    const imageUrl = this.normalizeRequiredString(
      this.pickValue(
        body,
        ['imageUrl', 'image_url'],
        existing?.image_url,
      ),
      'L’image desktop est obligatoire.',
      2048,
    );

    const mobileImageUrl =
      this.normalizeOptionalString(
        this.pickValue(
          body,
          ['mobileImageUrl', 'mobile_image_url'],
          existing?.mobile_image_url,
        ),
        2048,
      );

    const altTextFr = this.normalizeRequiredString(
      this.pickValue(
        body,
        ['altTextFr', 'alt_text_fr'],
        existing?.alt_text_fr,
      ),
      'Le texte alternatif français est obligatoire.',
      255,
    );

    const altTextEn =
      this.normalizeOptionalString(
        this.pickValue(
          body,
          ['altTextEn', 'alt_text_en'],
          existing?.alt_text_en,
        ),
        255,
      );

    const linkUrl = this.normalizeLinkUrl(
      this.pickValue(
        body,
        ['linkUrl', 'link_url'],
        existing?.link_url,
      ),
    );

    const linkTarget = this.normalizeLinkTarget(
      this.pickValue(
        body,
        ['linkTarget', 'link_target'],
        existing?.link_target ?? '_self',
      ),
    );

    const sortOrder = this.normalizeInteger(
      this.pickValue(
        body,
        ['sortOrder', 'sort_order'],
        existing?.sort_order ?? 0,
      ),
      'L’ordre d’affichage est invalide.',
      0,
      100000,
    );

    const isActive = this.normalizeBoolean(
      this.pickValue(
        body,
        ['isActive', 'is_active'],
        existing?.is_active ?? true,
      ),
      true,
    );

    const desktopFit = this.normalizeFit(
      this.pickValue(
        body,
        ['desktopFit', 'desktop_fit'],
        existing?.desktop_fit ?? 'cover',
      ),
      'desktopFit',
    );

    const desktopPositionX = this.normalizeNumber(
      this.pickValue(
        body,
        [
          'desktopPositionX',
          'desktop_position_x',
        ],
        existing?.desktop_position_x ?? 50,
      ),
      'La position horizontale desktop est invalide.',
      0,
      100,
    );

    const desktopPositionY = this.normalizeNumber(
      this.pickValue(
        body,
        [
          'desktopPositionY',
          'desktop_position_y',
        ],
        existing?.desktop_position_y ?? 50,
      ),
      'La position verticale desktop est invalide.',
      0,
      100,
    );

    const desktopZoom = this.normalizeNumber(
      this.pickValue(
        body,
        ['desktopZoom', 'desktop_zoom'],
        existing?.desktop_zoom ?? 1,
      ),
      'Le zoom desktop est invalide.',
      0.25,
      4,
    );

    const mobileFit = this.normalizeFit(
      this.pickValue(
        body,
        ['mobileFit', 'mobile_fit'],
        existing?.mobile_fit ?? 'cover',
      ),
      'mobileFit',
    );

    const mobilePositionX = this.normalizeNumber(
      this.pickValue(
        body,
        [
          'mobilePositionX',
          'mobile_position_x',
        ],
        existing?.mobile_position_x ?? 50,
      ),
      'La position horizontale mobile est invalide.',
      0,
      100,
    );

    const mobilePositionY = this.normalizeNumber(
      this.pickValue(
        body,
        [
          'mobilePositionY',
          'mobile_position_y',
        ],
        existing?.mobile_position_y ?? 50,
      ),
      'La position verticale mobile est invalide.',
      0,
      100,
    );

    const mobileZoom = this.normalizeNumber(
      this.pickValue(
        body,
        ['mobileZoom', 'mobile_zoom'],
        existing?.mobile_zoom ?? 1,
      ),
      'Le zoom mobile est invalide.',
      0.25,
      4,
    );

    return {
      imageUrl,
      mobileImageUrl,

      altTextFr,
      altTextEn,

      linkUrl,
      linkTarget,

      sortOrder,
      isActive,

      desktopFit,
      desktopPositionX,
      desktopPositionY,
      desktopZoom,

      mobileFit,
      mobilePositionX,
      mobilePositionY,
      mobileZoom,
    };
  }

  private normalizeReorderItems(
    rawItems: unknown,
  ): BrochureReorderItem[] {
    if (!Array.isArray(rawItems)) {
      throw new BadRequestException(
        'Le champ items doit être un tableau.',
      );
    }

    if (rawItems.length === 0) {
      throw new BadRequestException(
        'La liste de réorganisation est vide.',
      );
    }

    const normalizedItems = rawItems.map(
      (rawItem: any, index: number) => {
        const id = this.normalizeInteger(
          rawItem?.id,
          `L’identifiant de la ligne ${index + 1} est invalide.`,
          1,
          Number.MAX_SAFE_INTEGER,
        );

        const sortOrder = this.normalizeInteger(
          rawItem?.sortOrder ??
            rawItem?.sort_order ??
            index,
          `L’ordre de la ligne ${index + 1} est invalide.`,
          0,
          100000,
        );

        return {
          id,
          sortOrder,
        };
      },
    );

    const uniqueIds = new Set(
      normalizedItems.map(item => item.id),
    );

    if (uniqueIds.size !== normalizedItems.length) {
      throw new BadRequestException(
        'Une même brochure apparaît plusieurs fois dans la liste.',
      );
    }

    return normalizedItems;
  }

  private normalizeLinkUrl(
    value: unknown,
  ): string | null {
    const normalized = this.normalizeOptionalString(
      value,
      2048,
    );

    if (!normalized) {
      return null;
    }

    /**
     * Lien interne.
     *
     * Les URL commençant par // sont refusées car elles pointent
     * vers un domaine externe en utilisant le protocole courant.
     */
    if (
      normalized.startsWith('/') &&
      !normalized.startsWith('//')
    ) {
      return normalized;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(normalized);
    } catch {
      throw new BadRequestException(
        'Le lien de la brochure est invalide.',
      );
    }

    if (
      parsedUrl.protocol !== 'http:' &&
      parsedUrl.protocol !== 'https:'
    ) {
      throw new BadRequestException(
        'Seuls les liens HTTP, HTTPS ou internes sont autorisés.',
      );
    }

    return parsedUrl.toString();
  }

  private normalizeLinkTarget(
    value: unknown,
  ): BrochureLinkTarget {
    const normalized = String(
      value ?? '_self',
    ).trim();

    if (
      !BROCHURE_LINK_TARGETS.includes(
        normalized as BrochureLinkTarget,
      )
    ) {
      throw new BadRequestException(
        'linkTarget doit être "_self" ou "_blank".',
      );
    }

    return normalized as BrochureLinkTarget;
  }

  private normalizeFit(
    value: unknown,
    fieldName: string,
  ): BrochureImageFit {
    const normalized = String(
      value ?? 'cover',
    )
      .trim()
      .toLowerCase();

    if (
      !BROCHURE_IMAGE_FITS.includes(
        normalized as BrochureImageFit,
      )
    ) {
      throw new BadRequestException(
        `${fieldName} doit être "cover" ou "contain".`,
      );
    }

    return normalized as BrochureImageFit;
  }

  private normalizeBoolean(
    value: unknown,
    defaultValue: boolean,
  ): boolean {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    const normalized = String(value)
      .trim()
      .toLowerCase();

    if (
      ['true', '1', 'yes', 'oui'].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (
      ['false', '0', 'no', 'non'].includes(
        normalized,
      )
    ) {
      return false;
    }

    throw new BadRequestException(
      'La valeur booléenne est invalide.',
    );
  }

  private normalizeNumber(
    value: unknown,
    errorMessage: string,
    min: number,
    max: number,
  ): number {
    const normalized = Number(value);

    if (
      !Number.isFinite(normalized) ||
      normalized < min ||
      normalized > max
    ) {
      throw new BadRequestException(errorMessage);
    }

    return normalized;
  }

  private normalizeInteger(
    value: unknown,
    errorMessage: string,
    min: number,
    max: number,
  ): number {
    const normalized = Number(value);

    if (
      !Number.isSafeInteger(normalized) ||
      normalized < min ||
      normalized > max
    ) {
      throw new BadRequestException(errorMessage);
    }

    return normalized;
  }

  private normalizeId(value: unknown): number {
    return this.normalizeInteger(
      value,
      'Identifiant de brochure invalide.',
      1,
      Number.MAX_SAFE_INTEGER,
    );
  }

  private normalizeOptionalUserId(
    value: unknown,
  ): number | null {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return null;
    }

    const normalized = Number(value);

    if (
      !Number.isSafeInteger(normalized) ||
      normalized <= 0
    ) {
      return null;
    }

    return normalized;
  }

  private normalizeRequiredString(
    value: unknown,
    errorMessage: string,
    maxLength: number,
  ): string {
    const normalized = String(
      value ?? '',
    ).trim();

    if (!normalized) {
      throw new BadRequestException(errorMessage);
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `La valeur ne doit pas dépasser ${maxLength} caractères.`,
      );
    }

    return normalized;
  }

  private normalizeOptionalString(
    value: unknown,
    maxLength: number,
  ): string | null {
    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    const normalized = String(value).trim();

    if (!normalized) {
      return null;
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `La valeur ne doit pas dépasser ${maxLength} caractères.`,
      );
    }

    return normalized;
  }

  private pickValue(
    body: any,
    keys: string[],
    fallback: unknown,
  ): unknown {
    for (const key of keys) {
      if (
        body &&
        Object.prototype.hasOwnProperty.call(
          body,
          key,
        )
      ) {
        return body[key];
      }
    }

    return fallback;
  }

private async getBrochureMediaVariants(
  brochureIds: number[],
) {
  const normalizedIds = [
    ...new Set(
      brochureIds.filter(
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
      owner_type:
        'HOMEPAGE_BROCHURE',

      owner_id: {
        in: normalizedIds,
      },

      processing_status:
        'READY',
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

private buildBrochureVariantGroup(
  brochureId: number,
  sourceSlot: string,
  fallbackUrl: string | null,
  mediaVariants: any[],
) {
  const rows =
    mediaVariants.filter(
      row =>
        row.owner_id ===
          brochureId &&
        row.source_slot ===
          sourceSlot,
    );

  const findVariant = (
    type: string,
  ) => {
    const row = rows.find(
      item =>
        item.variant_type ===
        type,
    );

    return row?.variant_url ||
      null;
  };

  const original =
    findVariant(
      'ORIGINAL',
    ) ||
    fallbackUrl ||
    null;

  return {
    original,

    mobile:
      findVariant(
        'MOBILE',
      ) ||
      findVariant(
        'TABLET',
      ) ||
      original,

    tablet:
      findVariant(
        'TABLET',
      ) ||
      findVariant(
        'DESKTOP',
      ) ||
      original,

    desktop:
      findVariant(
        'DESKTOP',
      ) ||
      findVariant(
        'LARGE',
      ) ||
      original,

    large:
      findVariant(
        'LARGE',
      ) ||
      findVariant(
        'DESKTOP',
      ) ||
      original,
  };
}  

private formatBrochure(
  brochure: any,
  mediaVariants: any[] = [],
) {
  const desktopVariants =
    this.buildBrochureVariantGroup(
      brochure.id,
      'BROCHURE_DESKTOP',
      brochure.image_url,
      mediaVariants,
    );

  const mobileVariants =
    this.buildBrochureVariantGroup(
      brochure.id,
      'BROCHURE_MOBILE',
      brochure.mobile_image_url ||
        brochure.image_url,
      mediaVariants,
    );

  return {
    id: brochure.id,

    /*
     * Champs historiques conservés pour compatibilité.
     */
    imageUrl:
      desktopVariants.desktop ||
      brochure.image_url,

    mobileImageUrl:
      mobileVariants.mobile ||
      brochure.mobile_image_url ||
      desktopVariants.desktop ||
      brochure.image_url,

    /*
     * Nouveau format détaillé.
     */
    imageVariants:
      desktopVariants,

    mobileImageVariants:
      mobileVariants,

    altTextFr:
      brochure.alt_text_fr,

    altTextEn:
      brochure.alt_text_en ||
      null,

    linkUrl:
      brochure.link_url ||
      null,

    linkTarget:
      brochure.link_target ||
      '_self',

    sortOrder:
      brochure.sort_order,

    isActive:
      brochure.is_active,

    desktopFit:
      brochure.desktop_fit ||
      'cover',

    desktopPositionX:
      this.decimalToNumber(
        brochure.desktop_position_x,
        50,
      ),

    desktopPositionY:
      this.decimalToNumber(
        brochure.desktop_position_y,
        50,
      ),

    desktopZoom:
      this.decimalToNumber(
        brochure.desktop_zoom,
        1,
      ),

    mobileFit:
      brochure.mobile_fit ||
      'cover',

    mobilePositionX:
      this.decimalToNumber(
        brochure.mobile_position_x,
        50,
      ),

    mobilePositionY:
      this.decimalToNumber(
        brochure.mobile_position_y,
        50,
      ),

    mobileZoom:
      this.decimalToNumber(
        brochure.mobile_zoom,
        1,
      ),

    createdByUserId:
      brochure.created_by_user_id ||
      null,

    createdAt:
      brochure.created_at,

    updatedAt:
      brochure.updated_at,
  };
}

  private decimalToNumber(
    value: unknown,
    fallback: number,
  ): number {
    if (
      value === undefined ||
      value === null
    ) {
      return fallback;
    }

    const normalized = Number(value);

    return Number.isFinite(normalized)
      ? normalized
      : fallback;
  }
}