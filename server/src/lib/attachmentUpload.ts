import multer from 'multer';
import { badRequest } from './errors';

// جزوه/PDF هم مثل ویدیو دیگه رو دیسک سرور نمی‌ره - همینجا فقط بافر می‌شه،
// آپلود واقعی به bucket تو routes/uploads.ts انجام می‌شه (storage.ts)
const ALLOWED_MIME_TYPES = new Set(['application/pdf']);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB - برای جزوه/تمرین کافیه

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(badRequest('فرمت فایل مجاز نیست؛ فقط PDF'));
      return;
    }
    cb(null, true);
  },
});
