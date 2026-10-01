import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ApiError,
  apiMultipartRequest,
  apiRequest,
  refreshSession,
  setAuthToken,
  setOnSessionExpired,
} from '../src/lib/apiClient';
import { uploadLessonAttachment, uploadLessonVideo } from '../src/api/uploadApi';

// ---------------------------------------------------------------------------
// fetch ساختگی: هر تماس ثبت می‌شود و پاسخ از روی «مسیر» تعیین می‌شود. تست‌ها
// رفتار واقعی apiClient (refresh مشترک، retry، خطاها) را می‌سنجند، نه متن سورس.
// ---------------------------------------------------------------------------
type Call = { url: string; init: RequestInit };
type Responder = (call: Call, index: number) => Response | Promise<Response> | Error;

const realFetch = globalThis.fetch;
let calls: Call[] = [];
let expiredCount = 0;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function install(responder: Responder): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const call = { url: String(input), init };
    calls.push(call);
    const result = await responder(call, calls.length - 1);
    if (result instanceof Error) throw result;
    return result;
  }) as typeof fetch;
}

const isRefresh = (c: Call) => c.url.endsWith('/auth/refresh');
const refreshCalls = () => calls.filter(isRefresh).length;
const nonRefreshCalls = () => calls.filter((c) => !isRefresh(c));
const authOf = (c: Call) => (c.init.headers as Record<string, string> | undefined)?.Authorization;

beforeEach(() => {
  calls = [];
  expiredCount = 0;
  setAuthToken('old-token');
  setOnSessionExpired(() => {
    expiredCount += 1;
  });
});

afterEach(() => {
  globalThis.fetch = realFetch;
  setAuthToken(null);
});

function fileForm(): FormData {
  const form = new FormData();
  form.append('video', new File(['abc'], 'a.mp4', { type: 'video/mp4' }));
  return form;
}

// ---------------------------------------------------------------------------
// بازیابی نشست (refreshSession) - هر نتیجه باید درست دسته‌بندی شود
// ---------------------------------------------------------------------------
test('refreshSession: 200 با توکن => ok', async () => {
  install(() => json(200, { accessToken: 'new' }));
  assert.deepEqual(await refreshSession(), { status: 'ok', token: 'new' });
});

test('refreshSession: 401 => expired (نشست واقعاً تمام شده)', async () => {
  install(() => json(401, { error: 'x' }));
  assert.deepEqual(await refreshSession(), { status: 'expired' });
});

test('refreshSession: 429، 5xx، خطای شبکه و پاسخ خراب => unavailable (نه expired)', async () => {
  for (const make of [
    () => json(429, {}),
    () => json(500, {}),
    () => json(503, {}),
    () => new TypeError('network down'),
    () => json(200, {}),
  ]) {
    install(make);
    assert.deepEqual(await refreshSession(), { status: 'unavailable' });
  }
});

// ---------------------------------------------------------------------------
// apiRequest (JSON) - رفتار موجود نباید با refactor تغییر کند
// ---------------------------------------------------------------------------
test('apiRequest: 401 سپس refresh موفق => یک بار retry با توکن جدید', async () => {
  install((c) => {
    if (isRefresh(c)) return json(200, { accessToken: 'fresh' });
    return authOf(c) === 'Bearer fresh' ? json(200, { ok: 1 }) : json(401, { error: 'exp' });
  });
  assert.deepEqual(await apiRequest('/exams'), { ok: 1 });
  assert.equal(refreshCalls(), 1);
  assert.equal(nonRefreshCalls().length, 2);
  assert.equal(expiredCount, 0);
});

test('apiRequest: refresh با 401 => onSessionExpired و خطای 401', async () => {
  install((c) => (isRefresh(c) ? json(401, {}) : json(401, { error: 'exp' })));
  await assert.rejects(apiRequest('/exams'), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal(expiredCount, 1);
});

test('apiRequest: refresh با 429/5xx/شبکه => 503 بدون logout', async () => {
  for (const refreshReply of [() => json(429, {}), () => json(500, {}), () => new TypeError('down')]) {
    expiredCount = 0;
    install((c) => (isRefresh(c) ? refreshReply() : json(401, { error: 'exp' })));
    await assert.rejects(apiRequest('/exams'), (e: unknown) => e instanceof ApiError && e.status === 503);
    assert.equal(expiredCount, 0);
  }
});

// ---------------------------------------------------------------------------
// multipart
// ---------------------------------------------------------------------------
test('multipart: Content-Type دستی ست نمی‌شود و بدنه همان FormData است', async () => {
  install(() => json(200, { fileName: 'a', objectKey: 'k' }));
  const form = fileForm();
  await apiMultipartRequest('/uploads/video', form);
  const init = nonRefreshCalls()[0].init;
  const headers = init.headers as Record<string, string>;
  assert.equal(Object.keys(headers).some((h) => h.toLowerCase() === 'content-type'), false);
  assert.equal(init.body, form);
  assert.equal(headers.Authorization, 'Bearer old-token');
  assert.equal(init.credentials, 'include');
});

test('multipart: 401 سپس refresh موفق => دقیقاً یک retry با توکن جدید', async () => {
  install((c) => {
    if (isRefresh(c)) return json(200, { accessToken: 'fresh' });
    return authOf(c) === 'Bearer fresh' ? json(200, { fileName: 'a', objectKey: 'k' }) : json(401, { error: 'exp' });
  });
  const form = fileForm();
  const result = await apiMultipartRequest<{ objectKey: string }>('/uploads/video', form);
  assert.equal(result.objectKey, 'k');
  assert.equal(refreshCalls(), 1);
  const uploads = nonRefreshCalls();
  assert.equal(uploads.length, 2);
  assert.equal(uploads[1].init.body, form); // همان FormData دوباره فرستاده شد
  assert.equal(authOf(uploads[1]), 'Bearer fresh');
});

test('multipart: اگر بعد از retry هم 401 بیاید حلقه‌ی بی‌نهایت نداریم', async () => {
  install((c) => (isRefresh(c) ? json(200, { accessToken: 'fresh' }) : json(401, { error: 'still' })));
  await assert.rejects(
    apiMultipartRequest('/uploads/video', fileForm()),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(nonRefreshCalls().length, 2); // اولی + یک retry، نه بیشتر
  assert.equal(refreshCalls(), 1);
});

test('multipart: refresh با 401 => onSessionExpired، خطای 401 و بدون retry', async () => {
  install((c) => (isRefresh(c) ? json(401, {}) : json(401, { error: 'exp' })));
  await assert.rejects(
    apiMultipartRequest('/uploads/video', fileForm()),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(expiredCount, 1);
  assert.equal(nonRefreshCalls().length, 1);
});

test('multipart: refresh با 429/5xx/شبکه => 503، بدون logout و بدون ارسال دوباره', async () => {
  for (const refreshReply of [() => json(429, {}), () => json(502, {}), () => new TypeError('down')]) {
    calls = [];
    expiredCount = 0;
    install((c) => (isRefresh(c) ? refreshReply() : json(401, { error: 'exp' })));
    await assert.rejects(
      apiMultipartRequest('/uploads/video', fileForm()),
      (e: unknown) => e instanceof ApiError && e.status === 503,
    );
    assert.equal(expiredCount, 0);
    assert.equal(nonRefreshCalls().length, 1);
  }
});

test('multipart: خطای شبکه‌ی خود آپلود => status 0، بدون refresh و بدون ارسال دوباره', async () => {
  install(() => new TypeError('network down'));
  await assert.rejects(
    apiMultipartRequest('/uploads/video', fileForm()),
    (e: unknown) => e instanceof ApiError && e.status === 0,
  );
  assert.equal(calls.length, 1);
  assert.equal(refreshCalls(), 0);
});

test('multipart: 5xx و 429 روی خود آپلود => بدون refresh و بدون ارسال دوباره', async () => {
  for (const status of [429, 500, 503]) {
    calls = [];
    install(() => json(status, { error: `err${status}` }));
    await assert.rejects(
      apiMultipartRequest('/uploads/video', fileForm()),
      (e: unknown) => e instanceof ApiError && e.status === status && e.message === `err${status}`,
    );
    assert.equal(calls.length, 1);
    assert.equal(refreshCalls(), 0);
  }
});

test('multipart: چند آپلود هم‌زمان با 401 فقط یک refresh مشترک می‌زنند', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  install(async (c) => {
    if (isRefresh(c)) {
      await gate; // refresh را معطل نگه می‌داریم تا هر سه آپلود به 401 برسند
      return json(200, { accessToken: 'fresh' });
    }
    return authOf(c) === 'Bearer fresh' ? json(200, { fileName: 'a', objectKey: 'k' }) : json(401, { error: 'exp' });
  });
  const pending = [
    apiMultipartRequest('/uploads/video', fileForm()),
    apiMultipartRequest('/uploads/video', fileForm()),
    apiMultipartRequest('/uploads/video', fileForm()),
  ];
  await new Promise((r) => setTimeout(r, 20));
  release();
  await Promise.all(pending);
  assert.equal(refreshCalls(), 1);
  assert.equal(nonRefreshCalls().length, 6); // سه اولیه + سه retry
});

test('uploadLessonVideo / uploadLessonAttachment: مسیر و نام فیلد درست و از همان منطق مشترک', async () => {
  install((c) => {
    if (isRefresh(c)) return json(200, { accessToken: 'fresh' });
    return authOf(c) === 'Bearer fresh' ? json(200, { fileName: 'f', objectKey: 'k', fileSize: 3 }) : json(401, {});
  });
  const video = new File(['v'], 'v.mp4', { type: 'video/mp4' });
  const pdf = new File(['p'], 'p.pdf', { type: 'application/pdf' });
  await uploadLessonVideo(video);
  await uploadLessonAttachment(pdf);

  const uploads = nonRefreshCalls();
  const videoCall = uploads.find((c) => c.url.endsWith('/uploads/video'))!;
  const attachmentCall = uploads.find((c) => c.url.endsWith('/uploads/attachment'))!;
  assert.ok((videoCall.init.body as FormData).has('video'));
  assert.ok((attachmentCall.init.body as FormData).has('attachment'));
});