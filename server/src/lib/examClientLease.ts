import type { Request } from 'express';
import { redis } from './redis';
import { withSessionStore } from './session';
import { conflict, badRequest } from './errors';

// One active exam browser/tab per student and exam. The server owns the lease;
// sessionStorage only keeps the opaque client identifier across a page refresh.
const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEASE_SCRIPT = [
  "local owner = redis.call('GET', KEYS[1])",
  'if owner and owner ~= ARGV[1] then return 0 end',
  'if not owner and ARGV[3] == "0" then return 1 end',
  "if not owner then redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))",
  "else redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end",
  'return 1',
].join('\n');

export type AttemptLease = {
  examId: string;
  studentId: string;
  expiresAt: Date;
};

export async function requireExamClientLease(
  req: Request,
  attempt: AttemptLease,
  claim = true,
): Promise<void> {
  const raw = req.header('X-Exam-Client');
  if (!raw || !ID_PATTERN.test(raw)) {
    throw badRequest(
      'شناسه نشست آزمون معتبر نیست. آزمون را از صفحه خودش باز کنید.',
    );
  }

  const ttl = Math.max(
    60,
    Math.ceil((attempt.expiresAt.getTime() - Date.now()) / 1000) + 360,
  );
  const result = await withSessionStore(() =>
    redis.eval(LEASE_SCRIPT, {
      keys: [`exam-client:v1:${attempt.examId}:${attempt.studentId}`],
      arguments: [raw, String(ttl), claim ? '1' : '0'],
    }),
  );

  if (Number(result) !== 1) {
    throw conflict(
      'این آزمون در نشست یا تب دیگری باز است. ابتدا نشست قبلی را ببندید.',
    );
  }
}
