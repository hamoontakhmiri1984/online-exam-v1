import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FINISH_GRACE_MS,
  getExamWindowEndMs,
  isAnswerKeyReleased,
} from '../src/lib/examTiming';

// آزمون ساعت ۱۰:۰۰ تا ۱۱:۰۰ (۶۰ دقیقه)
const scheduledAt = new Date('2026-09-21T10:00:00.000Z');
const exam = { scheduledAt, durationMinutes: 60, allowReview: true };
const windowEnd = getExamWindowEndMs(exam);

test('پایان عمومی آزمون = scheduledAt + duration', () => {
  assert.equal(windowEnd, new Date('2026-09-21T11:00:00.000Z').getTime());
});

test('پاسخنامه وسط آزمون منتشر نمی‌شه (حتی برای دانشجویی که زودتر تموم کرده)', () => {
  const tenThirty = new Date('2026-09-21T10:30:00.000Z').getTime();
  assert.equal(isAnswerKeyReleased(exam, tenThirty), false);
});

test('تا آخرین لحظه‌ی مهلت ارسال هم منتشر نمی‌شه', () => {
  assert.equal(isAnswerKeyReleased(exam, windowEnd), false);
  assert.equal(isAnswerKeyReleased(exam, windowEnd + FINISH_GRACE_MS - 1), false);
});

test('بعد از پایان عمومی + مهلت ارسال منتشر می‌شه', () => {
  assert.equal(isAnswerKeyReleased(exam, windowEnd + FINISH_GRACE_MS), true);
  assert.equal(isAnswerKeyReleased(exam, windowEnd + 60 * 60_000), true);
});

test('با allowReview=false هیچ‌وقت منتشر نمی‌شه', () => {
  const noReview = { ...exam, allowReview: false };
  assert.equal(isAnswerKeyReleased(noReview, windowEnd + 24 * 60 * 60_000), false);
});
