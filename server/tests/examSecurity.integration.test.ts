import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import { rateLimitRedis } from '../src/lib/rateLimitRedis';
import { waitForRedis } from '../src/lib/redisConnection';
import { issueTokenPair, signResetTicket } from '../src/lib/authTokens';
import { isSessionValid, revokeSession } from '../src/lib/session';
import { resetPassword } from '../src/routes/auth/password/password.service';
import { verifyPassword } from '../src/lib/password';
import questions from '../src/routes/questions';
import attempts from '../src/routes/examAttempts';
import { getOptionOrder } from '../src/lib/examShuffle';
import { errorHandler } from '../src/middleware/errorHandler';
import { unavailable } from './helpers/serviceGuard';

let ready = false;
let server: Server;
let base: string;
const userIds: string[] = [];
const examIds: string[] = [];
const groupIds: string[] = [];
before(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await Promise.all([waitForRedis(redis), waitForRedis(rateLimitRedis)]);
    ready = true;
  } catch {
    return;
  }
  const app = express();
  app.use(express.json());
  app.use('/exams/:examId/questions', questions);
  app.use('/exams/:examId/attempts', attempts);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  if (ready) {
    await prisma.examAttempt.deleteMany({ where: { examId: { in: examIds } } });
    await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
    await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
    for (const id of userIds) await revokeSession(id);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
  if (redis.isOpen) redis.destroy();
  if (rateLimitRedis.isOpen) rateLimitRedis.destroy();
});
async function user(role: 'Student' | 'Instructor' | 'SuperAdmin') {
  const value = await prisma.user.create({
    data: {
      email: `security-${randomUUID()}@example.test`,
      role,
      emailVerifiedAt: new Date(),
    },
  });
  userIds.push(value.id);
  return { ...value, ...(await issueTokenPair(value.id, role)) };
}
async function fixture() {
  const teacher = await user('Instructor'),
    student = await user('Student');
  const group = await prisma.group.create({
    data: {
      name: 'security',
      category: 'test',
      joinCode: randomUUID(),
      instructorId: teacher.id,
      students: { connect: { id: student.id } },
    },
  });
  groupIds.push(group.id);
  const exam = await prisma.exam.create({
    data: {
      title: 'Security integration',
      category: 'test',
      scheduledAt: new Date(Date.now() - 60000),
      durationMinutes: 30,
      status: 'Published',
      allowReview: true,
      instructorId: teacher.id,
      groups: { connect: { id: group.id } },
    },
  });
  examIds.push(exam.id);
  const question = await prisma.examQuestion.create({
    data: {
      examId: exam.id,
      order: 0,
      textSnapshot: 'Question',
      optionsSnapshot: ['A', 'B'],
      correctIndexSnapshot: 1,
    },
  });
  return { teacher, student, exam, question, group };
}
async function request(
  examId: string,
  path: string,
  token?: string,
  method = 'GET',
  body?: unknown,
) {
  const response = await fetch(`${base}/exams/${examId}/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

test('HTTP permissions and answer key: guest, unrelated users, owner, admin, active/finished/review-disabled student', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  const f = await fixture(),
    outsider = await user('Student'),
    otherTeacher = await user('Instructor'),
    admin = await user('SuperAdmin');
  assert.equal((await request(f.exam.id, 'questions')).status, 401);
  for (const actor of [outsider, otherTeacher]) {
    assert.equal(
      (await request(f.exam.id, 'questions', actor.accessToken)).status,
      403,
    );
    assert.equal(
      (await request(f.exam.id, 'attempts', actor.accessToken)).status,
      403,
    );
  }
  for (const actor of [f.teacher, admin])
    assert.equal(
      (await request(f.exam.id, 'questions', actor.accessToken)).body[0]
        .correctOptionIndex,
      1,
    );
  assert.deepEqual(
    (await request(f.exam.id, 'questions', f.student.accessToken)).body,
    [],
  );
  assert.equal(
    (
      await request(
        f.exam.id,
        'attempts/start',
        f.student.accessToken,
        'POST',
        {},
      )
    ).status,
    201,
  );
  const hidden = async () => {
    const r = await request(f.exam.id, 'questions', f.student.accessToken);
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 1);
    assert.deepEqual(Object.keys(r.body[0]).sort(), [
      'examId',
      'id',
      'options',
      'text',
    ]);
  };
  await hidden();
  assert.equal(
    (
      await request(f.exam.id, 'questions', f.student.accessToken, 'POST', {
        text: 'hack',
        options: ['a', 'b'],
        correctOptionIndex: 0,
      })
    ).status,
    403,
  );
  const displayedQuestion = (
    await request(f.exam.id, 'questions', f.student.accessToken)
  ).body[0];
  const answers = {
    [f.question.id]: displayedQuestion.options.indexOf('B'),
  };
  assert.equal(
    (
      await request(
        f.exam.id,
        'attempts/events',
        f.student.accessToken,
        'POST',
        { type: 'TAB_HIDDEN' },
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        f.exam.id,
        'attempts/events',
        f.student.accessToken,
        'POST',
        { type: 'FULLSCREEN_EXIT' },
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        f.exam.id,
        'attempts/finish',
        f.student.accessToken,
        'POST',
        { answers },
      )
    ).status,
    200,
  );
  const instructorAttempts = await request(
    f.exam.id,
    'attempts',
    f.teacher.accessToken,
  );
  assert.equal(instructorAttempts.body[0].tabSwitchCount, 1);
  assert.equal(instructorAttempts.body[0].tabSwitches.length, 1);
  assert.equal(instructorAttempts.body[0].fullscreenExitCount, 1);
  assert.equal(instructorAttempts.body[0].fullscreenExits.length, 1);
  await hidden(); // Finishing early must not reveal answers to other candidates.
  await prisma.exam.update({
    where: { id: f.exam.id },
    data: { scheduledAt: new Date(Date.now() - 3600000) },
  });
  const released = (
    await request(f.exam.id, 'questions', f.student.accessToken)
  ).body[0];
  assert.equal(released.options[released.correctOptionIndex], 'B');
  await prisma.exam.update({
    where: { id: f.exam.id },
    data: { allowReview: false },
  });
  await hidden();
  assert.equal(
    (await request(f.exam.id, 'attempts/me', f.student.accessToken)).body
      .answers,
    undefined,
  );
});

test('HTTP autosave/submit races preserve final answers, ignore stale revisions and make duplicate finish idempotent', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  for (let round = 0; round < 5; round++) {
    const f = await fixture(),
      token = f.student.accessToken;
    await request(f.exam.id, 'attempts/start', token, 'POST', {});
    const displayedQuestion = (await request(f.exam.id, 'questions', token))
      .body[0];
    const correctDisplayedIndex = displayedQuestion.options.indexOf('B');
    const finalAnswers = { [f.question.id]: correctDisplayedIndex };
    const staleAnswers = {
      [f.question.id]: correctDisplayedIndex === 0 ? 1 : 0,
    };
    assert.equal(
      (
        await request(f.exam.id, 'attempts/answers', token, 'PATCH', {
          answers: finalAnswers,
          revision: 20,
        })
      ).body.saved,
      true,
    );
    assert.equal(
      (
        await request(f.exam.id, 'attempts/answers', token, 'PATCH', {
          answers: staleAnswers,
          revision: 19,
        })
      ).body.saved,
      false,
    );
    const responses = await Promise.all([
      request(f.exam.id, 'attempts/answers', token, 'PATCH', {
        answers: staleAnswers,
        revision: 21,
      }),
      request(f.exam.id, 'attempts/finish', token, 'POST', {
        answers: finalAnswers,
      }),
      request(f.exam.id, 'attempts/finish', token, 'POST', {
        answers: finalAnswers,
      }),
    ]);
    assert.ok([200, 409].includes(responses[0].status));
    assert.equal(responses[1].status, 200);
    assert.equal(responses[2].status, 200);
    const row = await prisma.examAttempt.findUniqueOrThrow({
      where: {
        examId_studentId: { examId: f.exam.id, studentId: f.student.id },
      },
    });
    assert.deepEqual(row.answers, finalAnswers);
    assert.equal(row.correctCount, 1);
    assert.ok(row.finishedAt);
    assert.equal(
      (
        await request(f.exam.id, 'attempts/answers', token, 'PATCH', {
          answers: staleAnswers,
          revision: 99,
        })
      ).status,
      409,
    );
    const repeated = await request(
      f.exam.id,
      'attempts/finish',
      token,
      'POST',
      { answers: staleAnswers },
    );
    assert.equal(repeated.body.correctCount, 1);
    assert.deepEqual(repeated.body.answers, finalAnswers);
  }
});

test('HTTP attempt start rate limit caps repeated starts per student and exam', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');

  const f = await fixture();
  const statuses: number[] = [];
  for (let index = 0; index < 6; index++) {
    const result = await request(
      f.exam.id,
      'attempts/start',
      f.student.accessToken,
      'POST',
      {},
    );
    statuses.push(result.status);
  }

  assert.deepEqual(statuses, [201, 200, 200, 200, 200, 429]);
});

test('Password reset ticket is single-use under concurrency and revokes the existing session', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  const actor = await user('Student');
  const ticket = await signResetTicket(actor.id);
  const passwords = ['Correct-password-A-123', 'Correct-password-B-123'];
  const results = await Promise.allSettled(
    passwords.map((p) => resetPassword(ticket, p)),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const winner = results.findIndex((r) => r.status === 'fulfilled');
  const row = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
  assert.ok(await verifyPassword(passwords[winner], row.passwordHash!));
  assert.equal(await isSessionValid(actor.id, actor.sid), false);
  await assert.rejects(resetPassword(ticket, 'Another-password-123'));
  await assert.rejects(
    resetPassword(actor.accessToken, 'Another-password-123'),
  );
});

test(
  'HTTP grading gives full marks for the displayed correct option under different seeds',
  async (t) => {
    if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');

    const f = await fixture();
    const secondStudent = await user('Student');
    await prisma.group.update({
      where: { id: f.group.id },
      data: { students: { connect: { id: secondStudent.id } } },
    });

    try {
      for (const actor of [f.student, secondStudent]) {
        assert.equal(
          (
            await request(f.exam.id, 'attempts/start', actor.accessToken, 'POST', {})
          ).status,
          201,
        );
      }

      let seedA = randomUUID();
      let seedB = randomUUID();
      while (
        getOptionOrder(2, seedA, f.question.id).join(',') ===
        getOptionOrder(2, seedB, f.question.id).join(',')
      ) {
        seedB = randomUUID();
      }

      await Promise.all([
        prisma.examAttempt.update({
          where: {
            examId_studentId: { examId: f.exam.id, studentId: f.student.id },
          },
          data: { shuffleSeed: seedA },
        }),
        prisma.examAttempt.update({
          where: {
            examId_studentId: {
              examId: f.exam.id,
              studentId: secondStudent.id,
            },
          },
          data: { shuffleSeed: seedB },
        }),
      ]);

      const results = await Promise.all(
        [
          { actor: f.student, seed: seedA },
          { actor: secondStudent, seed: seedB },
        ].map(async ({ actor, seed }) => {
          const displayed = await request(
            f.exam.id,
            'questions',
            actor.accessToken,
          );
          assert.equal(displayed.status, 200);
          assert.equal(displayed.body.length, 1);
          const question = displayed.body[0];
          const correctDisplayedIndex = question.options.indexOf('B');
          assert.ok(correctDisplayedIndex >= 0);

          const finished = await request(
            f.exam.id,
            'attempts/finish',
            actor.accessToken,
            'POST',
            { answers: { [f.question.id]: correctDisplayedIndex } },
          );
          assert.equal(finished.status, 200);
          assert.equal(finished.body.correctCount, 1);
          assert.equal(finished.body.totalQuestions, 1);

          const stored = await prisma.examAttempt.findUniqueOrThrow({
            where: {
              examId_studentId: {
                examId: f.exam.id,
                studentId: actor.id,
              },
            },
          });
          assert.equal(stored.shuffleSeed, seed);
          assert.equal(stored.correctCount, 1);
          return question.options;
        }),
      );

      assert.notDeepEqual(results[0], results[1]);
    } finally {
      // The suite's shared teardown removes both students and their attempts.
    }
  },
);

test('HTTP audit endpoint returns paginated attempts and recorded browser events', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  const f = await fixture();

  assert.equal(
    (
      await request(f.exam.id, 'attempts/start', f.student.accessToken, 'POST', {})
    ).status,
    201,
  );
  assert.equal(
    (
      await request(f.exam.id, 'attempts/events', f.student.accessToken, 'POST', {
        type: 'TAB_HIDDEN',
      })
    ).status,
    201,
  );

  const audit = await request(
    f.exam.id,
    'attempts/audit?page=1&pageSize=10',
    f.teacher.accessToken,
  );
  assert.equal(audit.status, 200);
  assert.equal(audit.body.page, 1);
  assert.equal(audit.body.pageSize, 10);
  assert.equal(audit.body.total, 1);
  assert.equal(audit.body.items.length, 1);
  assert.equal(audit.body.items[0].student.id, f.student.id);
  assert.equal(audit.body.items[0].tabSwitchCount, 1);
  assert.equal(audit.body.items[0].tabSwitches.length, 1);
});

test('HTTP attempt finish, answer-save and event limiters reject requests over their budgets', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  const f = await fixture();

  const finishStatuses: number[] = [];
  for (let i = 0; i < 11; i++) {
    finishStatuses.push(
      (
        await request(
          f.exam.id,
          'attempts/finish',
          f.student.accessToken,
          'POST',
          {},
        )
      ).status,
    );
  }
  assert.equal(finishStatuses[0], 400);
  assert.equal(finishStatuses[9], 400);
  assert.equal(finishStatuses[10], 429);

  const answerStatuses: number[] = [];
  for (let i = 0; i < 121; i++) {
    answerStatuses.push(
      (
        await request(
          f.exam.id,
          'attempts/answers',
          f.student.accessToken,
          'PATCH',
          {},
        )
      ).status,
    );
  }
  assert.equal(answerStatuses[0], 400);
  assert.equal(answerStatuses[119], 400);
  assert.equal(answerStatuses[120], 429);

  const eventStatuses: number[] = [];
  for (let i = 0; i < 31; i++) {
    eventStatuses.push(
      (
        await request(
          f.exam.id,
          'attempts/events',
          f.student.accessToken,
          'POST',
          {},
        )
      ).status,
    );
  }
  assert.equal(eventStatuses[0], 400);
  assert.equal(eventStatuses[29], 400);
  assert.equal(eventStatuses[30], 429);
});
