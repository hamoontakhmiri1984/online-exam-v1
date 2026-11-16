import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const instructor = { id: 'teacher', name: 'مریم احمدی', username: 'teacher', email: 'teacher@example.test', approvalStatus: 'Approved', stats: { students: 40, groups: 3, exams: 6 } };
const attempt = { id: 'attempt', finishedAt: '2026-10-18T12:00:00Z', correctCount: 8, totalQuestions: 10, student: { id: 'student', name: 'علی رضایی' }, exam: { id: 'exam', title: 'ارزیابی پایان دوره', instructor } };
test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:4109/**', async route => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    switch (url.pathname) {
      case '/auth/refresh': body = { accessToken: 'fixture-token' }; break;
      case '/auth/me': body = { id: 'admin', role: 'SuperAdmin', name: 'کاربر ارشد', username: 'admin', onboardingCompleted: true }; break;
      case '/admin/dashboard': body = { stats: { approvedInstructors: 24, students: 830, activeExams: 12, pendingRequests: 3 }, attention: { instructors: { total: 2, items: [{ ...instructor, createdAt: '2026-10-18T12:00:00Z' }] }, groups: { total: 1, items: [{ id: 'group', name: 'زبان انگلیسی', category: 'زبان', instructorName: instructor.name, createdAt: '2026-10-18T12:00:00Z' }] } }, recentExams: [{ id: 'exam', title: 'ارزیابی پایان دوره', instructorId: instructor.id, instructorName: instructor.name, scheduledAt: '2026-10-18T12:00:00Z', status: 'upcoming', participants: 42 }] }; break;
      case '/admin/reporting/summary': body = { started: 184, completed: 172, average: 73.8, revenue: 1287000, successfulPayments: 13, activeSubscriptions: 28, registrationSeriesAvailable: true, series: Array.from({ length: Number(url.searchParams.get('days') || 30) }, (_, i) => ({ day: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), completed: i % 8, registered: i % 5 })) }; break;
      case '/admin/reporting/events': body = { items: [{ id: 'log', action: 'instructor.approve', targetType: 'User', targetId: 'teacher', createdAt: '2026-10-18T12:00:00Z', admin: { id: 'admin', name: 'مدیر سامانه' } }], total: 1, page: 1, pageSize: 25 }; break;
      case '/admin/reporting/attempts': body = { items: [attempt], total: 1, page: 1, pageSize: 25 }; break;
      case '/admin/users/instructors': body = { items: [instructor], total: 1, page: 1, pageSize: 25 }; break;
      case '/admin/users/students': body = { items: [], total: 0, page: 1, pageSize: 25 }; break;
      case '/cms': body = { sections: {}, hiddenSections: [] }; break;
      case '/cms/admin/drafts': body = { sections: {} }; break;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
});

test('student group filter toggles and the selected sort label stays on one line', async ({ page }) => {
  const studentsRequest = (ungrouped: boolean) => page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname === '/admin/users/students' &&
      (ungrouped ? url.searchParams.get('ungrouped') === 'true' : !url.searchParams.has('ungrouped'));
  });
  const initial = studentsRequest(false);
  await page.goto('/instructor-students');
  await initial;
  const toggle = page.getByRole('button', { name: 'بدون گروه', exact: true });
  const filtered = studentsRequest(true);
  await toggle.click();
  await filtered;
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'حذف فیلتر', exact: true })).toHaveCount(0);
  const cleared = studentsRequest(false);
  await toggle.click();
  await cleared;
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  const sort = page.getByRole('combobox', { name: 'ترتیب دانشجویان' });
  await sort.click();
  await page.getByRole('option', { name: 'نام دانشجو' }).click();
  await sort.click();
  const selected = page.getByRole('option', { name: 'نام دانشجو', selected: true });
  await expect(selected).toBeVisible();
  const labelFits = await selected.locator('span').evaluate(label => {
    const range = document.createRange();
    range.selectNodeContents(label);
    return range.getClientRects().length === 1;
  });
  expect(labelFits).toBe(true);
});

test('content type uses the panel menu and filters the content cards', async ({ page }) => {
  await page.goto('/blog-posts');
  await expect(page.getByRole('heading', { name: 'بنر اصلی سایت' })).toBeVisible();
  const filter = page.getByRole('combobox', { name: 'نوع محتوا' });
  await filter.click();
  await expect(page.getByRole('listbox', { name: 'نوع محتوا' })).toBeVisible();
  await page.getByRole('option', { name: 'مقالات بلاگ' }).click();
  await expect(filter).toHaveText('مقالات بلاگ');
  await expect(page.getByRole('heading', { name: 'بنر اصلی سایت' })).toHaveCount(0);
});

for (const mobile of [false, true]) test(`admin dashboard: ${mobile ? 'mobile dark' : 'desktop light'}`, async ({ page }) => {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  if (mobile) await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dashboard');
  await expect(page.locator(mobile ? 'p' : 'td').filter({ hasText: 'ارزیابی پایان دوره' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'روند فعالیت' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'شروع آزمون' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('dashboard.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('report filters reach the API and teacher directory is keyboard accessible', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByText('علی رضایی', { exact: true })).toBeVisible();
  const changed = page.waitForRequest(r => r.url().includes('/admin/reporting/attempts') && r.url().includes('order=oldest'));
  await page.getByRole('combobox', { name: 'ترتیب نتایج' }).click();
  await page.getByRole('option', { name: 'قدیمی‌ترین' }).click(); await changed;
  const ranged = page.waitForRequest(r => r.url().includes('/summary?days=7'));
  await page.getByRole('combobox').filter({ hasText: '۳۰ روز اخیر' }).click();
  const selectedRange = page.getByRole('option', { name: '۳۰ روز اخیر', selected: true });
  await expect(selectedRange).toBeVisible();
  const textLines = await selectedRange.locator('span').evaluate(label => {
    const range = document.createRange();
    range.selectNodeContents(label);
    return new Set(Array.from(range.getClientRects(), rect => rect.top)).size;
  });
  expect(textLines).toBe(1);
  await page.getByRole('option', { name: '۷ روز اخیر' }).click(); await ranged;
  await page.goto('/instructors');
  await expect(page.getByRole('link', { name: 'مریم احمدی' })).toBeVisible();
  const sorted = page.waitForRequest(r => r.url().includes('/admin/users/instructors') && r.url().includes('order=name'));
  await page.getByRole('combobox', { name: 'ترتیب مدرس‌ها' }).click();
  await page.getByRole('option', { name: 'نام مدرس' }).click(); await sorted;
  await expect(page.getByText('teacher@example.test', { exact: true })).toBeVisible();
});

test('blog post validation stays beside fields and text areas cannot be resized', async ({ page }) => {
  await page.goto('/blog-posts/new');
  await page.getByRole('button', { name: 'ذخیره', exact: true }).click();

  await expect(page.getByText('پست ذخیره نشد.', { exact: false })).toHaveCount(0);
  await expect(page.getByText('لطفاً فیلدهای مشخص‌شده را تکمیل یا اصلاح کنید.')).toHaveCount(0);

  const title = page.getByRole('textbox', { name: 'عنوان', exact: true });
  const excerpt = page.getByRole('textbox', { name: 'خلاصه' });
  const content = page.getByRole('textbox', { name: 'محتوا' });
  await expect(title).toHaveAccessibleDescription('عنوان پست را وارد کنید.');
  await expect(excerpt).toHaveAccessibleDescription('خلاصه پست را وارد کنید.');
  await expect(content).toHaveAccessibleDescription('محتوای پست را وارد کنید.');
  await expect(excerpt).toHaveCSS('resize', 'none');
  await expect(content).toHaveCSS('resize', 'none');
  await title.fill('راهنمای ساخت آزمون');
  await expect(title).toHaveAttribute('aria-invalid', 'false');
  await expect(content).toHaveAttribute('aria-invalid', 'true');
});
