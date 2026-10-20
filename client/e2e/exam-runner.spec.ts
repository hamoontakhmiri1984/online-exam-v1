import { test, expect } from '@playwright/test';

for (const temporaryFailure of [false, true]) test(`student answers survive reload and submission ${temporaryFailure ? 'retry' : 'success'}`, async ({ page }) => {
  const now = new Date();
  const timing = { startedAt: now.toISOString(), expiresAt: new Date(+now + 600000).toISOString(), serverNow: now.toISOString() };
  let started = false;
  let answers: Record<string, number> = {};
  let revision = 0;
  let finishCount = 0;
  await page.route('http://127.0.0.1:4109/**', async route => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    let status = 200;
    switch (url.pathname) {
      case '/auth/refresh': body = { accessToken: 'student-token' }; break;
      case '/auth/me': body = { id: 'student', role: 'Student', name: 'دانشجو', onboardingCompleted: true }; break;
      case '/exams/exam': body = { id: 'exam', title: 'آزمون تمرینی رابط', category: 'General', groupIds: [], date: new Date(+now - 60000).toISOString(), durationMinutes: 10, status: 'upcoming', participants: 1, allowReview: true }; break;
      case '/exams/exam/questions/count': body = { count: 1 }; break;
      case '/exams/exam/questions': body = [{ id: 'question', examId: 'exam', text: 'حاصل دو به اضافه دو؟', options: ['سه', 'چهار'] }]; break;
      case '/exams/exam/attempts/start': started = true; body = timing; break;
      case '/exams/exam/attempts/me':
        status = started ? 200 : 404;
        body = started ? { id: 'attempt', examId: 'exam', studentId: 'student', ...timing, answers, answersRevision: revision, finishedAt: null, correctCount: 0, totalQuestions: 1, endedByTimeout: false } : { error: 'not started' }; break;
      case '/exams/exam/attempts/answers': {
        const data = route.request().postDataJSON(); answers = data.answers; revision = data.revision;
        body = { saved: true, revision }; break;
      }
      case '/exams/exam/attempts/finish':
        finishCount++;
        expect(route.request().postDataJSON().answers).toEqual({ question: 1 });
        body = { id: 'attempt', examId: 'exam', studentId: 'student', ...timing, answers, finishedAt: new Date().toISOString(), correctCount: 1, totalQuestions: 1, endedByTimeout: false };
        if (temporaryFailure && finishCount === 1) { status = 503; body = { error: 'temporarily unavailable' }; }
        break;
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/exams/exam/take');
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  await page.getByRole('button', { name: 'بله، شروع کن', exact: true }).click();
  await page.getByRole('button', { name: /چهار/ }).click();
  await expect.poll(() => answers).toEqual({ question: 1 });
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  // Re-enter the existing attempt: the server retains its original deadline.
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  await page.getByRole('button', { name: 'بله، شروع کن', exact: true }).click();
  await expect(page.getByText('حاصل دو به اضافه دو؟')).toBeVisible();
  await expect(page.getByRole('button', { name: 'شروع آزمون', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /چهار/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'مرور و پایان آزمون' }).click();
  await page.getByRole('button', { name: 'ثبت نهایی و مشاهده‌ی نمره' }).click();
  if (temporaryFailure) {
    await expect(page.getByText(/ثبت نتیجه‌ی آزمون با خطا مواجه شد/)).toBeVisible();
    await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  }
  await expect(page.getByText('۱ پاسخ درست از ۱ سوال')).toBeVisible();
  expect(finishCount).toBe(temporaryFailure ? 2 : 1);
});
