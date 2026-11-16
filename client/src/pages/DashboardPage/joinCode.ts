import { toLatinDigits } from '../../utils/identifier';

// Mirrors the server schema (groupSchemas.ts): joinCode is 4–32 characters,
// and the server upper-cases it before lookup.
export const JOIN_CODE_MIN_LENGTH = 4;
export const JOIN_CODE_MAX_LENGTH = 32;

// Whitespace plus zero-width / bidi marks that Persian keyboards and copy-paste can add.
const IGNORED_CHARS = /[\s\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

export function normalizeJoinCode(raw: string): string {
  return toLatinDigits(raw)
    .replace(IGNORED_CHARS, '')
    .toUpperCase()
    .slice(0, JOIN_CODE_MAX_LENGTH);
}

export function isJoinCodeComplete(code: string): boolean {
  return code.length >= JOIN_CODE_MIN_LENGTH;
}
