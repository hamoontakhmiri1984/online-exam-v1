
import { detectIdentifierType } from './identifier';
import { prisma } from './prisma';

export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 20;

const USERNAME_FORMAT_REGEX =
  /^[a-zA-Z](?!.*[_.]{2})[a-zA-Z0-9_.]*[a-zA-Z0-9]$/;

// Reserve system identities to prevent impersonation.
const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'superadmin',
  'super_admin',
  'root',
  'support',
  'moderator',
  'mod',
  'system',
  'staff',
  'official',
  'owner',
  'webmaster',
  'security',
  'help',
  'info',
  'contact',
  'api',
  'null',
  'undefined',
  'test',
  'teacher',
  'instructor',
  'student',
  'guest',
  'anonymous',
  'user',
  'users',
  'me',
  'settings',
  'account',
  'login',
  'logout',
  'signup',
  'register',
]);

// This denylist is a basic abuse filter, not comprehensive content moderation.
const INAPPROPRIATE_SUBSTRINGS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'pussy',
  'dick',
  'cunt',
  'whore',
  'slut',
  'porn',
  'nigger',
  'faggot',
  'rape',
  'kir',
  'kos',
  'jende',
  'koon',
  'gooh',
  'madarjende',
  'pedarsag',
];

export type UsernameValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsernameFormat(raw: string): UsernameValidationResult {
  const value = raw.trim();

  if (
    value.length < USERNAME_MIN_LENGTH ||
    value.length > USERNAME_MAX_LENGTH
  ) {
    return {
      valid: false,
      error: `نام کاربری باید بین ${USERNAME_MIN_LENGTH} تا ${USERNAME_MAX_LENGTH} کاراکتر باشه`,
    };
  }

  if (!USERNAME_FORMAT_REGEX.test(value)) {
    return {
      valid: false,
      error:
        'نام کاربری باید با حرف انگلیسی شروع بشه و فقط شامل حروف/عدد انگلیسی، نقطه و آندرلاین باشه (بدون تکرار پشت‌سرهم یا پایان با نقطه/آندرلاین)',
    };
  }

  // Do not allow usernames that can be mistaken for email or phone identifiers.
  if (detectIdentifierType(value)) {
    return {
      valid: false,
      error: 'نام کاربری نمی‌تونه شبیه ایمیل یا شماره موبایل باشه',
    };
  }

  const normalized = normalizeUsername(value);

  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      error: 'این نام کاربری رزرو شده و قابل استفاده نیست',
    };
  }

  if (INAPPROPRIATE_SUBSTRINGS.some((word) => normalized.includes(word))) {
    return { valid: false, error: 'این نام کاربری مجاز نیست' };
  }

  return { valid: true };
}

export async function isUsernameTaken(
  usernameNormalized: string,
  excludeUserId?: string
): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { usernameNormalized },
  });
  if (!existing) return false;
  return existing.id !== excludeUserId;
}

export async function suggestUsernameAlternatives(
  rawBase: string,
  count = 3
): Promise<string[]> {
  const cleanedBase = normalizeUsername(rawBase).replace(/[^a-z0-9_.]/g, '');
  const base = cleanedBase.slice(0, Math.max(1, USERNAME_MAX_LENGTH - 4));

  const suggestions: string[] = [];
  let guard = 0;

  while (suggestions.length < count && guard < 20) {
    guard++;
    const suffix =
      guard % 2 === 0
        ? String(Math.floor(10 + Math.random() * 90))
        : `_${Math.floor(1 + Math.random() * 9)}`;

    const candidate = `${base}${suffix}`;
    if (candidate.length < USERNAME_MIN_LENGTH) continue;
    if (suggestions.includes(candidate)) continue;

    const taken = await isUsernameTaken(candidate);
    if (!taken) suggestions.push(candidate);
  }

  return suggestions;
}
