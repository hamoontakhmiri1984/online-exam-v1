import multer from 'multer';
import { badRequest } from './errors';

// برای تصویر کاور بلاگ / تصویرهای بخش‌های صفحه‌ی فرود. مثل attachmentUpload.ts
// فقط تو RAM بافر می‌شه؛ آپلود واقعی به bucket تو routes/blog.ts و
// routes/cms.ts (با storage.ts -> uploadPublicObject) انجام می‌شه.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB - برای تصویر کاور/بنر کافیه

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
