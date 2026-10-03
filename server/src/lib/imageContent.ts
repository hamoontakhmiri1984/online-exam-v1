import sharp from 'sharp';
import { AppError, badRequest } from './errors';

const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_CONCURRENT_DECODES = 2;
const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
};
let activeDecodes = 0;

// Signatures and metadata alone do not prove that the pixel data is readable.
// Decode every frame with bounded pixel count, native processing time and
// concurrency. Keep the original bytes: validation does not recompress images.
export async function validateImageContent(buffer: Buffer): Promise<string> {
  if (activeDecodes >= MAX_CONCURRENT_DECODES) {
    throw new AppError(503, 'پردازش تصویر موقتاً شلوغ است؛ دوباره تلاش کنید');
  }
  activeDecodes++;
  try {
    const image = sharp(buffer, {
      failOn: 'warning', limitInputPixels: MAX_IMAGE_PIXELS, animated: true,
    });
    const metadata = await image.metadata();
    const mime = MIME_BY_FORMAT[metadata.format ?? ''];
    if (!mime || !metadata.width || !metadata.height ||
        metadata.width * metadata.height > MAX_IMAGE_PIXELS ||
        (metadata.channels ?? 0) > 4) {
      throw badRequest('تصویر نامعتبر است یا تعداد پیکسل‌های آن بیش از حد مجاز است');
    }
    await image.timeout({ seconds: 5 }).raw().toBuffer();
    return mime;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw badRequest('محتوای تصویر خراب، ناقص یا بیش از حد مجاز است');
  } finally {
    activeDecodes--;
  }
}
