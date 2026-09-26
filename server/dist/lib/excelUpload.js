"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("./errors");
// همون الگوی videoUpload.ts/attachmentUpload.ts: فایل فقط تو حافظه بافر
// می‌شه (دیسک سرور درگیر نمی‌شه)، پردازش واقعی (خوندن ردیف‌ها) تو
// lib/questionExcel.ts انجام می‌شه
const ALLOWED_MIME_TYPES = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB - برای چند صد سوال کافیه
exports.excelUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb((0, errors_1.badRequest)('فرمت فایل مجاز نیست؛ فقط اکسل (xlsx/xls) یا CSV'));
            return;
        }
        cb(null, true);
    },
});
