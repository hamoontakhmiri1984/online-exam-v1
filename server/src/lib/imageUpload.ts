import multer from 'multer';
import { badRequest } from './errors';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Derive extensions from validated content, not the client filename.
export function extensionForImageMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME_TYPE[mimeType] ?? 'jpg';
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(badRequest('فرمت تصویر مجاز نیست؛ فقط JPEG/PNG/WEBP'));
      return;
    }
    cb(null, true);
  },
});
