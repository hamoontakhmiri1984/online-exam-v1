import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { prisma } from '../src/lib/prisma';
import reporting from '../src/routes/admin/reporting.routes';
import { reportRange } from '../src/lib/adminReportQuery';
import { unavailable } from './helpers/serviceGuard';

after(async () => {
  await prisma.$disconnect();
});
test('report range is bounded and starts at Tehran midnight', () => {
  const result = reportRange({ days: '7' }, new Date('2026-10-18T21:00:00Z'));
  assert.equal(result.start.toISOString(), '2026-10-12T20:30:00.000Z');
  assert.equal(result.days, 7);
  for (const days of ['365', '0', ['7'], {}, '7 OR 1=1'])
    assert.throws(() => reportRange({ days }));
  assert.throws(() => reportRange({ instructorId: ['A'] }));
});

test('Postgres reporting: scoped averages, zero-day series, latest subscription, bounded lists', async (t) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return unavailable(t, 'Postgres unavailable');
  }
  const app = express();
  app.use(reporting);
  app.use(
    (
      err: { statusCode?: number; message: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    },
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  );
  const address = server.address() as { port: number };
  const request = (path: string) =>
    fetch(`http://127.0.0.1:${address.port}${path}`);
  const prefix = `report-${crypto.randomUUID()}`;
  const ids: string[] = [];
  try {
    const owner = await prisma.user.create({
      data: { email: `${prefix}-owner@example.test`, role: 'Instructor' },
    });
    ids.push(owner.id);
    const other = await prisma.user.create({
      data: { email: `${prefix}-other@example.test`, role: 'Instructor' },
    });
    ids.push(other.id);
    const students = await Promise.all(
      [0, 1, 2].map((i) =>
        prisma.user.create({
          data: { email: `${prefix}-${i}@example.test`, role: 'Student' },
        }),
      ),
    );
    ids.push(...students.map((s) => s.id));
    const now = new Date();
    const before = new Date(now.getTime() - 60_000);
    const exams = await Promise.all(
      [owner.id, other.id].map((instructorId) =>
        prisma.exam.create({
          data: {
            instructorId,
            title: prefix,
            category: 'test',
            scheduledAt: before,
            durationMinutes: 30,
          },
        }),
      ),
    );
    for (let i = 0; i < 3; i++)
      await prisma.examAttempt.create({
        data: {
          examId: exams[0].id,
          studentId: students[i].id,
          answers: [],
          correctCount: i === 0 ? 1 : 9,
          totalQuestions: i === 0 ? 2 : 10,
          startedAt: before,
          finishedAt: i === 2 ? null : before,
          expiresAt: now,
        },
      });
    await prisma.examAttempt.create({
      data: {
        examId: exams[1].id,
        studentId: students[0].id,
        answers: [],
        correctCount: 0,
        totalQuestions: 2,
        startedAt: before,
        finishedAt: before,
        expiresAt: now,
      },
    });
    await prisma.subscription.create({
      data: {
        instructorId: owner.id,
        planId: 'gold',
        startDate: new Date(now.getTime() - 3600000),
        endDate: new Date(now.getTime() + 86400000),
      },
    });
    await prisma.subscription.create({
      data: { instructorId: owner.id, planId: 'free', startDate: before },
    });
    await prisma.payment.create({
      data: {
        instructorId: owner.id,
        planId: 'gold',
        amount: 99000,
        status: 'Success',
        authority: prefix,
      },
    });
    await prisma.payment.create({
      data: {
        instructorId: other.id,
        planId: 'gold',
        amount: 50000,
        status: 'Success',
        authority: `${prefix}-other`,
      },
    });
    const response = await request(`/summary?days=7&instructorId=${owner.id}`);
    assert.equal(response.status, 200, await response.clone().text());
    const body = await response.json();
    assert.equal(body.started, 3);
    assert.equal(body.completed, 2);
    assert.equal(body.average, 70);
    assert.equal(body.revenue, 99000);
    assert.equal(body.successfulPayments, 1);
    assert.equal(body.activeSubscriptions, 0);
    assert.equal(body.series.length, 7);
    assert.equal(
      body.series.reduce(
        (n: number, d: { completed: number }) => n + d.completed,
        0,
      ),
      2,
    );
    assert.equal(body.registrationSeriesAvailable, false);
    const page = await (
      await request(`/attempts?days=7&instructorId=${owner.id}&pageSize=1`)
    ).json();
    assert.equal(page.total, 2);
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].exam.instructor.id, owner.id);
    assert.equal('passwordHash' in page.items[0].student, false);
    const paymentPage = await (
      await request(`/payments?days=7&instructorId=${owner.id}`)
    ).json();
    assert.equal(paymentPage.total, 1);
    assert.equal(paymentPage.items[0].amount, 99000);
    assert.equal((await request('/attempts?pageSize=101')).status, 400);
    assert.equal((await request('/summary?days=365')).status, 400);
    assert.equal((await request('/attempts?order=invalid')).status, 400);
    await prisma.adminAuditLog.create({
      data: {
        adminId: owner.id,
        action: 'instructor.plan_change',
        targetType: 'User',
        targetId: prefix,
        before: { secret: 'not returned' },
      },
    });
    const events = await (await request(`/events?q=${prefix}`)).json();
    assert.equal(events.total, 1);
    assert.equal('before' in events.items[0], false);
  } finally {
    await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: ids } } });
    await prisma.examAttempt.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.exam.deleteMany({ where: { instructorId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { instructorId: { in: ids } } });
    await prisma.subscription.deleteMany({
      where: { instructorId: { in: ids } },
    });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});
