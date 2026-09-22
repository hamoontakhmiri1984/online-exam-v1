// اسکریپت یک‌بارمصرف: فایل‌های ویدیو/جزوه که قبلاً رو دیسک سرور
// (uploads/lesson-videos و uploads/lesson-attachments) ذخیره شده بودن رو
// می‌خونه، به bucket (MinIO/S3 - همون envهای S3_* که src/lib/storage.ts
// استفاده می‌کنه) آپلود می‌کنه، و فیلد videoObjectUrl/fileUrl تو دیتابیس رو
// از URL کامل قدیمی (http://host/uploads/...) به همون object key ساده
// (lesson-videos/xxx.mp4) آپدیت می‌کنه - دقیقاً همون شکلی که از این به بعد
// routes/uploads.ts مستقیم تولید می‌کنه.
//
// امنه که چندبار اجرا بشه (idempotent): رکوردی که مقدارش از قبل یه object
// key ساده‌ست (نه http://...)، یعنی قبلاً migrate شده و رد می‌شه.
//
// اجرا (از پوشه‌ی server/):
//   npx ts-node --transpile-only scripts/migrate-uploads-to-storage.ts
//   (یا با --dry-run برای فقط دیدن چی migrate می‌شد، بدون آپلود/نوشتن)
//
// پیش‌نیاز: پوشه‌ی uploads/ قدیمی هنوز کنار سرور باشه (همون‌جایی که
// قبل از این تغییر بود) و envهای S3_* رو به bucket مقصد اشاره کنن.

import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { uploadObject } from '../src/lib/storage';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

// از یه URL قدیمی مثل http://localhost:4000/uploads/lesson-videos/abc.mp4
// هم مسیر دیسک (uploads/lesson-videos/abc.mp4) هم object key آینده
// (lesson-videos/abc.mp4) رو دربیار. اگه شکلش این نبود (یعنی قبلاً
// migrate شده یا اصلاً URL نیست)، null برمی‌گردونه.
function parseLegacyUploadUrl(
  value: string | null
): { diskPath: string; objectKey: string } | null {
  if (!value) return null;
  const marker = '/uploads/';
  const idx = value.indexOf(marker);
  if (idx === -1) return null; // از قبل object key ساده‌ست، نه URL قدیمی

  const objectKey = value.slice(idx + marker.length);
  const diskPath = path.join(UPLOAD_ROOT, objectKey);
  return { diskPath, objectKey };
}

function guessContentType(objectKey: string): string {
  const ext = path.extname(objectKey).toLowerCase();
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.pdf': 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

async function migrateOne(
  label: string,
  legacyUrl: string | null,
  dryRun: boolean
): Promise<string | null> {
  const parsed = parseLegacyUploadUrl(legacyUrl);
  if (!parsed) return null; // چیزی برای migrate کردن نیست

  if (!fs.existsSync(parsed.diskPath)) {
    console.warn(`⚠️  ${label}: فایل رو دیسک پیدا نشد (${parsed.diskPath}) - رد شد`);
    return null;
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}${label}: ${parsed.objectKey}`);
  if (dryRun) return parsed.objectKey;

  const buffer = fs.readFileSync(parsed.diskPath);
  await uploadObject(parsed.objectKey, buffer, guessContentType(parsed.objectKey));
  return parsed.objectKey;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const sessions = await prisma.lessonSession.findMany({
    where: { videoType: 'UPLOAD' },
    select: { id: true, videoObjectUrl: true },
  });

  let migratedSessions = 0;
  for (const session of sessions) {
    const newKey = await migrateOne(
      `session ${session.id}`,
      session.videoObjectUrl,
      dryRun
    );
    if (newKey && !dryRun) {
      await prisma.lessonSession.update({
        where: { id: session.id },
        data: { videoObjectUrl: newKey },
      });
      migratedSessions++;
    }
  }

  const attachments = await prisma.lessonAttachment.findMany({
    select: { id: true, fileUrl: true },
  });

  let migratedAttachments = 0;
  for (const attachment of attachments) {
    const newKey = await migrateOne(
      `attachment ${attachment.id}`,
      attachment.fileUrl,
      dryRun
    );
    if (newKey && !dryRun) {
      await prisma.lessonAttachment.update({
        where: { id: attachment.id },
        data: { fileUrl: newKey },
      });
      migratedAttachments++;
    }
  }

  console.log(
    `${dryRun ? '[dry-run] چیزی نوشته نشد. ' : ''}تمام: ${migratedSessions} ویدیوی جلسه، ${migratedAttachments} پیوست.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
