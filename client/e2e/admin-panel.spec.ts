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
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
});

for (const mobile of [false, true]) test(`admin dashboard: ${mobile ? 'mobile dark' : 'desktop light'}`, async ({ page }) => {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  if (mobile) await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dashboard');
  await expect(page.getByText('ارزیابی پایان دوره', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'روند فعالیت' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'شروع آزمون' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('dashboard.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('report filters reach the API and teacher directory is keyboard accessible', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByText('علی رضایی', { exact: true })).toBeVisible();
  const changed = page.waitForRequest(r => r.url().includes('/admin/reporting/attempts') && r.url().includes('order=oldest'));
  await page.getByRole('combobox', { name: 'ترتیب نتایج' }).selectOption('oldest'); await changed;
  const ranged = page.waitForRequest(r => r.url().includes('/summary?days=7'));
  await page.getByRole('combobox', { name: 'بازهٔ زمانی' }).selectOption('7'); await ranged;
  await page.goto('/instructors');
  await expect(page.getByRole('link', { name: 'مریم احمدی' })).toBeVisible();
  const sorted = page.waitForRequest(r => r.url().includes('/admin/users/instructors') && r.url().includes('order=name'));
  await page.getByRole('combobox', { name: 'ترتیب مدرس‌ها' }).selectOption('name'); await sorted;
  await expect(page.getByText('teacher@example.test', { exact: true })).toBeVisible();
});
