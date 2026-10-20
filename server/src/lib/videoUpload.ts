import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import { badRequest } from './errors';

// Buffer videos on disk to bound memory; remove temporary files after processing.
export const VIDEO_TMP_DIR = path.join(os.tmpdir(), 'lms-video-uploads');
fs.mkdirSync(VIDEO_TMP_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
]);

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

export const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEO_TMP_DIR),
    filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.tmp`),
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(badRequest('فرمت فایل مجاز نیست؛ فقط ویدیو (mp4, webm, ogg, mov, mkv)'));
      return;
    }
    cb(null, true);
  },
});
