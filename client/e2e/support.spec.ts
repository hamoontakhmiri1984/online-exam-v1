import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('mobile home guide is accessible and offers internal support login', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('http://127.0.0.1:4109/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    let status = 200;
    if (path.startsWith('/auth/')) {
      status = 401;
      body = {};
    }
    if (path === '/support/assistant')
      body =
        route.request().method() === 'POST'
          ? { answer: 'برای ثبت‌نام، کد تأیید را وارد کنید.', mode: 'local' }
          : { provider: 'local', remote: false };
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'راهنما و پشتیبانی' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'ثبت‌نام', exact: true }).click();
  await expect(
    page.getByText('برای ثبت‌نام، کد تأیید را وارد کنید.', { exact: true }),
  ).toBeVisible();
  const result = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('button', { name: 'گفت‌وگو با پشتیبان' }).click();
  await expect(
    page.getByRole('link', { name: 'وارد حساب شوید' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'راهنما و پشتیبانی' }),
  ).toBeFocused();
});
test('student can create a ticket with tracking code and open the conversation', async ({ page }) => {
  const user = {
    id: 'student-1', role: 'Student', name: 'دانشجو', username: 'student',
    approvalStatus: 'Approved', onboardingCompleted: true,
  };
  const ticket = {
    id: 'ticket-1', userId: user.id, trackingCode: 'TK-TEST-001',
    subject: 'مشکل ورود به آزمون', category: 'Exams', priority: 'High',
    status: 'Open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const messages = [{
    id: 'msg-1', ticketId: ticket.id, clientId: 'uuid-1', fromStaff: false,
    body: 'صفحه آزمون باز نمی‌شود.', createdAt: new Date().toISOString(),
  }];
  let created = false;
  await page.route('http://127.0.0.1:4109/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path === '/auth/refresh') body = { accessToken: 'token' };
    else if (path === '/auth/me') body = user;
    else if (path === '/support/student/instructors') body = [{ id: 'teacher-1', name: 'مدرس دانشجو', username: 'teacher' }];
    else if (path === '/support/mine/tickets') body = created ? [ticket] : [];
    else if (path === '/support/tickets' && route.request().method() === 'POST') {
      expect(route.request().postDataJSON().assignedInstructorId).toBe('teacher-1');
      created = true;
      body = ticket;
    } else if (path === '/support/tickets/ticket-1') body = ticket;
    else if (path === '/support/tickets/ticket-1/messages') body = messages;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/support');
  await page.getByRole('button', { name: 'ثبت تیکت جدید' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'بستن' })).toHaveCount(1);
  await page.getByLabel('موضوع').fill(ticket.subject);
  const description = page.getByLabel('شرح درخواست');
  await expect(description).toHaveCSS('resize', 'none');
  await description.fill(messages[0].body);
  await page.getByRole('button', { name: 'ثبت تیکت', exact: true }).click();
  await expect(page.getByText(ticket.trackingCode)).toBeVisible();
  await expect(page.getByRole('log', { name: 'پیام‌های تیکت' })).toContainText(messages[0].body);
  await expect(page.getByRole('textbox', { name: 'پاسخ به تیکت' })).toHaveCSS('resize', 'none');
});


test('instructor views assigned student tickets separately from their own and can answer', async ({ page }) => {
  const user = {
    id: 'teacher-1', role: 'Instructor', name: 'مدرس تست', username: 'teacher',
    approvalStatus: 'Approved', onboardingCompleted: true,
  };
  const ticket = {
    id: 'student-ticket-1', userId: 'student-1', assignedInstructorId: user.id,
    trackingCode: 'TK-STUDENT-001', subject: 'مشکل نمره آزمون',
    category: 'Exams', priority: 'Normal', status: 'Open',
    user: { id: 'student-1', name: 'دانشجوی تست', username: 'student' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  let messages = [{
    id: 'msg-1', ticketId: ticket.id, clientId: 'uuid-1', fromStaff: false,
    body: 'نمره من نمایش داده نمی‌شود.', createdAt: new Date().toISOString(),
  }];
  await page.route('http://127.0.0.1:4109/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path === '/auth/refresh') body = { accessToken: 'test-token' };
    else if (path === '/auth/me') body = user;
    else if (path === '/support/mine/tickets') body = [];
    else if (path === '/support/assigned/tickets') body = [ticket];
    else if (path === '/support/tickets/student-ticket-1') body = ticket;
    else if (path === '/support/tickets/student-ticket-1/messages') {
      if (route.request().method() === 'POST') {
        const input = route.request().postDataJSON();
        messages = [...messages, {
          id: 'msg-2', ticketId: ticket.id, clientId: input.clientId, fromStaff: true,
          body: input.body, createdAt: new Date().toISOString(),
        }];
        body = { id: ticket.id };
      } else body = messages;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/support');
  await page.getByRole('button', { name: 'تیکت‌های دانشجویان' }).click();
  await expect(page.getByText('دانشجوی تست')).toBeVisible();
  await page.getByRole('button', { name: 'جزئیات' }).click();
  await page.getByRole('textbox', { name: 'پاسخ به تیکت' }).fill('نمره شما بررسی شد.');
  await page.getByRole('button', { name: 'ارسال', exact: true }).click();
  await expect(page.getByRole('log', { name: 'پیام‌های تیکت' })).toContainText('نمره شما بررسی شد.');
});

test('super admin filters the ticket inbox and replies directly from a ticket', async ({ page }) => {
  const user = {
    id: 'admin-1', role: 'SuperAdmin', name: 'مدیر', username: 'admin',
    approvalStatus: 'Approved', onboardingCompleted: true,
  };
  const ticket = {
    id: 'ticket-1', userId: 'teacher-1', trackingCode: 'TK-TEST-002',
    subject: 'مشکل بانک سؤال', category: 'Exams', priority: 'Urgent',
    status: 'Open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    user: { id: 'teacher-1', name: 'مدرس تست', username: 'teacher' },
  };
  const otherTicket = { ...ticket, id: 'ticket-2', trackingCode: 'TK-TEST-003', subject: 'سؤال درباره اشتراک', status: 'Closed' };
  let messages = [{
    id: 'msg-1', ticketId: ticket.id, clientId: 'uuid-1', fromStaff: false,
    body: 'بانک سؤال ذخیره نمی‌شود.', createdAt: new Date().toISOString(),
  }];
  await page.route('http://127.0.0.1:4109/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown = [];
    if (path === '/auth/refresh') body = { accessToken: 'token' };
    else if (path === '/auth/me') body = user;
    else if (path === '/support/inbox/tickets') {
      const items = [ticket, otherTicket];
      body = { items: url.searchParams.has('status') ? items.filter(item => item.status === 'Open') : items, hasMore: false };
    }
    else if (path === '/support/tickets/ticket-2') body = otherTicket;
    else if (path === '/support/tickets/ticket-1') body = ticket;
    else if (path === '/support/tickets/ticket-1/messages') {
      if (route.request().method() === 'POST') {
        const input = route.request().postDataJSON();
        messages = [...messages, {
          id: 'msg-2', ticketId: ticket.id, clientId: input.clientId, fromStaff: true,
          body: input.body, createdAt: new Date().toISOString(),
        }];
        ticket.status = 'Answered';
        body = { id: ticket.id };
      } else body = messages;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'صندوق تیکت‌های مدرس‌ها' })).toBeVisible();
  const selected = page.getByRole('button', { name: /مشکل بانک سؤال.*مدرس تست/ });
  const other = page.getByRole('button', { name: /سؤال درباره اشتراک.*مدرس تست/ });
  const conversation = page.getByRole('region', { name: 'گفت‌وگوی تیکت' });
  await selected.click();
  await conversation.getByRole('textbox', { name: 'پاسخ به تیکت' }).fill('پیش‌نویس تیکت اول');
  await other.click();
  await expect(other).toHaveAttribute('aria-current', 'true');
  await expect(conversation.getByRole('heading', { name: otherTicket.subject })).toBeFocused();
  await expect(conversation.getByRole('log')).not.toContainText(messages[0].body);
  await expect(conversation.getByRole('textbox', { name: 'پاسخ به تیکت' })).toBeHidden();
  await selected.click();
  await expect(conversation.getByRole('textbox', { name: 'پاسخ به تیکت' })).toHaveValue('');
  await conversation.getByRole('button', { name: 'بستن پنل گفت‌وگو' }).click();
  await expect(selected).toBeFocused();

  const filtered = page.waitForRequest(request => request.url().includes('/support/inbox/tickets') && request.url().includes('status=Open'));
  await page.getByRole('button', { name: 'در انتظار پاسخ', exact: true }).click();
  await filtered;
  await selected.click();
  await expect(selected).toBeVisible();
  await expect(selected).toHaveAttribute('aria-current', 'true');
  expect((await selected.boundingBox())!.x).toBeGreaterThan((await conversation.boundingBox())!.x);
  await expect(conversation.getByRole('log')).toContainText('بانک سؤال ذخیره نمی‌شود.');
  await conversation.getByRole('textbox', { name: 'پاسخ به تیکت' }).fill('در حال بررسی است.');
  await conversation.getByRole('button', { name: 'ارسال', exact: true }).click();
  await expect(conversation.getByRole('log')).toContainText('در حال بررسی است.');
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(conversation).toBeVisible();
  expect(await conversation.evaluate(panel => panel.scrollWidth <= panel.clientWidth)).toBe(true);
  await expect(page.getByRole('region', { name: 'فهرست تیکت‌ها' })).toBeHidden();
  await conversation.getByRole('button', { name: 'بازگشت به تیکت‌ها' }).click();
  await expect(conversation).toBeHidden();
  await expect(page.getByText('تیکتی در انتظار پاسخ نیست.')).toBeVisible();
});

test('session automatically recovers from transient refresh errors without showing the outage page', async ({ page }) => {
  const user = {
    id: 'teacher-1', role: 'Instructor', name: 'مدرس تست', username: 'teacher',
    approvalStatus: 'Approved', onboardingCompleted: true,
  };
  let refreshAttempts = 0;
  await page.route('http://127.0.0.1:4109/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/refresh') {
      refreshAttempts++;
      await route.fulfill({
        status: refreshAttempts === 1 ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify(refreshAttempts === 1 ? { error: 'موقتاً قطع' } : { accessToken: 'restored-token' }),
      });
      return;
    }
    const body = path === '/auth/me' ? user : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'تیکت‌های من' })).toBeVisible();
  expect(refreshAttempts).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('سرویس موقتاً در دسترس نیست', { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'تیکت‌های من' })).toBeVisible();
});
