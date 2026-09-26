"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachmentUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("./errors");
// جزوه/PDF هم مثل ویدیو دیگه رو دیسک سرور نمی‌ره - همینجا فقط بافر می‌شه،
// آپلود واقعی به bucket تو routes/uploads.ts انجام می‌شه (storage.ts)
const ALLOWED_MIME_TYPES = new Set(['application/pdf']);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB - برای جزوه/تمرین کافیه
exports.attachmentUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb((0, errors_1.badRequest)('فرمت فایل مجاز نیست؛ فقط PDF'));
            return;
        }
        cb(null, true);
    },
});
