import multer from 'multer';
import { badRequest } from './errors';

// همون الگوی videoUpload.ts/attachmentUpload.ts: فایل فقط تو حافظه بافر
// می‌شه (دیسک سرور درگیر نمی‌شه)، پردازش واقعی (خوندن ردیف‌ها) تو
// lib/questionExcel.ts انجام می‌شه
const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB - برای چند صد سوال کافیه

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
