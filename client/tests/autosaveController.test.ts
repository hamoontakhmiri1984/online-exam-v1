import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAutosaveController,
  type AnswersMap,
  type AutosaveStatus,
} from '../src/hooks/useExamRunner/autosaveController';

const tick = (ms = 15) => new Promise((resolve) => setTimeout(resolve, ms));

type Call = {
  answers: AnswersMap;
  revision: number;
  resolve: (r: { saved: boolean; revision: number }) => void;
  reject: (e: unknown) => void;
};

// سرورِ ساختگی که مثل سرور واقعی فقط revision بزرگ‌تر رو می‌پذیره
function makeFakeServer(initialRevision = 0) {
  let storedRevision = initialRevision;
  let storedAnswers: AnswersMap = {};
  const calls: { answers: AnswersMap; revision: number }[] = [];
  return {
    calls,
    get stored() {
      return { revision: storedRevision, answers: storedAnswers };
    },
    forceStored(revision: number, answers: AnswersMap) {
      storedRevision = revision;
      storedAnswers = answers;
    },
    save: async (answers: AnswersMap, revision: number) => {
      calls.push({ answers, revision });
      if (revision > storedRevision) {
        storedRevision = revision;
        storedAnswers = answers;
        return { saved: true, revision };
      }
      return { saved: false, revision: storedRevision };
    },
  };
}

function setup(
  save: Parameters<typeof createAutosaveController>[0]['save'],
  extra: Partial<Parameters<typeof createAutosaveController>[0]> = {}
) {
  const statuses: AutosaveStatus[] = [];
  const controller = createAutosaveController({
    save,
    isConflict: (e) => (e as { status?: number })?.status === 409,
    onStatus: (s) => statuses.push(s),
    debounceMs: 5,
    retryBaseMs: 5,
    retryMaxMs: 20,
    ...extra,
  });
  controller.start();
  return { controller, statuses };
}

test('تغییرهای پشت‌سرهم یک ذخیره‌ی جمع‌شده می‌شن و آخرین وضعیت روی سرور می‌شینه', async () => {
  const server = makeFakeServer();
  const { controller, statuses } = setup(server.save);

  controller.markChanged({ q1: 0 });
  controller.markChanged({ q1: 0, q2: 1 });
  controller.markChanged({ q1: 2, q2: 1 });
  await tick(40);

  assert.equal(server.calls.length, 1);
  assert.deepEqual(server.stored.answers, { q1: 2, q2: 1 });
  assert.equal(server.stored.revision, 1);
  assert.equal(statuses.at(-1), 'saved');
});

test('همیشه حداکثر یک درخواست در راهه؛ تغییر وسط درخواست، بعدش با آخرین وضعیت می‌ره', async () => {
  const pending: Call[] = [];
  const server = makeFakeServer();
  const { controller } = setup(
    (answers, revision) =>
      new Promise((resolve, reject) => {
        pending.push({ answers, revision, resolve, reject });
      })
  );

  controller.markChanged({ q1: 0 });
  await tick(20);
  assert.equal(pending.length, 1);

  // در حالی که درخواست اول هنوز برنگشته، سه تغییر دیگه
  controller.markChanged({ q1: 1 });
  controller.markChanged({ q1: 2 });
  controller.markChanged({ q1: 3 });
  controller.flushNow();
  await tick(20);
  assert.equal(pending.length, 1, 'نباید درخواست دومِ هم‌زمان بره');

  pending[0].resolve(await server.save(pending[0].answers, pending[0].revision));
  await tick(20);

  assert.equal(pending.length, 2);
  assert.deepEqual(pending[1].answers, { q1: 3 });
  assert.equal(pending[1].revision, 2);
});

test('سرور نسخه‌ی جدیدتر دارد: شمارنده جلو می‌رود و آخرین وضعیت دوباره فرستاده می‌شود', async () => {
  const server = makeFakeServer();
  server.forceStored(5, { old: 1 }); // مثلاً تب دیگری تا revision 5 ذخیره کرده
  const { controller, statuses } = setup(server.save);

  controller.markChanged({ q1: 2 });
  await tick(40);

  assert.deepEqual(
    server.calls.map((c) => c.revision),
    [1, 6]
  );
  assert.deepEqual(server.stored.answers, { q1: 2 });
  assert.equal(statuses.at(-1), 'saved');
});

test('revision اولیه‌ی سرور بعد از رفرش ادامه پیدا می‌کند', async () => {
  const server = makeFakeServer(7);
  const { controller } = setup(server.save, { initialRevision: 7 });

  controller.markChanged({ q1: 1 });
  await tick(30);

  assert.deepEqual(
    server.calls.map((c) => c.revision),
    [8]
  );
});

test('خطای شبکه: وضعیت error می‌شود، با backoff تکرار می‌شود و در نهایت ذخیره می‌شود', async () => {
  const server = makeFakeServer();
  let failuresLeft = 2;
  const { controller, statuses } = setup(async (answers, revision) => {
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      throw new Error('network');
    }
    return server.save(answers, revision);
  });

  controller.markChanged({ q1: 1 });
  await tick(120);

  assert.ok(statuses.includes('error'));
  assert.deepEqual(server.stored.answers, { q1: 1 });
  assert.equal(statuses.at(-1), 'saved');
});

test('دکمه‌ی تلاش دوباره فوراً دوباره می‌فرستد', async () => {
  const server = makeFakeServer();
  let fail = true;
  const { controller, statuses } = setup(
    async (a, r) => {
      if (fail) throw new Error('network');
      return server.save(a, r);
    },
    { retryBaseMs: 10_000, retryMaxMs: 10_000 } // backoff عملاً منتظر نمی‌مونه
  );

  controller.markChanged({ q1: 1 });
  await tick(30);
  assert.equal(statuses.at(-1), 'error');

  fail = false;
  controller.retry();
  await tick(30);
  assert.equal(statuses.at(-1), 'saved');
  assert.deepEqual(server.stored.answers, { q1: 1 });
  controller.stop();
});

test('۴۰۹ (آزمون ثبت شده): ذخیره متوقف می‌شود و خطایی نشان داده نمی‌شود', async () => {
  let calls = 0;
  const { controller, statuses } = setup(async () => {
    calls += 1;
    throw { status: 409 };
  });

  controller.markChanged({ q1: 1 });
  await tick(30);
  controller.markChanged({ q1: 2 });
  await tick(30);

  assert.equal(calls, 1);
  assert.ok(!statuses.includes('error'));
});

test('بعد از stop (پایان آزمون) پاسخ درخواست در راه نادیده گرفته می‌شود و چیزی جدید نمی‌رود', async () => {
  const pending: Call[] = [];
  const { controller, statuses } = setup(
    (answers, revision) =>
      new Promise((resolve, reject) => {
        pending.push({ answers, revision, resolve, reject });
      })
  );

  controller.markChanged({ q1: 1 });
  await tick(20);
  controller.stop();
  controller.markChanged({ q1: 2 }); // بعد از finish
  pending[0].resolve({ saved: true, revision: 1 });
  await tick(30);

  assert.equal(pending.length, 1);
  assert.equal(statuses.at(-1), 'saving'); // وضعیتِ «saved» بعد از stop ست نمی‌شه
});
