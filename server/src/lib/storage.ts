import { createReadStream } from 'fs';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

// Persist private object keys; authorize access before issuing signed URLs.
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

// Stream large uploads and supply ContentLength; do not buffer the entire file.
export async function uploadObjectFromFile(
  key: string,
  filePath: string,
  sizeBytes: number,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: sizeBytes,
      ContentType: contentType,
    })
  );
}

// Signed URLs expire and must be fetched when the file is opened.
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = env.SIGNED_URL_EXPIRES_IN
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

// Blog/CMS assets are public; lesson uploads remain private.
export async function uploadPublicObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (!env.S3_PUBLIC_BASE_URL) {
    throw new Error(
      'S3_PUBLIC_BASE_URL تنظیم نشده - قبل از آپلود تصویر بلاگ/CMS باید یه bucket/CDN عمومی کانفیگ بشه'
    );
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: `public/${key}`,
      Body: body,
      ContentType: contentType,
    })
  );
}

export function getPublicObjectUrl(key: string): string {
  return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/public/${key}`;
}

export async function deletePublicObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: `public/${key}` })
  );
}
