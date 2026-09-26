"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildObjectKey = buildObjectKey;
exports.objectKeySchema = objectKeySchema;
exports.canUseObjectKeys = canUseObjectKeys;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// کلید جدید شامل id آپلودکننده‌ست: <kind>/<userId>/<uuid><ext>
// تا بعداً بشه بدون جدول اضافه مطمئن شد کلیدی که تو بدنه‌ی درخواست میاد
// واقعاً مال همین کاربره (isOwnedObjectKey).
function buildObjectKey(kind, userId, originalName) {
    const rawExt = path_1.default.extname(originalName).toLowerCase();
    const ext = /^\.[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : '';
    return `${kind}/${userId}/${crypto_1.default.randomUUID()}${ext}`;
}
// چک شکل کلی (نه مالکیت): پیشوند درست، بدون path traversal. عمداً سخت‌گیرانه‌تر
// از این نیست چون کلیدهای قدیمی (بدون userId) هم باید همچنان قابل‌قبول بمونن.
function hasValidKeyShape(kind, key) {
    return (key.startsWith(`${kind}/`) &&
        key.length > kind.length + 1 &&
        key.length <= 300 &&
        !key.includes('..') &&
        !key.includes('\\') &&
        !key.includes('//') &&
        !/[\u0000-\u001f]/.test(key));
}
function objectKeySchema(kind) {
    return zod_1.z
        .string()
        .refine((key) => hasValidKeyShape(kind, key), 'کلید فایل نامعتبر است');
}
function isOwnedObjectKey(kind, userId, key) {
    return hasValidKeyShape(kind, key) && key.startsWith(`${kind}/${userId}/`);
}
// هر کلید یا باید مال خودِ کاربر باشه، یا از قبل روی همون رکورد ذخیره شده
// باشه (ویرایش بدون تعویض فایل؛ شامل کلیدهای قدیمی بدون userId)
function canUseObjectKeys(kind, userId, keys, existingKeys = []) {
    const existing = new Set(existingKeys);
    return keys.every((key) => existing.has(key) || isOwnedObjectKey(kind, userId, key));
}
