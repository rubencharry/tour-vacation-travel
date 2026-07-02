import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly client: Minio.Client | null;
  private readonly bucket: string | null;
  private readonly region: string;
  // Only used for local disk fallback URL prefix
  private readonly localBaseUrl: string | null;

  constructor(private readonly config: ConfigService) {
    this.region = config.get('AWS_REGION') ?? 'sa-east-1';

    const mediaBucket = config.get<string>('MEDIA_BUCKET_NAME');
    const minioEndpoint = config.get<string>('MINIO_ENDPOINT');

    if (mediaBucket) {
      this.bucket = mediaBucket;
      this.client = new Minio.Client({
        endPoint: `s3.${this.region}.amazonaws.com`,
        useSSL: true,
        accessKey: process.env['AWS_ACCESS_KEY_ID'] ?? '',
        secretKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? '',
        sessionToken: process.env['AWS_SESSION_TOKEN'],
        region: this.region,
      });
      this.localBaseUrl = null;
      this.logger.log(`FileService → S3 bucket: ${mediaBucket} (${this.region})`);
    } else if (minioEndpoint) {
      const port = parseInt(config.get('MINIO_PORT') ?? '9000');
      const useSSL = config.get('MINIO_USE_SSL') === 'true';
      this.bucket = config.get<string>('MINIO_BUCKET') ?? 'tour-vacation';
      this.client = new Minio.Client({
        endPoint: minioEndpoint,
        port,
        useSSL,
        accessKey: config.get('MINIO_USER') ?? 'minioadmin',
        secretKey: config.get('MINIO_PASSWORD') ?? 'minioadmin',
        region: this.region,
      });
      this.localBaseUrl = null;
      this.logger.log(`FileService → MinIO: ${minioEndpoint}:${port} / bucket: ${this.bucket}`);
    } else {
      this.client = null;
      this.bucket = null;
      this.localBaseUrl = null;
      this.logger.warn('FileService → sin bucket configurado, imágenes en disco local.');
    }
  }

  async saveBase64(
    base64Data: string,
    extension: string,
    folder: string,
  ): Promise<{ name: string; publicUrl: string }> {
    if (!base64Data || !folder) throw new BadRequestException('Invalid input data');

    const buffer = Buffer.from(base64Data, 'base64');
    const key = `${folder}/${crypto.randomBytes(16).toString('hex')}.${extension}`;

    if (this.client && this.bucket) {
      return this.putObject(buffer, key, extension);
    }
    return this.saveLocally(buffer, key);
  }

  async saveAsset(
    base64Data: string,
    extension: string,
    name: string,
    folder: string,
  ): Promise<{ name: string; publicUrl: string }> {
    if (!base64Data || !folder) throw new BadRequestException('Invalid input data');

    const buffer = Buffer.from(base64Data, 'base64');
    const key = `${folder}/${name}.${extension}`;

    if (this.client && this.bucket) {
      return this.putObject(buffer, key, extension);
    }
    return this.saveLocally(buffer, key);
  }

  /**
   * Generates a presigned GET URL for an S3 key. Expires in expirySeconds (default 1h).
   * For local disk fallback, returns a localhost URL.
   */
  async presignKey(key: string, expirySeconds = 3600): Promise<string> {
    if (this.client && this.bucket) {
      return this.client.presignedGetObject(this.bucket, key, expirySeconds);
    }
    const port = process.env['PORT'] ?? 3000;
    return `http://localhost:${port}/uploads/${key.split('/').pop()}`;
  }

  /**
   * Extracts the S3 object key from a presigned or plain S3 URL for our bucket.
   * Returns the input unchanged for external URLs or if already a key.
   */
  extractS3Key(url: string): string {
    if (!url || !url.startsWith('http')) return url; // already a key
    if (this.bucket && url.includes(this.bucket)) {
      const afterBucket = url.split('.amazonaws.com/')[1];
      if (afterBucket) return afterBucket.split('?')[0];
    }
    return url; // external URL — keep as-is
  }

  /**
   * Converts stored imageUrls (keys or S3 URLs) to presigned GET URLs.
   * External URLs (not our bucket) are returned unchanged.
   */
  async presignImageUrls(urls: string[]): Promise<string[]> {
    return Promise.all(
      (urls ?? []).map(async (url) => {
        if (!url) return url;
        // External URL: not our S3 bucket
        if (url.startsWith('http') && !(this.bucket && url.includes(this.bucket))) {
          return url;
        }
        const key = this.extractS3Key(url);
        return this.presignKey(key);
      }),
    );
  }

  async deleteObject(objectKey: string): Promise<void> {
    if (!this.client || !this.bucket) return;
    const key = this.extractS3Key(objectKey);
    try {
      await this.client.removeObject(this.bucket, key);
    } catch {
      this.logger.warn(`Could not delete object: ${key}`);
    }
  }

  private async putObject(
    buffer: Buffer,
    key: string,
    extension: string,
  ): Promise<{ name: string; publicUrl: string }> {
    await this.client!.putObject(this.bucket!, key, buffer, buffer.length, {
      'Content-Type': this.mimeFromExtension(extension),
    });
    // Return a presigned URL valid for 1 hour so the frontend can preview immediately.
    // The key (name) is what must be stored in the database.
    const publicUrl = await this.client!.presignedGetObject(this.bucket!, key, 3600);
    return { name: key, publicUrl };
  }

  private saveLocally(buffer: Buffer, key: string): { name: string; publicUrl: string } {
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const localName = key.replace(/\//g, '_');
    writeFileSync(join(uploadsDir, localName), buffer);
    const port = process.env['PORT'] ?? 3000;
    return {
      name: key,
      publicUrl: `http://localhost:${port}/uploads/${localName}`,
    };
  }

  private mimeFromExtension(ext: string): string {
    const map: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
      gif: 'image/gif', svg: 'image/svg+xml',
    };
    return map[ext.toLowerCase()] ?? 'application/octet-stream';
  }
}
