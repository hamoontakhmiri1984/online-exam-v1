import crypto from 'crypto';
import path from 'path';
import { z } from 'zod';

export type ObjectKeyKind = 'lesson-videos' | 'lesson-attachments';

// Object keys include the uploader ID so ownership can be validated.
export function buildObjectKey(
  kind: ObjectKeyKind,
  userId: string,
  originalName: string
): string {
  const rawExt = path.extname(originalName).toLowerCase();
  const ext = /^\.[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : '';
  return `${kind}/${userId}/${crypto.randomUUID()}${ext}`;
}

// Allow legacy key shapes while rejecting traversal and invalid prefixes.
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

// Accept owned uploads or the unchanged key already attached to this record.
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
