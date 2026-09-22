import { Router } from 'express';
import multer from 'multer';
import { unlink } from 'fs/promises';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { videoUpload } from '../lib/videoUpload';
import { attachmentUpload } from '../lib/attachmentUpload';
import { uploadObject, uploadObjectFromFile } from '../lib/storage';
import { badRequest } from '../lib/errors';
import { buildObjectKey } from '../lib/objectKeys';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
router.use(requireAuth);

// multer (busboy) اسم فایل multipart رو به‌صورت latin1 می‌خونه؛ اسم فارسی
// («جزوه.pdf») به‌شکل رشته‌ی خراب (mojibake) تو دیتابیس ذخیره می‌شد. اگه اسم
// فقط کاراکترهای ≤ 0xFF داره و به‌عنوان UTF-8 معتبره، برش می‌گردونیم؛ اسمِ
// انگلیسی/ASCII دست‌نخورده می‌مونه.
function decodeUploadedFileName(name: string): string {
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
router.post(
  '/video',
  requireRole('Instructor', 'SuperAdmin'),
  (req, res, next) => {
    videoUpload.single('video')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            badRequest('حجم فایل بیشتر از حد مجاز (۵۰۰ مگابایت) است')
          );
        }
        return next(badRequest('آپلود فایل با خطا مواجه شد'));
      }
      if (err) return next(err);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw badRequest('فایلی ارسال نشده');
    }

    const file = req.file;
    const objectKey = buildObjectKey(
      'lesson-videos',
      req.user!.sub,
      file.originalname
    );

    try {
      await uploadObjectFromFile(
        objectKey,
        file.path,
        file.size,
        file.mimetype
      );
    } finally {
      // چه آپلود موفق باشه چه fail بشه، فایل موقت نباید رو دیسک بمونه
      await unlink(file.path).catch(() => undefined);
    }

    res.status(201).json({
      fileName: decodeUploadedFileName(file.originalname),
      objectKey,
    });
  })
);

// همون منطق روت ویدیو، برای جزوه/PDF - فایل به bucket آپلود می‌شه و فقط
// object key برمی‌گرده؛ دانلود بعداً از GET
// /lesson-sessions/attachments/:attachmentId/signed-url انجام می‌شه
router.post(
  '/attachment',
  requireRole('Instructor', 'SuperAdmin'),
  (req, res, next) => {
    attachmentUpload.single('attachment')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(badRequest('حجم فایل بیشتر از حد مجاز (۲۰ مگابایت) است'));
        }
        return next(badRequest('آپلود فایل با خطا مواجه شد'));
      }
      if (err) return next(err);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw badRequest('فایلی ارسال نشده');
    }

    const objectKey = buildObjectKey(
      'lesson-attachments',
      req.user!.sub,
      req.file.originalname
    );
    await uploadObject(objectKey, req.file.buffer, req.file.mimetype);

    res.status(201).json({
      fileName: decodeUploadedFileName(req.file.originalname),
      objectKey,
      fileSize: req.file.size,
    });
  })
);

export default router;
