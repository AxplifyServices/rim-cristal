import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type MediaOwnerType =
  | 'PRODUCT'
  | 'HOMEPAGE_BROCHURE';

type MediaSourceSlot =
  | 'PRODUCT_IMAGE_1'
  | 'PRODUCT_IMAGE_2'
  | 'PRODUCT_IMAGE_3'
  | 'PRODUCT_IMAGE_4'
  | 'PRODUCT_IMAGE_5'
  | 'BROCHURE_DESKTOP'
  | 'BROCHURE_MOBILE';

type ExistingMediaVariant = {
  id: number;
  source_slot: MediaSourceSlot;
  variant_type: string;
  original_url: string;
  variant_url: string;
  storage_object_key: string | null;
};

type MediaSlotInput = {
  sourceSlot: MediaSourceSlot;
  url: string | null;
};

const PRODUCT_VARIANTS = [
  'THUMBNAIL',
  'CARD',
  'DETAIL',
  'LARGE',
] as const;

const BROCHURE_DESKTOP_VARIANTS = [
  'TABLET',
  'DESKTOP',
  'LARGE',
] as const;

const BROCHURE_MOBILE_VARIANTS = [
  'MOBILE',
  'TABLET',
] as const;

@Injectable()
export class MediaRegistryService {
  private readonly logger =
    new Logger(
      MediaRegistryService.name,
    );

  constructor(
    private readonly prisma:
      PrismaService,

    private readonly storageService:
      StorageService,
  ) {}

  async syncProductImages(
    productId: number,
    images: {
      urlImage1?: string | null;
      urlImage2?: string | null;
      urlImage3?: string | null;
      urlImage4?: string | null;
      urlImage5?: string | null;
    },
  ): Promise<void> {
    await this.syncOwnerMedia(
      'PRODUCT',
      productId,
      [
        {
          sourceSlot:
            'PRODUCT_IMAGE_1',
          url:
            images.urlImage1 ??
            null,
        },
        {
          sourceSlot:
            'PRODUCT_IMAGE_2',
          url:
            images.urlImage2 ??
            null,
        },
        {
          sourceSlot:
            'PRODUCT_IMAGE_3',
          url:
            images.urlImage3 ??
            null,
        },
        {
          sourceSlot:
            'PRODUCT_IMAGE_4',
          url:
            images.urlImage4 ??
            null,
        },
        {
          sourceSlot:
            'PRODUCT_IMAGE_5',
          url:
            images.urlImage5 ??
            null,
        },
      ],
    );
  }

  async syncBrochureImages(
    brochureId: number,
    images: {
      desktopImageUrl:
        | string
        | null;

      mobileImageUrl?:
        | string
        | null;
    },
  ): Promise<void> {
    await this.syncOwnerMedia(
      'HOMEPAGE_BROCHURE',
      brochureId,
      [
        {
          sourceSlot:
            'BROCHURE_DESKTOP',

          url:
            images
              .desktopImageUrl ??
            null,
        },

        {
          sourceSlot:
            'BROCHURE_MOBILE',

          url:
            images
              .mobileImageUrl ??
            null,
        },
      ],
    );
  }

  async removeProductMedia(
    productId: number,
  ): Promise<void> {
    await this.removeOwnerMedia(
      'PRODUCT',
      productId,
    );
  }

  async removeBrochureMedia(
    brochureId: number,
  ): Promise<void> {
    await this.removeOwnerMedia(
      'HOMEPAGE_BROCHURE',
      brochureId,
    );
  }

  private async syncOwnerMedia(
    ownerType: MediaOwnerType,
    ownerId: number,
    slots: MediaSlotInput[],
  ): Promise<void> {
    const existingRows =
      await this.prisma.$queryRaw<
        ExistingMediaVariant[]
      >`
        SELECT
          id,
          source_slot,
          variant_type,
          original_url,
          variant_url,
          storage_object_key
        FROM media_variants
        WHERE owner_type = ${ownerType}
          AND owner_id = ${ownerId}
        ORDER BY
          source_slot,
          variant_type
      `;

    for (const slot of slots) {
      const normalizedUrl =
        this.normalizeUrl(slot.url);

      const slotRows =
        existingRows.filter(
          row =>
            row.source_slot ===
            slot.sourceSlot,
        );

      const originalRow =
        slotRows.find(
          row =>
            row.variant_type ===
            'ORIGINAL',
        );

      const existingOriginalUrl =
        this.normalizeUrl(
          originalRow
            ?.original_url,
        );

      if (!normalizedUrl) {
        if (
          slotRows.length >
          0
        ) {
          await this.removeSlotRows(
            ownerType,
            ownerId,
            slot.sourceSlot,
            slotRows,
            existingOriginalUrl,
          );
        }

        continue;
      }

      if (
        existingOriginalUrl ===
        normalizedUrl
      ) {
        await this.ensurePendingVariants(
          ownerType,
          ownerId,
          slot.sourceSlot,
          normalizedUrl,
        );

        continue;
      }

      if (
        slotRows.length >
        0
      ) {
        await this.removeSlotRows(
          ownerType,
          ownerId,
          slot.sourceSlot,
          slotRows,
          existingOriginalUrl,
        );
      }

      await this.createOriginalAndVariants(
        ownerType,
        ownerId,
        slot.sourceSlot,
        normalizedUrl,
      );
    }
  }

  private async createOriginalAndVariants(
    ownerType: MediaOwnerType,
    ownerId: number,
    sourceSlot: MediaSourceSlot,
    originalUrl: string,
  ): Promise<void> {
    await this.prisma.$transaction(
      async tx => {
        await tx.$executeRaw`
          INSERT INTO media_variants (
            owner_type,
            owner_id,
            source_slot,
            variant_type,
            original_url,
            variant_url,
            processing_status,
            created_at,
            updated_at
          )
          VALUES (
            ${ownerType},
            ${ownerId},
            ${sourceSlot},
            'ORIGINAL',
            ${originalUrl},
            ${originalUrl},
            'READY',
            NOW(),
            NOW()
          )
          ON CONFLICT (
            owner_type,
            owner_id,
            source_slot,
            variant_type
          )
          DO UPDATE SET
            original_url =
              EXCLUDED.original_url,

            variant_url =
              EXCLUDED.variant_url,

            storage_object_key =
              NULL,

            width =
              NULL,

            height =
              NULL,

            file_size_bytes =
              NULL,

            mime_type =
              NULL,

            processing_status =
              'READY',

            processing_error =
              NULL,

            updated_at =
              NOW()
        `;

        const variantTypes =
          this.getVariantTypesForSlot(
            sourceSlot,
          );

        for (
          const variantType
          of variantTypes
        ) {
          await tx.$executeRaw`
            INSERT INTO media_variants (
              owner_type,
              owner_id,
              source_slot,
              variant_type,
              original_url,
              variant_url,
              processing_status,
              created_at,
              updated_at
            )
            VALUES (
              ${ownerType},
              ${ownerId},
              ${sourceSlot},
              ${variantType},
              ${originalUrl},
              ${originalUrl},
              'PENDING',
              NOW(),
              NOW()
            )
            ON CONFLICT (
              owner_type,
              owner_id,
              source_slot,
              variant_type
            )
            DO UPDATE SET
              original_url =
                EXCLUDED.original_url,

              variant_url =
                EXCLUDED.variant_url,

              storage_object_key =
                NULL,

              width =
                NULL,

              height =
                NULL,

              file_size_bytes =
                NULL,

              mime_type =
                NULL,

              processing_status =
                'PENDING',

              processing_error =
                NULL,

              updated_at =
                NOW()
          `;
        }
      },
    );

    this.logger.log(
      [
        ownerType,
        ownerId,
        sourceSlot,
        'enregistré pour optimisation',
      ].join(' — '),
    );
  }

  private async ensurePendingVariants(
    ownerType: MediaOwnerType,
    ownerId: number,
    sourceSlot: MediaSourceSlot,
    originalUrl: string,
  ): Promise<void> {
    const variantTypes =
      this.getVariantTypesForSlot(
        sourceSlot,
      );

    for (
      const variantType
      of variantTypes
    ) {
      await this.prisma.$executeRaw`
        INSERT INTO media_variants (
          owner_type,
          owner_id,
          source_slot,
          variant_type,
          original_url,
          variant_url,
          processing_status,
          created_at,
          updated_at
        )
        VALUES (
          ${ownerType},
          ${ownerId},
          ${sourceSlot},
          ${variantType},
          ${originalUrl},
          ${originalUrl},
          'PENDING',
          NOW(),
          NOW()
        )
        ON CONFLICT (
          owner_type,
          owner_id,
          source_slot,
          variant_type
        )
        DO NOTHING
      `;
    }
  }

  private async removeSlotRows(
    ownerType: MediaOwnerType,
    ownerId: number,
    sourceSlot: MediaSourceSlot,
    rows: ExistingMediaVariant[],
    oldOriginalUrl: string | null,
  ): Promise<void> {
    const generatedUrls =
      new Set(
        rows
          .filter(
            row =>
              row.variant_type !==
                'ORIGINAL' &&
              row.storage_object_key,
          )
          .map(
            row =>
              row.variant_url,
          )
          .filter(Boolean),
      );

    await this.prisma.$executeRaw`
      DELETE FROM media_variants
      WHERE owner_type = ${ownerType}
        AND owner_id = ${ownerId}
        AND source_slot = ${sourceSlot}
    `;

    for (
      const generatedUrl
      of generatedUrls
    ) {
      await this.storageService
        .removeObjectFromUrl(
          generatedUrl,
        );
    }

    if (oldOriginalUrl) {
      await this.removeOriginalIfUnused(
        oldOriginalUrl,
      );
    }
  }

  private async removeOwnerMedia(
    ownerType: MediaOwnerType,
    ownerId: number,
  ): Promise<void> {
    const rows =
      await this.prisma.$queryRaw<
        ExistingMediaVariant[]
      >`
        SELECT
          id,
          source_slot,
          variant_type,
          original_url,
          variant_url,
          storage_object_key
        FROM media_variants
        WHERE owner_type = ${ownerType}
          AND owner_id = ${ownerId}
      `;

    const generatedUrls =
      new Set(
        rows
          .filter(
            row =>
              row.variant_type !==
                'ORIGINAL' &&
              row.storage_object_key,
          )
          .map(
            row =>
              row.variant_url,
          )
          .filter(Boolean),
      );

    const originalUrls =
      new Set(
        rows
          .filter(
            row =>
              row.variant_type ===
              'ORIGINAL',
          )
          .map(
            row =>
              row.original_url,
          )
          .filter(Boolean),
      );

    await this.prisma.$executeRaw`
      DELETE FROM media_variants
      WHERE owner_type = ${ownerType}
        AND owner_id = ${ownerId}
    `;

    for (
      const generatedUrl
      of generatedUrls
    ) {
      await this.storageService
        .removeObjectFromUrl(
          generatedUrl,
        );
    }

    for (
      const originalUrl
      of originalUrls
    ) {
      await this.removeOriginalIfUnused(
        originalUrl,
      );
    }
  }

  private async removeOriginalIfUnused(
    url: string,
  ): Promise<void> {
    const rows =
      await this.prisma.$queryRaw<
        Array<{
          total: bigint;
        }>
      >`
        SELECT (
          (
            SELECT COUNT(*)
            FROM products
            WHERE url_image1 = ${url}
              OR url_image2 = ${url}
              OR url_image3 = ${url}
              OR url_image4 = ${url}
              OR url_image5 = ${url}
          )
          +
          (
            SELECT COUNT(*)
            FROM homepage_brochures
            WHERE image_url = ${url}
              OR mobile_image_url = ${url}
          )
        )::bigint AS total
      `;

    const totalReferences =
      Number(
        rows[0]?.total ??
          0,
      );

    if (totalReferences > 0) {
      return;
    }

    await this.storageService
      .removeObjectFromUrl(url);
  }

  private getVariantTypesForSlot(
    sourceSlot: MediaSourceSlot,
  ): readonly string[] {
    if (
      sourceSlot.startsWith(
        'PRODUCT_IMAGE_',
      )
    ) {
      return PRODUCT_VARIANTS;
    }

    if (
      sourceSlot ===
      'BROCHURE_DESKTOP'
    ) {
      return BROCHURE_DESKTOP_VARIANTS;
    }

    return BROCHURE_MOBILE_VARIANTS;
  }

  private normalizeUrl(
    value:
      | string
      | null
      | undefined,
  ): string | null {
    const normalized =
      String(value || '').trim();

    return normalized || null;
  }
}