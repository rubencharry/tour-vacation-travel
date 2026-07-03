import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly s3: S3Client | null;
  private readonly bucket: string | null;
  private readonly region: string;

  constructor(config: ConfigService) {
    this.region = config.get('AWS_REGION') ?? 'sa-east-1';
    const bucket = config.get<string>('MEDIA_BUCKET_NAME');

    if (bucket) {
      this.bucket = bucket;
      // En Lambda, S3Client toma las credenciales del IAM role automáticamente
      this.s3 = new S3Client({ region: this.region });
      this.logger.log(`FileService → S3 ${bucket} (${this.region})`);
    } else {
      this.bucket = null;
      this.s3 = null;
      this.logger.warn(
        'FileService → MEDIA_BUCKET_NAME no configurado, guardando en disco local (solo dev)',
      );
    }
  }

  async saveBase64(
    base64: string,
    extension: string,
    folder: string,
  ): Promise<{ key: string; publicUrl: string }> {
    if (!base64) throw new BadRequestException('base64 vacío');

    const buffer = Buffer.from(base64, 'base64');
    const key = `${folder}/${crypto.randomBytes(16).toString('hex')}.${extension}`;

    if (this.s3 && this.bucket) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: this.mimeFromExtension(extension),
        }),
      );
      const publicUrl = await this.presignKey(key);
      return { key, publicUrl };
    }

    return this.saveLocally(buffer, key);
  }

  async presignKey(key: string, expirySeconds = 3600): Promise<string> {
    if (!this.s3 || !this.bucket) {
      const port = process.env['PORT'] ?? 3000;
      return `http://localhost:${port}/uploads/${key.split('/').pop()}`;
    }
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expirySeconds },
    );
  }

  async presignImageUrls(urls: string[]): Promise<string[]> {
    return Promise.all(
      (urls ?? []).map((url) => {
        if (!url) return Promise.resolve(url);
        if (
          url.startsWith('http') &&
          !(this.bucket && url.includes(this.bucket))
        ) {
          return Promise.resolve(url); // URL externa: pasa tal cual
        }
        return this.presignKey(this.extractS3Key(url));
      }),
    );
  }

  extractS3Key(url: string): string {
    if (!url || !url.startsWith('http')) return url;
    if (this.bucket && url.includes(this.bucket)) {
      return url.split('.amazonaws.com/')[1]?.split('?')[0] ?? url;
    }
    return url;
  }

  async deleteObject(keyOrUrl: string): Promise<void> {
    if (!this.s3 || !this.bucket) return;
    const key = this.extractS3Key(keyOrUrl);
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      this.logger.warn(`No se pudo eliminar el objeto: ${key}`);
    }
  }

  private saveLocally(
    buffer: Buffer,
    key: string,
  ): { key: string; publicUrl: string } {
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const localName = key.replace(/\//g, '_');
    writeFileSync(join(uploadsDir, localName), buffer);
    const port = process.env['PORT'] ?? 3000;
    return {
      key,
      publicUrl: `http://localhost:${port}/uploads/${localName}`,
    };
  }

  private mimeFromExtension(ext: string): string {
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    return map[ext.toLowerCase()] ?? 'application/octet-stream';
  }
}
