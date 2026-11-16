require('dotenv').config({
  path: require('node:path').resolve(__dirname, '../.env'),
});
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { withPracticeApi } = require('./helpers/practiceApi.cjs');

test('Postgres practice: concurrent retry, immutable snapshot, group revocation and retained history', async (t) => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.REQUIRE_SERVICES === '1')
      throw Error('DATABASE_URL required');
    t.skip('Postgres URL not configured');
    return;
  }
  const db = new PrismaClient({ datasources: { db: { url } } });
  t.after(() => db.$disconnect());
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    if (process.env.REQUIRE_SERVICES === '1') throw e;
    t.skip('Postgres unavailable');
    return;
  }
  const prefix = 'practice-test-' + randomUUID();
  const owner = prefix + '-teacher',
    student = prefix + '-student',
    groupId = prefix + '-group',
    bankId = prefix + '-bank';
  const questionId = prefix + '-question';
  t.after(async () => {
    await db.practiceAttempt.deleteMany({ where: { studentId: student } });
    await db.practiceSet.deleteMany({ where: { instructorId: owner } });
    await db.questionBank.deleteMany({ where: { id: bankId } });
    await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: [owner, student] } } });
  });
  await db.user.createMany({
    data: [
      { id: owner, role: 'Instructor', approvalStatus: 'Approved' },
      { id: student, role: 'Student' },
    ],
  });
  await db.group.create({
    data: {
      id: groupId,
      name: 'Practice test',
      category: 'test',
      joinCode: prefix,
      instructorId: owner,
      students: { connect: { id: student } },
    },
  });
  await db.questionBank.create({
    data: { id: bankId, instructorId: owner, name: 'Test', category: 'test' },
  });
  await db.question.create({
    data: {
      id: questionId,
      bankId,
      text: 'Original',
      options: ['A', 'B'],
      correctOptionIndex: 1,
      difficulty: 'Hard',
    },
  });
  await withPracticeApi(t, db, async (r) => {
    const sampled = await r(`Instructor:${owner}`, 'POST', '/random-questions', {
      bankIds: [bankId],
      counts: { Easy: 0, Medium: 0, Hard: 1 },
    });
    assert.equal(sampled.status, 200, JSON.stringify(sampled.body));
    assert.deepEqual(sampled.body, [{ id: questionId, bankId, text: 'Original', difficulty: 'Hard' }]);
    const created = await r(`Instructor:${owner}`, 'POST', '', {
      title: 'Integration practice',
      groupIds: [groupId],
      questionIds: [questionId],
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.id;
    assert.equal(
      (
        await r(`Instructor:${owner}`, 'POST', `/${id}/status`, {
          status: 'Published',
        })
      ).status,
      200,
    );
    const page = await r(`Student:${student}`, 'GET', `/${id}/questions`);
    assert.equal(page.status, 200, JSON.stringify(page.body));
    const q = page.body.items[0];
    assert.equal(q.correctOptionIndex, undefined);
    await db.question.update({
      where: { id: questionId },
      data: { text: 'Changed', correctOptionIndex: 0 },
    });
    const input = { requestId: randomUUID(), selectedOptionIndex: 1 };
    const replies = await Promise.all(
      Array.from({ length: 8 }, () =>
        r(
          `Student:${student}`,
          'POST',
          `/${id}/questions/${q.id}/answers`,
          input,
        ),
      ),
    );
    for (const result of replies) {
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.isCorrect, true);
      assert.equal(result.body.stats.attempts, 1);
    }
    assert.equal(
      await db.practiceAttempt.count({ where: { studentId: student } }),
      1,
    );
    assert.equal(
      (
        await r(
          `Student:${student}`,
          'POST',
          `/${id}/questions/${q.id}/answers`,
          { requestId: randomUUID(), selectedOptionIndex: 0 },
        )
      ).body.stats.incorrect,
      1,
    );
    await db.question.delete({ where: { id: questionId } });
    assert.equal(
      (await r(`Student:${student}`, 'GET', `/${id}/questions`)).body.items[0]
        .text,
      'Original',
    );
    assert.equal(
      (
        await r(`Instructor:${owner}`, 'PUT', `/${id}`, {
          title: 'Changed',
          groupIds: [groupId],
          questionIds: [questionId],
        })
      ).status,
      409,
    );
    await db.group.update({
      where: { id: groupId },
      data: { students: { disconnect: { id: student } } },
    });
    assert.equal(
      (
        await r(
          `Student:${student}`,
          'POST',
          `/${id}/questions/${q.id}/answers`,
          input,
        )
      ).status,
      404,
    );
    await db.group.update({
      where: { id: groupId },
      data: { students: { connect: { id: student } } },
    });
    const history = await r(
      `Student:${student}`,
      'GET',
      `/${id}/questions/${q.id}/history`,
    );
    assert.equal(history.body.total, 2);
    await r(`Instructor:${owner}`, 'POST', `/${id}/status`, {
      status: 'Archived',
    });
    assert.equal((await r(`Student:${student}`, 'GET', `/${id}`)).status, 404);
    assert.equal(
      await db.practiceAttempt.count({ where: { studentId: student } }),
      2,
    );

    // Deletion is instructor-only and must preserve submitted student history.
    assert.equal(
      (await r(`Student:${student}`, 'DELETE', `/${id}`)).status,
      403,
    );
    const protectedDelete = await r(`Instructor:${owner}`, 'DELETE', `/${id}`);
    assert.equal(
      protectedDelete.status,
      409,
      JSON.stringify(protectedDelete.body),
    );
    assert.equal(
      await db.practiceAttempt.count({ where: { studentId: student } }),
      2,
    );

    // An untouched draft can be removed and disappears from the owner's list.
    const second = await r(`Instructor:${owner}`, 'POST', '', {
      title: 'Discardable draft',
      groupIds: [groupId],
      questionIds: [questionId],
    });
    // The original source question was removed; add a new source for this draft.
    assert.equal(second.status, 404);
    await db.question.create({
      data: {
        id: prefix + '-new-question',
        bankId,
        text: 'Fresh',
        options: ['A', 'B'],
        correctOptionIndex: 0,
        difficulty: 'Easy',
      },
    });
    const draft = await r(`Instructor:${owner}`, 'POST', '', {
      title: 'Discardable draft',
      groupIds: [groupId],
      questionIds: [prefix + '-new-question'],
    });
    assert.equal(draft.status, 201, JSON.stringify(draft.body));
    assert.equal(
      (await r(`Instructor:${owner}`, 'DELETE', `/${draft.body.id}`)).status,
      204,
    );
    assert.equal(
      (await r(`Instructor:${owner}`, 'GET', `/${draft.body.id}`)).status,
      404,
    );
  });
});
