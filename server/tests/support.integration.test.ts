import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import { rateLimitRedis } from '../src/lib/rateLimitRedis';
import { waitForRedis } from '../src/lib/redisConnection';
import { issueTokenPair } from '../src/lib/authTokens';
import { revokeSession } from '../src/lib/session';
import support from '../src/routes/support';
import { errorHandler } from '../src/middleware/errorHandler';
import { unavailable } from './helpers/serviceGuard';
let ready = false;
let server: Server;
let base: string;
const ids: string[] = [];
before(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await waitForRedis(redis);
    await waitForRedis(rateLimitRedis);
    ready = true;
  } catch {
    return;
  }
  const app = express();
  app.use(express.json());
  app.use('/support', support);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/support`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  if (ready) {
    for (const id of ids) await revokeSession(id);
    await prisma.group.deleteMany({ where: { instructorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
  if (redis.isOpen) redis.destroy();
  if (rateLimitRedis.isOpen) rateLimitRedis.destroy();
});
async function user(role: 'Student' | 'Instructor' | 'SuperAdmin') {
  const value = await prisma.user.create({
    data: {
      email: `support-${randomUUID()}@example.test`,
      role,
      approvalStatus: 'Approved',
    },
  });
  ids.push(value.id);
  return (await issueTokenPair(value.id, role)).accessToken;
}
async function request(
  path: string,
  token?: string,
  body?: unknown,
  method = 'POST',
) {
  return fetch(base + path, {
    method: body ? method : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test('support isolates accounts, rejects staff impersonation, persists replies and deduplicates retries', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  const owner = await user('Student'),
    stranger = await user('Instructor'),
    admin = await user('SuperAdmin');
  assert.equal((await request('/mine')).status, 401);
  assert.equal((await request('/threads', stranger)).status, 403);
  const payload = { body: 'پیام خصوصی', clientId: randomUUID() };
  const created = await request('/mine/messages', owner, payload);
  assert.equal(created.status, 201);
  const { id } = (await created.json()) as { id: string };
  assert.equal((await request(`/${id}/messages`, stranger)).status, 404);
  assert.equal(
    (
      await request(`/${id}/messages`, stranger, {
        ...payload,
        clientId: randomUUID(),
      })
    ).status,
    404,
  );
  assert.equal(
    (await request(`/${id}`, owner, { status: 'closed' }, 'PATCH')).status,
    403,
  );
  assert.equal(
    (await request('/mine/messages', owner, { ...payload, fromStaff: true }))
      .status,
    400,
  );
  await Promise.all([
    request('/mine/messages', owner, payload),
    request('/mine/messages', owner, payload),
  ]);
  assert.equal(
    await prisma.supportMessage.count({ where: { threadId: id } }),
    1,
  );
  assert.equal(
    (
      await request(`/${id}/messages`, admin, {
        body: 'پاسخ پشتیبان',
        clientId: randomUUID(),
      })
    ).status,
    201,
  );
  const messages = (await (await request(`/${id}/messages`, owner)).json()) as {
    body: string;
    fromStaff: boolean;
  }[];
  assert.equal(messages.length, 2);
  assert.equal(messages[1].fromStaff, true);
  await request(`/${id}`, admin, { status: 'closed' }, 'PATCH');
  await request('/mine/messages', owner, {
    body: 'پیگیری',
    clientId: randomUUID(),
  });
  assert.equal(
    (await prisma.supportThread.findUniqueOrThrow({ where: { id } })).status,
    'waiting',
  );
});
test('remote assistant requires explicit consent before any provider call', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  process.env.ASSISTANT_PROVIDER = 'anthropic';
  try {
    assert.equal(
      (await request('/assistant', undefined, { message: 'سلام' })).status,
      400,
    );
  } finally {
    process.env.ASSISTANT_PROVIDER = 'local';
  }
});

test('ticketing separates student and instructor requests, provides unique tracking codes and restricts admin inbox', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  const student = await user('Student');
  const instructor = await user('Instructor');
  const outsider = await user('Instructor');
  const admin = await user('SuperAdmin');
  const [studentId, instructorId] = ids.slice(-4);
  await prisma.group.create({
    data: {
      name: 'کلاس آزمون',
      category: 'آموزشی',
      joinCode: randomUUID(),
      instructorId,
      students: { connect: { id: studentId } },
    },
  });
  assert.equal(
    (
      await request('/tickets', student, {
        subject: 'بدون مدرس',
        category: 'Account',
        priority: 'Normal',
        body: 'نباید بدون مدرس ثبت شود.',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/tickets', student, {
        subject: 'مدرس بی‌ربط',
        category: 'Account',
        priority: 'Normal',
        body: 'نباید به مدرس غریبه ارجاع شود.',
        assignedInstructorId: ids.at(-2),
      })
    ).status,
    400,
  );
  const availableTeachers = (await (
    await request('/student/instructors', student)
  ).json()) as Array<{ id: string }>;
  assert.deepEqual(
    availableTeachers.map((row) => row.id),
    [instructorId],
  );

  const studentResponse = await request('/tickets', student, {
    subject: 'مشکل ورود دانشجو',
    category: 'Account',
    priority: 'Normal',
    body: 'امکان مشاهده نتایج را ندارم.',
    assignedInstructorId: instructorId,
  });
  assert.equal(studentResponse.status, 201);
  const studentTicket = (await studentResponse.json()) as {
    id: string;
    trackingCode: string;
    status: string;
  };
  assert.match(studentTicket.trackingCode, /^TK-[A-Z0-9-]+$/);
  assert.equal(studentTicket.status, 'Open');

  const instructorResponse = await request('/tickets', instructor, {
    subject: 'خطای بانک سوال',
    category: 'Exams',
    priority: 'High',
    body: 'در ایجاد سوال جدید با خطا مواجه شدم.',
  });
  assert.equal(instructorResponse.status, 201);
  const instructorTicket = (await instructorResponse.json()) as {
    id: string;
    trackingCode: string;
  };
  assert.notEqual(studentTicket.trackingCode, instructorTicket.trackingCode);

  assert.equal(
    (await request(`/tickets/${studentTicket.id}`, outsider)).status,
    404,
  );
  assert.equal(
    (await request(`/tickets/${studentTicket.id}`, instructor)).status,
    200,
  );
  assert.equal((await request('/assigned/tickets', outsider)).status, 200);
  const teacherInbox = (await (
    await request('/assigned/tickets', instructor)
  ).json()) as Array<{ id: string }>;
  assert.ok(teacherInbox.some((item) => item.id === studentTicket.id));
  assert.equal((await request('/assigned/tickets', student)).status, 403);
  assert.equal(
    (await request(`/tickets/${studentTicket.id}`, admin)).status,
    404,
  );
  assert.equal(
    (await request(`/tickets/${instructorTicket.id}`, student)).status,
    404,
  );
  assert.equal(
    (await request(`/tickets/${instructorTicket.id}`, admin)).status,
    200,
  );
  assert.equal(
    (await request(`/tickets/${instructorTicket.id}/messages`, admin)).status,
    200,
  );
  const teacherReply = await request(
    `/tickets/${studentTicket.id}/messages`,
    instructor,
    {
      body: 'تیکت شما بررسی شد.',
      clientId: randomUUID(),
    },
  );
  assert.equal(teacherReply.status, 201);
  const studentMessages = (await (
    await request(`/tickets/${studentTicket.id}/messages`, student)
  ).json()) as Array<{ body: string; fromStaff: boolean }>;
  assert.ok(
    studentMessages.some(
      (message) => message.body === 'تیکت شما بررسی شد.' && message.fromStaff,
    ),
  );

  const mine = (await (
    await request('/mine/tickets', instructor)
  ).json()) as Array<{ id: string }>;
  assert.ok(mine.some((ticket) => ticket.id === instructorTicket.id));
  assert.ok(!mine.some((ticket) => ticket.id === studentTicket.id));

  const adminsInstructors = (await (
    await request('/instructors', admin)
  ).json()) as Array<{ id: string; ticketCount: number }>;
  assert.ok(adminsInstructors.some((row) => row.ticketCount > 0));
  assert.equal((await request('/instructors', student)).status, 403);
  const instructorDetail = await request(
    `/tickets/${instructorTicket.id}/messages`,
    admin,
    {
      body: 'مشکل را بررسی می‌کنیم.',
      clientId: randomUUID(),
    },
  );
  assert.equal(instructorDetail.status, 201);
  assert.equal(
    (
      await request(`/tickets/${studentTicket.id}/messages`, admin, {
        body: 'نباید مجاز باشد',
        clientId: randomUUID(),
      })
    ).status,
    404,
  );

  const updated = await request(
    `/tickets/${instructorTicket.id}`,
    instructor,
    { status: 'Closed' },
    'PATCH',
  );
  assert.equal(updated.status, 200);
  assert.equal(
    (
      await request(`/tickets/${instructorTicket.id}/messages`, instructor, {
        body: 'تیکت بسته است',
        clientId: randomUUID(),
      })
    ).status,
    400,
  );
});
