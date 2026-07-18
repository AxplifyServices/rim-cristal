import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

type SupportedImage = {
  extension: 'jpg' | 'png' | 'webp' | 'gif' | 'avif';
  contentType:
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'image/gif'
    | 'image/avif';
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint =
      this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';

    const port = Number(
      this.configService.get<string>('MINIO_PORT') || 9000,
    );

    const useSSL =
      String(
        this.configService.get<string>('MINIO_USE_SSL') || 'false',
      ).toLowerCase() === 'true';

    const accessKey =
      this.configService.get<string>('MINIO_ACCESS_KEY');

    const secretKey =
      this.configService.get<string>('MINIO_SECRET_KEY');

    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET') ||
      'casaluxurydecor-media';

    this.publicUrl = (
      this.configService.get<string>('MINIO_PUBLIC_URL') ||
      'http://localhost:9000/casaluxurydecor-media'
    ).replace(/\/+$/, '');

    if (!accessKey || !secretKey) {
      throw new Error(
        'MINIO_ACCESS_KEY et MINIO_SECRET_KEY doivent être définis.',
      );
    }

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);

      if (!exists) {
        throw new Error(
          `Le bucket MinIO "${this.bucketName}" n’existe pas.`,
        );
      }

      this.logger.log(
        `Connexion MinIO établie sur le bucket "${this.bucketName}".`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Connexion MinIO impossible : ${message}`);

      throw error;
    }
  }

  async uploadProductImage(file: Express.Multer.File): Promise<{
    objectKey: string;
    url: string;
    contentType: string;
    size: number;
  }> {
    if (!file) {
      throw new BadRequestException('Aucun fichier image reçu.');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Le fichier image est vide.');
    }

    const detectedImage = this.detectImageType(file.buffer);

    if (!detectedImage) {
      throw new BadRequestException(
        'Format non autorisé. Formats acceptés : JPG, PNG, WEBP, GIF et AVIF.',
      );
    }

    const now = new Date();

    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    const objectKey = [
      'products',
      year,
      month,
      `${randomUUID()}.${detectedImage.extension}`,
    ].join('/');

    try {
      await this.client.putObject(
        this.bucketName,
        objectKey,
        file.buffer,
        file.buffer.length,
        {
          'Content-Type': detectedImage.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Amz-Meta-Original-Name': this.sanitizeMetadataValue(
            file.originalname,
          ),
        },
      );

      return {
        objectKey,
        url: `${this.publicUrl}/${objectKey}`,
        contentType: detectedImage.contentType,
        size: file.buffer.length,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Échec de l’upload MinIO pour ${objectKey} : ${message}`,
      );

      throw new InternalServerErrorException(
        'Impossible de stocker l’image.',
      );
    }
  }

async uploadHomepageBrochureImage(
  file: Express.Multer.File,
): Promise<{
  objectKey: string;
  url: string;
  contentType: string;
  size: number;
}> {
  if (!file) {
    throw new BadRequestException(
      'Aucun fichier image reçu.',
    );
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestException(
      'Le fichier image est vide.',
    );
  }

  if (file.buffer.length > 10 * 1024 * 1024) {
    throw new BadRequestException(
      'L’image ne doit pas dépasser 10 Mo.',
    );
  }

  const detectedImage = this.detectImageType(
    file.buffer,
  );

  if (!detectedImage) {
    throw new BadRequestException(
      'Format non autorisé. Formats acceptés : JPG, PNG, WEBP et AVIF.',
    );
  }

  /**
   * Les GIF restent acceptés pour les produits existants,
   * mais ils sont volontairement refusés pour les brochures.
   */
  if (detectedImage.extension === 'gif') {
    throw new BadRequestException(
      'Les images GIF ne sont pas autorisées pour les brochures.',
    );
  }

  const now = new Date();

  const year = String(
    now.getUTCFullYear(),
  );

  const month = String(
    now.getUTCMonth() + 1,
  ).padStart(2, '0');

  const objectKey = [
    'homepage',
    'brochures',
    year,
    month,
    `${randomUUID()}.${detectedImage.extension}`,
  ].join('/');

  try {
    await this.client.putObject(
      this.bucketName,
      objectKey,
      file.buffer,
      file.buffer.length,
      {
        'Content-Type':
          detectedImage.contentType,

        'Cache-Control':
          'public, max-age=31536000, immutable',

        'X-Amz-Meta-Original-Name':
          this.sanitizeMetadataValue(
            file.originalname,
          ),
      },
    );

    return {
      objectKey,
      url: `${this.publicUrl}/${objectKey}`,
      contentType:
        detectedImage.contentType,
      size: file.buffer.length,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    this.logger.error(
      `Échec de l’upload MinIO pour ${objectKey} : ${message}`,
    );

    throw new InternalServerErrorException(
      'Impossible de stocker l’image de la brochure.',
    );
  }
}

  async removeObjectFromUrl(url: string | null | undefined): Promise<void> {
    const objectKey = this.extractObjectKey(url);

    if (!objectKey) {
      return;
    }

    try {
      await this.client.removeObject(this.bucketName, objectKey);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Impossible de supprimer l’objet MinIO "${objectKey}" : ${message}`,
      );
    }
  }

  extractObjectKey(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }

    const normalizedUrl = String(url).trim();

    if (!normalizedUrl) {
      return null;
    }

    const publicPrefix = `${this.publicUrl}/`;

    if (normalizedUrl.startsWith(publicPrefix)) {
      return normalizedUrl.slice(publicPrefix.length);
    }

    const relativePrefix = `/media/`;

    if (normalizedUrl.startsWith(relativePrefix)) {
      return normalizedUrl.slice(relativePrefix.length);
    }

    const bucketPrefix = `/${this.bucketName}/`;

    try {
      const parsedUrl = new URL(normalizedUrl);

      if (parsedUrl.pathname.startsWith(bucketPrefix)) {
        return parsedUrl.pathname.slice(bucketPrefix.length);
      }
    } catch {
      return null;
    }

    return null;
  }

  private detectImageType(buffer: Buffer): SupportedImage | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return {
        extension: 'jpg',
        contentType: 'image/jpeg',
      };
    }

    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return {
        extension: 'png',
        contentType: 'image/png',
      };
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return {
        extension: 'webp',
        contentType: 'image/webp',
      };
    }

    if (
      buffer.length >= 6 &&
      ['GIF87a', 'GIF89a'].includes(
        buffer.toString('ascii', 0, 6),
      )
    ) {
      return {
        extension: 'gif',
        contentType: 'image/gif',
      };
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 4, 8) === 'ftyp'
    ) {
      const brand = buffer.toString('ascii', 8, 12);

      if (['avif', 'avis'].includes(brand)) {
        return {
          extension: 'avif',
          contentType: 'image/avif',
        };
      }
    }

    return null;
  }

  private sanitizeMetadataValue(value: string): string {
    return String(value || '')
      .replace(/[^\x20-\x7E]/g, '')
      .slice(0, 200);
  }
}