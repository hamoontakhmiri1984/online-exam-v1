import { expect, test } from '@playwright/test';

test('instructor selects questions across banks, samples by difficulty, publishes and edits the practice', async ({ page }) => {
  const teacher = { id: 'teacher', role: 'Instructor', name: 'مدرس', onboardingCompleted: true };
  const group = { id: 'group', name: 'گروه ریاضی', instructorId: teacher.id, studentIds: [], approvalStatus: 'Approved' };
  const banks = [{ id: 'bank-a', name: 'بانک اول' }, { id: 'bank-b', name: 'بانک دوم' }];
  const manual = [
    { id: 'manual-a', bankId: 'bank-a', text: 'سؤال دستی آسان', difficulty: 'Easy' },
    { id: 'manual-b', bankId: 'bank-b', text: 'سؤال دستی سخت', difficulty: 'Hard' },
  ];
  const sample = Object.entries({ Easy: 10, Medium: 5, Hard: 5 }).flatMap(([difficulty, count]) =>
    Array.from({ length: count }, (_, index) => ({
      id: `sample-${difficulty}-${index}`,
      bankId: banks[index % 2].id,
      text: `نمونه ${difficulty} ${index}`,
      difficulty,
    })),
  );
  const practice = {
    id: 'practice-1', title: 'تمرین ترکیبی', description: '', groups: [group],
    status: 'Draft', publishedAt: null as string | null, questionCount: 22, instructorName: teacher.name,
  };
  const paged = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 100 });
  let samples = 0;
  let savedEdit = false;
  let getDetails = 0;

  await page.route('http://127.0.0.1:4109/**', route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path === '/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture-token' } });
    if (path === '/auth/me') return route.fulfill({ json: teacher });
    if (path === '/groups') return route.fulfill({ json: paged([group]) });
    if (path === '/banks') return route.fulfill({ json: paged(banks) });
    if (path === '/banks/bank-a/questions') return route.fulfill({ json: paged([manual[0]]) });
    if (path === '/banks/bank-b/questions') return route.fulfill({ json: paged([manual[1]]) });
    if (path === '/practice/random-questions') {
      const body = route.request().postDataJSON();
      expect(body.bankIds).toEqual(['bank-a', 'bank-b']);
      expect(body.excludeQuestionIds).toEqual(['manual-a', 'manual-b']);
      samples += 1;
      if (samples === 1) {
        expect(body.counts).toEqual({ Easy: 10, Medium: 5, Hard: 6 });
        return route.fulfill({ status: 400, json: { error: 'سؤال سخت کافی نیست.' } });
      }
      expect(body.counts).toEqual({ Easy: 10, Medium: 5, Hard: 5 });
      return route.fulfill({ json: sample });
    }
    if (path === '/practice' && method === 'POST') {
      expect(route.request().postDataJSON().questionIds).toEqual([...manual, ...sample].map(q => q.id));
      return route.fulfill({ status: 201, json: { id: practice.id } });
    }
    if (path === '/practice/practice-1/status') {
      expect(route.request().postDataJSON().status).toBe('Published');
      practice.status = 'Published';
      practice.publishedAt = '2026-11-11T10:00:00Z';
      return route.fulfill({ json: { id: practice.id, status: practice.status, publishedAt: practice.publishedAt } });
    }
    if (path === '/practice/practice-1' && method === 'PUT') {
      const input = route.request().postDataJSON();
      expect(input.questionIds).toBeUndefined();
      practice.title = input.title;
      savedEdit = true;
      return route.fulfill({ json: { id: practice.id } });
    }
    if (path === '/practice/practice-1') {
      getDetails += 1;
      return route.fulfill({ json: practice });
    }
    if (path === '/practice/practice-1/questions') {
      return route.fulfill({ json: paged([]) });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto('/practice/new');
  await page.getByRole('textbox', { name: 'نام تمرین' }).fill(practice.title);
  await expect(page.getByRole('checkbox', { name: /سؤال دستی آسان.*آسان/ })).toBeVisible();
  await page.getByText(manual[0].text, { exact: true }).click();
  await page.getByRole('combobox', { name: 'بانک سؤال', exact: true }).click();
  await page.getByRole('option', { name: 'بانک دوم', exact: true }).click();
  await page.getByText(manual[1].text, { exact: true }).click();
  await page.getByText('انتخاب تصادفی از چند بانک', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'بانک دوم', exact: true }).check();
  await page.getByRole('spinbutton', { name: 'آسان' }).fill('10');
  await page.getByRole('spinbutton', { name: 'متوسط' }).fill('5');
  await page.getByRole('spinbutton', { name: 'سخت' }).fill('6');
  const randomize = page.getByRole('button', { name: 'افزودن سؤال‌های تصادفی' });
  await randomize.click();
  await expect(page.getByRole('alert')).toContainText('سؤال سخت کافی نیست.');
  await expect(page.getByText('۲ سؤال انتخاب شده', { exact: true })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'سخت' }).fill('5');
  await randomize.click();
  await expect(page.getByText('۲۲ سؤال انتخاب شده', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'گروه ریاضی' }).check();
  await page.getByRole('button', { name: 'ذخیره و بازبینی' }).click();

  await expect(page.getByRole('heading', { name: practice.title })).toBeVisible();
  const requestsBeforePublish = getDetails;
  await page.getByRole('button', { name: 'انتشار برای گروه‌های انتخاب‌شده' }).click();
  await expect(page.getByRole('button', { name: 'توقف دسترسی به تمرین' })).toBeVisible();
  expect(getDetails).toBe(requestsBeforePublish);
  await page.getByRole('link', { name: 'ویرایش مشخصات و دسترسی' }).click();
  await expect(page.getByText('سؤال‌های این مجموعه ثابت هستند')).toBeVisible();
  await page.getByRole('textbox', { name: 'نام تمرین' }).fill('تمرین ترکیبی ویرایش‌شده');
  await page.getByRole('button', { name: 'ذخیره و بازبینی' }).click();
  await expect(page.getByRole('heading', { name: 'تمرین ترکیبی ویرایش‌شده' })).toBeVisible();
  expect(savedEdit).toBe(true);
});
