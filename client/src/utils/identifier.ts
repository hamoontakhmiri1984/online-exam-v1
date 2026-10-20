export type IdentifierType = 'EMAIL' | 'PHONE';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IRAN_PHONE_REGEX = /^(?:0|98|\+98)?9\d{9}$/;

export function toLatinDigits(raw: string): string {
  return raw
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    );
}

export function detectIdentifierType(raw: string): IdentifierType | null {
  const value = raw.trim();

  if (EMAIL_REGEX.test(value)) {
    return 'EMAIL';
  }

  if (IRAN_PHONE_REGEX.test(toLatinDigits(value))) {
    return 'PHONE';
  }

  return null;
}

export function normalizeIdentifier(
  raw: string,
  type: IdentifierType
): string {
  const value = raw.trim();

  if (type === 'EMAIL') {
    return value.toLowerCase();
  }

  const digits = toLatinDigits(value)
    .replace(/^\+?98/, '0')
    .replace(/^98/, '0');

  return digits.startsWith('0') ? digits : `0${digits}`;
}

export function isValidIdentifier(raw: string): boolean {
  return detectIdentifierType(raw) !== null;
}

export function validateIdentifier(raw: string): string | null {
  if (!raw.trim()) {
    return 'ایمیل یا شماره تماس را وارد کنید';
  }

  if (!isValidIdentifier(raw)) {
    return 'ایمیل یا شماره تماس معتبر نیست';
  }

  return null;
}