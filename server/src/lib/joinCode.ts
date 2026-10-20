import { randomInt } from 'crypto';
import { prisma } from './prisma';

// Exclude visually ambiguous characters from join codes.
const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const JOIN_CODE_LENGTH = 6;

function randomCode(): string {
  return Array.from({ length: JOIN_CODE_LENGTH }, () =>
    // Join codes require cryptographic randomness.
    JOIN_CODE_CHARS.charAt(randomInt(JOIN_CODE_CHARS.length))
  ).join('');
}

// Retry unique-key collisions rather than racing a separate existence check.
export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await prisma.group.findUnique({
      where: { joinCode: code },
    });
    if (!existing) return code;
  }
  throw new Error('تولید کد عضویت یکتا ناموفق بود، دوباره تلاش کن');
}
