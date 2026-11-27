/**
 * @file storage.service.ts
 * @description S3-compatible Object Storage service singleton (MinIO/AWS S3) for secure presigned uploads and downloads.
 * @module @atlas/services/storage
 * @see {@link docs/superpowers/plans/2026-11-27-minio-s3-integration-plan.md}
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

export class StorageService {
  private static instance: StorageService | null = null;
  private s3: S3Client;
  private bucket: string;

  private constructor(config?: Partial<StorageConfig>) {
    const endpoint =
      config?.endpoint || process.env.S3_ENDPOINT || "http://127.0.0.1:9000";
    const region = config?.region || process.env.S3_REGION || "us-east-1";
    const accessKeyId =
      config?.accessKeyId || process.env.S3_ACCESS_KEY || "minioadmin";
    const secretAccessKey =
      config?.secretAccessKey || process.env.S3_SECRET_KEY || "minioadmin";
    this.bucket = config?.bucket || process.env.S3_BUCKET || "atlas-documents";
    const forcePathStyle =
      config?.forcePathStyle ?? process.env.S3_FORCE_PATH_STYLE !== "false";

    this.s3 = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
    });
  }

  public static getInstance(config?: Partial<StorageConfig>): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(config);
    }
    return StorageService.instance;
  }

  public static resetInstance(): void {
    StorageService.instance = null;
  }

  public getBucketName(): string {
    return this.bucket;
  }

  public getS3Client(): S3Client {
    return this.s3;
  }

  /**
   * Generates a temporary Presigned PUT URL for direct-to-storage client uploads.
   * @param key - Destination object key path in bucket
   * @param contentType - Expected MIME type
   * @param expiresIn - Expiration in seconds (defaults to 900s / 15 minutes)
   */
  public async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Generates a temporary Presigned GET URL for secure binary downloads.
   * @param key - Object key in bucket
   * @param expiresIn - Expiration in seconds (defaults to 900s / 15 minutes)
   */
  public async getPresignedDownloadUrl(
    key: string,
    expiresIn = 900,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Verifies an object exists in the bucket and retrieves metadata.
   * @param key - Object key in bucket
   */
  public async headObject(key: string): Promise<HeadObjectCommandOutput> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return this.s3.send(command);
  }

  /**
   * Deletes an object from the storage bucket.
   * @param key - Object key to delete
   */
  public async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
  }

  /**
   * Health check verifying connectivity to the S3 bucket.
   */
  public async isHealthy(): Promise<boolean> {
    try {
      // Simple head bucket / check connectivity
      await this.headObject("health-check-probe");
      return true;
    } catch (err: unknown) {
      // 404 NotFound means bucket reachable and endpoint operational
      if (
        err &&
        typeof err === "object" &&
        ("name" in err || "$metadata" in err)
      ) {
        const errorName = (err as { name?: string }).name;
        const statusCode = (err as { $metadata?: { httpStatusCode?: number } })
          .$metadata?.httpStatusCode;

        if (errorName === "NotFound" || statusCode === 404) {
          return true;
        }
      }
      return false;
    }
  }
}

export const storageService = StorageService.getInstance();
