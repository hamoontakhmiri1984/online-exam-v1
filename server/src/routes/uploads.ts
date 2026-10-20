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
import { validateUploadedFile } from '../lib/uploadValidation';

const router = Router();
router.use(requireAuth);

// Recover UTF-8 multipart filenames decoded as Latin-1 only when the byte sequence is valid.
function decodeUploadedFileName(name: string): string {
  if (!/[\u0080-\u00ff]/.test(name) || /[^\u0000-\u00ff]/.test(name))
    return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\ufffd') ? name : decoded;
}

// Return storage keys; private downloads require authorized signed URLs.
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
  validateUploadedFile('video'),
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
      // Remove temporary files on both upload success and failure.
      await unlink(file.path).catch(() => undefined);
    }

    res.status(201).json({
      fileName: decodeUploadedFileName(file.originalname),
      objectKey,
    });
  })
);

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
  validateUploadedFile('pdf'),
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
