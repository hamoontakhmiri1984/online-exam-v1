import { createReadStream } from 'fs';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

// یه کلاینت مشترک برای کل سرور - چه MinIO محلی (docker-compose) باشه چه
// یه S3-compatible ابری (Liara/ArvanCloud/AWS واقعی)، فقط envهای S3_* عوض
// می‌شن، این فایل و مصرف‌کننده‌هاش (videoUpload/attachmentUpload/routes)
// دست‌نخورده می‌مونن.
const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

// یه فایل رو تو bucket آپلود می‌کنه و همون object key (نه URL) رو برمی‌گردونه
// تا تو دیتابیس ذخیره بشه. عمداً هیچ‌جا public URL نمی‌سازیم/برنمی‌گردونیم -
// دسترسی همیشه فقط از طریق getSignedDownloadUrl و بعد از چک اجازه‌ست.
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

// مثل uploadObject ولی فایل رو از دیسک stream می‌کنه (بدون بافر کردن کل فایل
// تو RAM) - برای ویدیوهای حجیم. ContentLength باید مشخص باشه، چون S3 برای
// PutObject با stream طول رو از قبل لازم داره.
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

// لینک موقت (پیش‌فرض ۵ دقیقه، از SIGNED_URL_EXPIRES_IN) برای دیدن/دانلود -
// باید هر بار که واقعاً لازمه (پخش ویدیو، کلیک دانلود) تازه گرفته بشه، نه
// یه‌بار گرفته و ذخیره بشه، چون بعد از انقضا دیگه کار نمی‌کنه
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = env.SIGNED_URL_EXPIRES_IN
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// برای وقتی یه جلسه/پیوست حذف می‌شه - فایل یتیم رو تو bucket ولش نکنیم.
// فعلاً هیچ route‌ای صداش نمی‌زنه (حذف جلسه/پیوست فعلاً فقط ردیف دیتابیس رو
// پاک می‌کنه، همون رفتار قبلی)؛ برای تمیزکاری کامل بعداً از routes مربوطه
// صدا زده بشه.
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

// ---------------------------------------------------------------------------
// دارایی‌های عمومی (تصویر کاور بلاگ، تصویرهای بخش‌های صفحه‌ی فرود)
// ---------------------------------------------------------------------------
// برخلاف uploadObject بالا (که عمداً هیچ‌وقت URL عمومی نمی‌سازه، چون ویدیو/
// جزوه فقط با signed URL و بعد از چک دسترسی قابل‌دیدنن)، این‌ها از اول قرار
// بوده بدون لاگین قابل‌دیدن باشن (صفحه‌ی فرود و بلاگ عمومی‌ان) - برای همین یه
// URL کامل و پایدار برمی‌گردونن، نه یه key که بعداً signed بشه.
//
// همه‌ی این آبجکت‌ها زیر پیشوند "public/" تو همون S3_BUCKET ذخیره می‌شن (نه
// یه bucket جدا) تا نیازی به یه کلاینت/کانفیگ S3 دوم نباشه؛ ولی خودِ
// S3_PUBLIC_BASE_URL باید به یه bucket/مسیر با دسترسیِ خواندنِ عمومی (بر
// اساس bucket policy، نه ACL - چون MinIO و بیشتر S3-compatible های ابری
// ACL رو یا اصلاً پشتیبانی نمی‌کنن یا پیش‌فرض غیرفعالش می‌کنن) اشاره کنه؛
// این تنظیم یه‌بار سمت زیرساخت لازمه، نه چیزی که این فایل خودش انجام بده.
// امضاش عمداً مثل uploadObject ـه (کلید رو caller تعیین می‌کنه، خروجی void
// ـه) تا تو دیتابیس همیشه فقط یه key خام ذخیره بشه، نه یه URL کامل - همون‌طور
// که uploadObject/getSignedDownloadUrl این جدایی رو دارن. URL کامل موقع
// serialize کردن پاسخ با getPublicObjectUrl ساخته می‌شه.
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
