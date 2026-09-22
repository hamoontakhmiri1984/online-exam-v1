// Run against a migrated TEST database: npm run test:otp:integration
// Missing database access fails this suite; it is never silently skipped.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';
import { createOtp, verifyOtp } from '../src/lib/otp';

const identifiers: string[] = [];
function params() {
  const identifier = `otp-test-${randomUUID()}@example.invalid`;
  identifiers.push(identifier);
  return { identifier, channel: 'EMAIL' as const, purpose: 'LOGIN' as const };
}

after(async () => {
  try { await prisma.otpCode.deleteMany({ where: { identifier: { in: identifiers } } }); }
  finally { await prisma.$disconnect(); }
});

test('PostgreSQL: concurrent first issuance and replacement leave only one active challenge', async () => {
  const input = params();
  for (let round = 0; round < 3; round++) {
    const issued = await Promise.all(Array.from({ length: 8 }, () => createOtp(input)));
    const active = await prisma.otpCode.findMany({ where: {
      identifier: input.identifier, purpose: input.purpose, consumedAt: null,
    } });
    assert.equal(active.length, 1);
    const matches = await Promise.all(issued.map(async otp => ({
      code: otp.code, matches: await bcrypt.compare(otp.code, active[0].codeHash),
    })));
    const winner = matches.find(item => item.matches);
    assert.ok(winner);
    const results = await Promise.all(Array.from({ length: 8 }, () => verifyOtp({ ...input, code: winner.code })));
    assert.equal(results.filter(result => result.ok).length, 1);
    for (const otp of issued) assert.equal((await verifyOtp({ ...input, code: otp.code })).ok, false);
  }
});

test('PostgreSQL: parallel guesses respect the attempt limit', async () => {
  const input = params();
  const otp = await createOtp(input);
  const wrong = otp.code === '000000' ? '111111' : '000000';
  await Promise.all(Array.from({ length: 16 }, () => verifyOtp({ ...input, code: wrong })));
  const record = await prisma.otpCode.findFirstOrThrow({ where: { identifier: input.identifier } });
  assert.equal(record.attempts, 5);
  assert.equal((await verifyOtp({ ...input, code: otp.code })).ok, false);
});
