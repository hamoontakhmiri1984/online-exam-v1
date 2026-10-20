import multer from 'multer';
import { badRequest } from './errors';

const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(badRequest('فرمت فایل مجاز نیست؛ فقط اکسل (xlsx/xls) یا CSV'));
      return;
    }
    cb(null, true);
  },
});
