import { expect, test } from '@playwright/test';

const member = { id: 'member', name: 'علی علوی', role: 'Student', onboardingCompleted: true };
const practice = {
  id: 'review', title: 'تمرین ریاضی', description: '', status: 'Published',
  questionCount: 26, groups: [], publishedAt: null, instructorName: null,
};
const questions = Array.from({ length: 26 }, (_, position) => ({
  id: `question-${position + 1}`, position, text: `تمرین شماره ${position + 1}`,
  options: ['الف', 'ب'], difficulty: 'Easy',
}));
const bank = { id: 'bank', name: 'بانک ریاضی', category: 'ریاضی', questionCount: 0 };
const exam = { id: 'exam', title: 'آزمون ریاضی', category: 'ریاضی', status: 'draft', participants: 0, durationMinutes: 20 };

test('settings tabs open one panel and retain an unfinished profile edit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('http://127.0.0.1:4109/**', route => {
    switch (new URL(route.request().url()).pathname) {
      case '/auth/refresh': return route.fulfill({ json: { accessToken: 'fixture-token' } });
      case '/auth/me': return route.fulfill({ json: member });
      default: return route.fulfill({ json: [] });
    }
  });
  await page.goto('/settings');
  const tabs = page.getByRole('tablist', { name: 'بخش‌های تنظیمات' });
  const profile = tabs.getByRole('tab', { name: 'پروفایل' });
  const security = tabs.getByRole('tab', { name: 'امنیت' });
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  const name = page.getByPlaceholder('نام و نام خانوادگی');
  await name.fill('علی علوی‌نیا');
  await profile.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(security).toBeFocused();
  await expect(security).toHaveAttribute('aria-selected', 'true');
  await expect(name).toBeHidden();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await profile.click();
  await expect(name).toHaveValue('علی علوی‌نیا');
  await expect(tabs.getByRole('tab', { name: 'گروه‌ها' })).toBeVisible();
});

for (const role of ['Student', 'Instructor']) {
  test(`practice footer follows the ${role} across question page boundaries`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('http://127.0.0.1:4109/**', route => {
      const url = new URL(route.request().url());
      switch (url.pathname) {
        case '/auth/refresh': return route.fulfill({ json: { accessToken: 'fixture-token' } });
        case '/auth/me': return route.fulfill({ json: { ...member, role, approvalStatus: 'Approved' } });
        case '/practice/review': return route.fulfill({ json: practice });
        case '/practice/review/questions': {
          const page = Number(url.searchParams.get('page') ?? 1);
          const pageSize = 25;
          return route.fulfill({ json: { items: questions.slice((page - 1) * pageSize, page * pageSize), total: questions.length, page, pageSize } });
        }
        default: return route.fulfill({ json: [] });
      }
    });
    await page.goto('/practice/review');
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: /^تمرین شماره/ }) });
    const nav = card.getByRole('navigation', { name: 'حرکت بین سؤال‌ها' });
    const prev = nav.getByRole('button', { name: 'سؤال قبلی' });
    const next = nav.getByRole('button', { name: 'سؤال بعدی' });
    await expect(prev).toBeDisabled();
    const counter = nav.getByText('سؤال ۱ از ۲۶');
    await expect(counter).toBeVisible();
    const [prevBox, nextBox, counterBox] = await Promise.all([
      prev.boundingBox(), next.boundingBox(), counter.boundingBox(),
    ]);
    expect(prevBox && nextBox && counterBox && nextBox.x < prevBox.x && prevBox.x < counterBox.x).toBe(true);
    expect(prevBox && nextBox && Math.abs(prevBox.y - nextBox.y)).toBeLessThan(1);
    await page.getByRole('button', { name: 'رفتن به سؤال 25', exact: true }).click();
    await next.click();
    await expect(card.getByRole('heading', { name: 'تمرین شماره 26' })).toBeVisible();
    await expect(next).toBeDisabled();
    await prev.click();
    await expect(card.getByRole('heading', { name: 'تمرین شماره 25' })).toBeVisible();
  });
}

test('exam and question-bank Excel buttons open their import dialogs', async ({ page }) => {
  await page.route('http://127.0.0.1:4109/**', route => {
    switch (new URL(route.request().url()).pathname) {
      case '/auth/refresh': return route.fulfill({ json: { accessToken: 'fixture-token' } });
      case '/auth/me': return route.fulfill({ json: { ...member, role: 'Instructor', approvalStatus: 'Approved' } });
      case '/banks/bank': return route.fulfill({ json: bank });
      case '/banks/bank/questions': return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 25 } });
      case '/exams/exam': return route.fulfill({ json: exam });
      default: return route.fulfill({ json: [] });
    }
  });
  for (const path of ['/question-banks/bank', '/exams/exam/questions']) {
    await page.goto(path);
    const button = page.getByRole('button', { name: 'ورود از اکسل', exact: true });
    await expect(button).toHaveCSS('border-top-style', 'solid');
    await button.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('input[type=file]')).toBeAttached();
  }
});
