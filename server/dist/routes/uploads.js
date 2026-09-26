"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const promises_1 = require("fs/promises");
const requireAuth_1 = require("../middleware/requireAuth");
const videoUpload_1 = require("../lib/videoUpload");
const attachmentUpload_1 = require("../lib/attachmentUpload");
const storage_1 = require("../lib/storage");
const errors_1 = require("../lib/errors");
const objectKeys_1 = require("../lib/objectKeys");
const asyncHandler_1 = require("../lib/asyncHandler");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// multer (busboy) اسم فایل multipart رو به‌صورت latin1 می‌خونه؛ اسم فارسی
// («جزوه.pdf») به‌شکل رشته‌ی خراب (mojibake) تو دیتابیس ذخیره می‌شد. اگه اسم
// فقط کاراکترهای ≤ 0xFF داره و به‌عنوان UTF-8 معتبره، برش می‌گردونیم؛ اسمِ
// انگلیسی/ASCII دست‌نخورده می‌مونه.
function decodeUploadedFileName(name) {
    if (!/[\u0080-\u00ff]/.test(name) || /[^\u0000-\u00ff]/.test(name))
        return name;
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\ufffd') ? name : decoded;
}
// دیگه فایل رو دیسک سرور ذخیره نمی‌کنیم و یه URL دائمی برنمی‌گردونیم.
// multer.diskStorage() (تو videoUpload.ts) فایل رو موقتاً رو دیسک می‌نویسه، از
// اینجا با stream و یه اسم یکتا به MinIO/S3 آپلود می‌شه و فایل موقت پاک می‌شه، و فقط object key (نه لینک
// قابل‌دسترس) به فرانت برمی‌گرده. فرانت این key رو ذخیره می‌کنه؛ هر بار که
// واقعاً بخواد ویدیو رو پخش کنه، از GET /lesson-sessions/:id/video/signed-url
// یه لینک موقت (چند دقیقه‌ای، بعد از چک دسترسی) می‌گیره.
router.post('/video', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (req, res, next) => {
    videoUpload_1.videoUpload.single('video')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next((0, errors_1.badRequest)('حجم فایل بیشتر از حد مجاز (۵۰۰ مگابایت) است'));
            }
            return next((0, errors_1.badRequest)('آپلود فایل با خطا مواجه شد'));
        }
        if (err)
            return next(err);
        next();
    });
}, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw (0, errors_1.badRequest)('فایلی ارسال نشده');
    }
    const file = req.file;
    const objectKey = (0, objectKeys_1.buildObjectKey)('lesson-videos', req.user.sub, file.originalname);
    try {
        await (0, storage_1.uploadObjectFromFile)(objectKey, file.path, file.size, file.mimetype);
    }
    finally {
        // چه آپلود موفق باشه چه fail بشه، فایل موقت نباید رو دیسک بمونه
        await (0, promises_1.unlink)(file.path).catch(() => undefined);
    }
    res.status(201).json({
        fileName: decodeUploadedFileName(file.originalname),
        objectKey,
    });
}));
// همون منطق روت ویدیو، برای جزوه/PDF - فایل به bucket آپلود می‌شه و فقط
// object key برمی‌گرده؛ دانلود بعداً از GET
// /lesson-sessions/attachments/:attachmentId/signed-url انجام می‌شه
router.post('/attachment', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (req, res, next) => {
    attachmentUpload_1.attachmentUpload.single('attachment')(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next((0, errors_1.badRequest)('حجم فایل بیشتر از حد مجاز (۲۰ مگابایت) است'));
            }
            return next((0, errors_1.badRequest)('آپلود فایل با خطا مواجه شد'));
        }
        if (err)
            return next(err);
        next();
    });
}, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw (0, errors_1.badRequest)('فایلی ارسال نشده');
    }
    const objectKey = (0, objectKeys_1.buildObjectKey)('lesson-attachments', req.user.sub, req.file.originalname);
    await (0, storage_1.uploadObject)(objectKey, req.file.buffer, req.file.mimetype);
    res.status(201).json({
        fileName: decodeUploadedFileName(req.file.originalname),
        objectKey,
        fileSize: req.file.size,
    });
}));
exports.default = router;
