"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoUpload = exports.VIDEO_TMP_DIR = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("./errors");
// ویدیو تا ۵۰۰ مگابایته؛ بافر کردنش تو RAM (memoryStorage) یعنی چندتا آپلود
// همزمان می‌تونن حافظه‌ی سرور رو پر کنن. پس فایل موقتاً تو یه پوشه‌ی tmp
// روی دیسک نوشته می‌شه، routes/uploads.ts با stream به MinIO/S3 می‌فرستتش و
// همون‌جا فایل موقت رو پاک می‌کنه. اسم فایل موقت کاملاً رندومه (نه اسم/پسوند
// کاربر) تا path traversal یا برخورد اسمی ممکن نباشه.
exports.VIDEO_TMP_DIR = path_1.default.join(os_1.default.tmpdir(), 'lms-video-uploads');
fs_1.default.mkdirSync(exports.VIDEO_TMP_DIR, { recursive: true });
const ALLOWED_MIME_TYPES = new Set([
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-matroska',
]);
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
exports.videoUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, exports.VIDEO_TMP_DIR),
        filename: (_req, _file, cb) => cb(null, `${crypto_1.default.randomUUID()}.tmp`),
    }),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb((0, errors_1.badRequest)('فرمت فایل مجاز نیست؛ فقط ویدیو (mp4, webm, ogg, mov, mkv)'));
            return;
        }
        cb(null, true);
    },
});
