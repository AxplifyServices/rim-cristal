import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

import {
  MediaProcessingResult,
  MediaVariantType,
  PendingMediaVariant,
  VariantPreset,
} from './media-processing.types';

const MAX_BATCH_SIZE = 25;
const DEFAULT_BATCH_SIZE = 10;

const VARIANT_PRESETS: Partial<
  Record<
    MediaVariantType,
    VariantPreset
  >
> = {
  THUMBNAIL: {
    width: 320,
    quality: 72,
  },

  CARD: {
    width: 640,
    quality: 78,
  },

  MOBILE: {
    width: 768,
    quality: 82,
  },

  TABLET: {
    width: 1280,
    quality: 84,
  },

  DETAIL: {
    width: 1200,
    quality: 84,
  },

  DESKTOP: {
    width: 1920,
    quality: 86,
  },


};

@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(
    MediaProcessingService.name,
  );

private getVariantPreset(
  variant: PendingMediaVariant,
): VariantPreset {
  if (
    variant.variant_type ===
    'LARGE'
  ) {
    if (
      variant.owner_type ===
        'HOMEPAGE_BROCHURE' &&
      variant.source_slot ===
        'BROCHURE_DESKTOP'
    ) {
      return {
        width: 2560,
        quality: 88,
      };
    }

    return {
      width: 1920,
      quality: 88,
    };
  }

  const preset =
    VARIANT_PRESETS[
      variant.variant_type
    ];

  if (!preset) {
    throw new BadRequestException(
      `Type de variante non géré : ${variant.variant_type}`,
    );
  }

  return preset;
}  

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getStatus() {
    const rows = await this.prisma.$queryRaw<
      Array<{
        processing_status: string;
        total: bigint;
      }>
    >`
      SELECT
        processing_status,
        COUNT(*)::bigint AS total
      FROM media_variants
      WHERE variant_type <> 'ORIGINAL'
      GROUP BY processing_status
      ORDER BY processing_status
    `;

    const totals = {
      PENDING: 0,
      PROCESSING: 0,
      READY: 0,
      FAILED: 0,
    };

    for (const row of rows) {
      if (
        row.processing_status in totals
      ) {
        totals[
          row.processing_status as keyof typeof totals
        ] = Number(row.total);
      }
    }

    return {
      ...totals,
      total:
        totals.PENDING +
        totals.PROCESSING +
        totals.READY +
        totals.FAILED,
    };
  }

  async processPending(
    requestedLimit?: number,
  ): Promise<MediaProcessingResult> {
    const limit = this.normalizeLimit(
      requestedLimit,
    );

    const result: MediaProcessingResult = {
      requested: limit,
      processed: 0,
      succeeded: 0,
      failed: 0,
      results: [],
    };

    for (
      let index = 0;
      index < limit;
      index += 1
    ) {
      const variant =
        await this.claimNextPendingVariant();

      if (!variant) {
        break;
      }

      result.processed += 1;

      try {
        const generated =
          await this.processVariant(
            variant,
          );

        result.succeeded += 1;

        result.results.push({
          id: variant.id,
          status: 'READY',
          variantType:
            variant.variant_type,
          url: generated.url,
        });
      } catch (error) {
        const message =
          this.getErrorMessage(error);

        result.failed += 1;

        result.results.push({
          id: variant.id,
          status: 'FAILED',
          variantType:
            variant.variant_type,
          error: message,
        });

        await this.markAsFailed(
          variant.id,
          message,
        );
      }
    }

    return result;
  }

  async retryFailed(): Promise<{
    reset: number;
  }> {
    const result =
      await this.prisma.$executeRaw`
        UPDATE media_variants
        SET
          processing_status = 'PENDING',
          processing_error = NULL,
          updated_at = NOW()
        WHERE processing_status = 'FAILED'
          AND variant_type <> 'ORIGINAL'
      `;

    return {
      reset: result,
    };
  }

  async resetStuckProcessing(): Promise<{
    reset: number;
  }> {
    const result =
      await this.prisma.$executeRaw`
        UPDATE media_variants
        SET
          processing_status = 'PENDING',
          processing_error =
            'Traitement précédent interrompu.',
          updated_at = NOW()
        WHERE processing_status = 'PROCESSING'
          AND updated_at < NOW() - INTERVAL '30 minutes'
          AND variant_type <> 'ORIGINAL'
      `;

    return {
      reset: result,
    };
  }

  private async claimNextPendingVariant():
    Promise<PendingMediaVariant | null> {
    const rows = await this.prisma.$queryRaw<
      PendingMediaVariant[]
    >`
      WITH candidate AS (
        SELECT id
        FROM media_variants
        WHERE processing_status = 'PENDING'
          AND variant_type <> 'ORIGINAL'
        ORDER BY
          created_at ASC,
          id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE media_variants AS mv
      SET
        processing_status = 'PROCESSING',
        processing_error = NULL,
        updated_at = NOW()
      FROM candidate
      WHERE mv.id = candidate.id
      RETURNING
        mv.id,
        mv.owner_type,
        mv.owner_id,
        mv.source_slot,
        mv.variant_type,
        mv.original_url
    `;

    return rows[0] || null;
  }

  private async processVariant(
    variant: PendingMediaVariant,
  ): Promise<{
    url: string;
    objectKey: string;
  }> {
const preset =
  this.getVariantPreset(
    variant,
  );

    const sourceBuffer =
      await this.storageService.readObjectFromUrl(
        variant.original_url,
      );

    const image = sharp(sourceBuffer, {
      failOn: 'error',
      animated: false,
      limitInputPixels:
        100_000_000,
    }).rotate();

    const sourceMetadata =
      await image.metadata();

    if (
      !sourceMetadata.width ||
      !sourceMetadata.height
    ) {
      throw new Error(
        'Les dimensions de l’image source sont introuvables.',
      );
    }

    const outputBuffer = await image
      .resize({
        width: preset.width,
        fit: 'inside',
        withoutEnlargement: true,
        fastShrinkOnLoad: true,
      })
      .webp({
        quality: preset.quality,
        effort: 5,
        smartSubsample: true,
        alphaQuality: 90,
      })
      .toBuffer();

    const outputMetadata =
      await sharp(
        outputBuffer,
      ).metadata();

    if (
      !outputMetadata.width ||
      !outputMetadata.height
    ) {
      throw new Error(
        'Les dimensions de la variante générée sont introuvables.',
      );
    }

    const objectKey =
      this.buildVariantObjectKey(
        variant,
      );

    const stored =
      await this.storageService.uploadGeneratedImage(
        {
          buffer: outputBuffer,
          objectKey,
          contentType:
            'image/webp',
        },
      );

    await this.prisma.$executeRaw`
      UPDATE media_variants
      SET
        variant_url = ${stored.url},
        storage_object_key = ${stored.objectKey},
        width = ${outputMetadata.width},
        height = ${outputMetadata.height},
        file_size_bytes = ${stored.size},
        mime_type = ${stored.contentType},
        processing_status = 'READY',
        processing_error = NULL,
        updated_at = NOW()
      WHERE id = ${variant.id}
    `;

    this.logger.log(
      [
        `Variante ${variant.id}`,
        variant.variant_type,
        `${outputMetadata.width}x${outputMetadata.height}`,
        `${stored.size} octets`,
      ].join(' — '),
    );

    return {
      url: stored.url,
      objectKey:
        stored.objectKey,
    };
  }

  private buildVariantObjectKey(
    variant: PendingMediaVariant,
  ): string {
    const ownerDirectory =
      variant.owner_type ===
      'PRODUCT'
        ? 'products'
        : 'homepage/brochures';

    const slot =
      variant.source_slot
        .toLowerCase()
        .replace(/_/g, '-');

    const variantName =
      variant.variant_type.toLowerCase();

    return [
      ownerDirectory,
      'variants',
      String(variant.owner_id),
      slot,
      `${variantName}-${randomUUID()}.webp`,
    ].join('/');
  }

  private async markAsFailed(
    id: number,
    message: string,
  ): Promise<void> {
    const safeMessage =
      message.slice(0, 4000);

    await this.prisma.$executeRaw`
      UPDATE media_variants
      SET
        processing_status = 'FAILED',
        processing_error = ${safeMessage},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    this.logger.error(
      `Échec du traitement de la variante ${id} : ${safeMessage}`,
    );
  }

  private normalizeLimit(
    requestedLimit?: number,
  ): number {
    const parsed = Number(
      requestedLimit ??
        DEFAULT_BATCH_SIZE,
    );

    if (
      !Number.isFinite(parsed)
    ) {
      return DEFAULT_BATCH_SIZE;
    }

    return Math.max(
      1,
      Math.min(
        MAX_BATCH_SIZE,
        Math.trunc(parsed),
      ),
    );
  }

  private getErrorMessage(
    error: unknown,
  ): string {
    if (
      error instanceof Error
    ) {
      return error.message;
    }

    return String(error);
  }
}