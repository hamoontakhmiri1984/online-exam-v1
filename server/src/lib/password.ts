import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// وقتی شناسه‌ی واردشده اصلاً حسابی (یا رمزی) نداره، یه مقایسه‌ی bcrypt بی‌اثر
// انجام می‌شه تا زمان پاسخ با حالت «حساب هست، رمز غلطه» یکی باشه و از روی
// سرعتِ خطا نشه وجود حساب رو حدس زد
let dummyHash: Promise<string> | null = null;

export async function verifyAgainstDummy(plain: string): Promise<void> {
  dummyHash ??= bcrypt.hash(
    'timing-equalizer-not-a-real-password',
    SALT_ROUNDS
  );
  await bcrypt.compare(plain, await dummyHash);
}
