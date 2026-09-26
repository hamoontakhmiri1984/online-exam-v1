"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_REGEX = void 0;
exports.isPasswordValid = isPasswordValid;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.verifyAgainstDummy = verifyAgainstDummy;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 12;
exports.PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
function isPasswordValid(password) {
    return exports.PASSWORD_REGEX.test(password);
}
async function hashPassword(plain) {
    return bcrypt_1.default.hash(plain, SALT_ROUNDS);
}
async function verifyPassword(plain, hash) {
    return bcrypt_1.default.compare(plain, hash);
}
// وقتی شناسه‌ی واردشده اصلاً حسابی (یا رمزی) نداره، یه مقایسه‌ی bcrypt بی‌اثر
// انجام می‌شه تا زمان پاسخ با حالت «حساب هست، رمز غلطه» یکی باشه و از روی
// سرعتِ خطا نشه وجود حساب رو حدس زد
let dummyHash = null;
async function verifyAgainstDummy(plain) {
    dummyHash ??= bcrypt_1.default.hash('timing-equalizer-not-a-real-password', SALT_ROUNDS);
    await bcrypt_1.default.compare(plain, await dummyHash);
}
