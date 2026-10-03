import fs from 'fs';
import type { NextFunction, Request, Response } from 'express';
import { badRequest } from './errors';
import { validateImageContent } from './imageContent';
import { validatePdfContent } from './pdfContent';
import {
  HEADER_BYTES,
  detectImage,
  detectPdf,
  detectSpreadsheet,
  detectVideo,
  type UploadKind,
} from './fileSignature';

// فایل آپلودشده‌ی multer (حافظه‌ای یا دیسکی)، فقط فیلدهای موردنیاز
export type UploadedFileLike = {
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
};

const INVALID_CONTENT_MESSAGE: Record<Exclude<UploadKind, 'spreadsheet'>, string> = {
  image: 'محتوای فایل یک تصویر معتبر (JPEG/PNG/WEBP) نیست',
  pdf: 'محتوای فایل یک PDF معتبر نیست',
  video: 'محتوای فایل یک ویدیوی معتبر (mp4, webm, ogg, mov, mkv) نیست',
};

// فقط ابتدای فایل خونده می‌شه: ویدیوی ۵۰۰ مگابایتی روی دیسکه و برای تشخیص
// نوع هرگز کامل وارد RAM نمی‌شه
async function readHeader(file: UploadedFileLike): Promise<Buffer> {
  if (file.buffer) return file.buffer.subarray(0, HEADER_BYTES);
  if (!file.path) throw badRequest('فایل آپلودشده قابل‌خواندن نیست');
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const header = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(header, 0, HEADER_BYTES, 0);
    return header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

// MIME واقعی فایل (از روی محتوا) یا throw با خطای 400 مشخص
export async function detectUploadedMime(
  kind: UploadKind,
  file: UploadedFileLike
): Promise<string> {
  if (file.size === 0) throw badRequest('فایل خالیه');

  if (kind === 'spreadsheet') {
    // اکسل/CSV فقط تو حافظه بافر می‌شه (سقف ۱۰ مگابایت)
    if (!file.buffer) throw badRequest('فایل آپلودشده قابل‌خواندن نیست');
    const result = detectSpreadsheet(file.buffer);
    if ('error' in result) throw badRequest(result.error);
    return result.mime;
  }

  const header = await readHeader(file);
  const detect = { image: detectImage, pdf: detectPdf, video: detectVideo }[kind];
  const mime = detect(header);
  if (!mime) throw badRequest(INVALID_CONTENT_MESSAGE[kind]);
  if (kind === 'image') {
    if (!file.buffer) throw badRequest('تصویر آپلودشده قابل‌خواندن نیست');
    return validateImageContent(file.buffer);
  }
  if (kind === 'pdf') {
    if (!file.buffer) throw badRequest('PDF آپلودشده قابل‌خواندن نیست');
    await validatePdfContent(file.buffer);
  }
  return mime;
}

async function removeTempFile(file: UploadedFileLike): Promise<void> {
  if (file.path) await fs.promises.unlink(file.path).catch(() => undefined);
}

// بعد از multer و قبل از ذخیره‌ی نهایی (آپلود به bucket/پارس) قرار می‌گیره.
//   موفق: req.file.mimetype با MIME «تشخیص‌داده‌شده از محتوا» جایگزین می‌شه
//         (همین مقدار به storage می‌ره و پسوند کلید هم از روی آن ساخته می‌شه)
//   ناموفق: فایل موقت دیسک (ویدیو) پاک می‌شه و خطای 400 مشخص برمی‌گرده
// فایل نبودن اینجا خطا نیست؛ هندلر خودش «فایلی ارسال نشده» رو گزارش می‌کنه.
export function validateUploadedFile(kind: UploadKind) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const file = req.file;
    if (!file) return next();
    try {
      file.mimetype = await detectUploadedMime(kind, file);
      next();
    } catch (err) {
      await removeTempFile(file);
      next(err);
    }
  };
}