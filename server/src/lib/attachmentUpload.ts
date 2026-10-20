import multer from 'multer';
import { badRequest } from './errors';

const ALLOWED_MIME_TYPES = new Set(['application/pdf']);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

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
