"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("./errors");
// برای تصویر کاور بلاگ / تصویرهای بخش‌های صفحه‌ی فرود. مثل attachmentUpload.ts
// فقط تو RAM بافر می‌شه؛ آپلود واقعی به bucket تو routes/blog.ts و
// routes/cms.ts (با storage.ts -> uploadPublicObject) انجام می‌شه.
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB - برای تصویر کاور/بنر کافیه
exports.imageUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb((0, errors_1.badRequest)('فرمت تصویر مجاز نیست؛ فقط JPEG/PNG/WEBP'));
            return;
        }
        cb(null, true);
    },
});
