import crypto from 'crypto';
import path from 'path';
import { z } from 'zod';

export type ObjectKeyKind = 'lesson-videos' | 'lesson-attachments';

// کلید جدید شامل id آپلودکننده‌ست: <kind>/<userId>/<uuid><ext>
// تا بعداً بشه بدون جدول اضافه مطمئن شد کلیدی که تو بدنه‌ی درخواست میاد
// واقعاً مال همین کاربره (isOwnedObjectKey).
export function buildObjectKey(
  kind: ObjectKeyKind,
  userId: string,
  originalName: string
): string {
  const rawExt = path.extname(originalName).toLowerCase();
  const ext = /^\.[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : '';
  return `${kind}/${userId}/${crypto.randomUUID()}${ext}`;
}

// چک شکل کلی (نه مالکیت): پیشوند درست، بدون path traversal. عمداً سخت‌گیرانه‌تر
// از این نیست چون کلیدهای قدیمی (بدون userId) هم باید همچنان قابل‌قبول بمونن.
function hasValidKeyShape(kind: ObjectKeyKind, key: string): boolean {
  return (
    key.startsWith(`${kind}/`) &&
    key.length > kind.length + 1 &&
    key.length <= 300 &&
    !key.includes('..') &&
    !key.includes('\\') &&
    !key.includes('//') &&
    !/[\u0000-\u001f]/.test(key)
  );
}

export function objectKeySchema(kind: ObjectKeyKind) {
  return z
    .string()
    .refine((key) => hasValidKeyShape(kind, key), 'کلید فایل نامعتبر است');
}

function isOwnedObjectKey(
  kind: ObjectKeyKind,
  userId: string,
  key: string
): boolean {
  return hasValidKeyShape(kind, key) && key.startsWith(`${kind}/${userId}/`);
}

// هر کلید یا باید مال خودِ کاربر باشه، یا از قبل روی همون رکورد ذخیره شده
// باشه (ویرایش بدون تعویض فایل؛ شامل کلیدهای قدیمی بدون userId)
export function canUseObjectKeys(
  kind: ObjectKeyKind,
  userId: string,
  keys: string[],
  existingKeys: Iterable<string> = []
): boolean {
  const existing = new Set(existingKeys);
  return keys.every(
    (key) => existing.has(key) || isOwnedObjectKey(kind, userId, key)
  );
}
