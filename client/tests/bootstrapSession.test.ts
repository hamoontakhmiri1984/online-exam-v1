import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapSession, clearSession, getCurrentUser, setCurrentUser } from '../src/api/auth/auth.session';
import { getAuthToken, setAuthToken } from '../src/lib/apiClient';
import { resolveAccess } from '../src/components/ProtectedRoute/resolveAccess';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const user = { id: 'teacher', role: 'Instructor' as const, onboardingCompleted: true };
let calls: string[];
function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
function install(refresh: Response | Error, me: Response | Error = response(200, user)) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input); calls.push(url);
    const result = url.endsWith('/auth/refresh') ? refresh : me;
    if (result instanceof Error) throw result;
    return result.clone();
  }) as typeof fetch;
}
beforeEach(() => {
  calls = [];
  globalThis.window = { location: { href: '/dashboard' } } as unknown as Window & typeof globalThis;
  setCurrentUser(user); setAuthToken('old-token');
});
afterEach(() => {
  clearSession(); globalThis.fetch = originalFetch; globalThis.window = originalWindow;
});
for (const status of [401]) {
  test(`bootstrap: refresh ${status} clears the session`, async () => {
    install(response(status));
    assert.deepEqual(await bootstrapSession(), { status: 'anonymous' });
    assert.equal(getCurrentUser(), null); assert.equal(getAuthToken(), null);
    assert.equal(calls.length, 1);
  });
}
for (const failure of [new TypeError('offline'), response(403), response(429), response(500), response(503)]) {
  test(`bootstrap: temporary refresh failure ${failure instanceof Error ? 'network' : failure.status}`, async () => {
    install(failure);
    assert.deepEqual(await bootstrapSession(), { status: 'unavailable' });
    assert.equal(getAuthToken(), null); assert.equal(window.location.href, '/dashboard');
    assert.equal(calls.length, 1);
    install(response(200, { accessToken: 'retry-token' }));
    assert.equal((await bootstrapSession()).status, 'authenticated');
    assert.equal(getAuthToken(), 'retry-token');
    assert.equal(getCurrentUser()?.id, user.id);
  });
}
for (const failure of [new TypeError('offline'), response(429), response(500), response(503)]) {
  test(`bootstrap: successful refresh but temporary /me failure ${failure instanceof Error ? 'network' : failure.status}`, async () => {
    install(response(200, { accessToken: 'fresh-token' }), failure);
    assert.deepEqual(await bootstrapSession(), { status: 'unavailable' });
    assert.equal(getAuthToken(), null); assert.equal(window.location.href, '/dashboard');
    install(response(200, { accessToken: 'retry-token' }));
    const recovered = await bootstrapSession();
    assert.equal(recovered.status, 'authenticated');
    assert.equal(getCurrentUser()?.id, user.id); assert.equal(getAuthToken(), 'retry-token');
    assert.deepEqual(resolveAccess({ user: getCurrentUser(), isSessionReady: true, isSessionUnavailable: false }), { kind: 'allow' });
  });
}
for (const status of [401, 403]) {
  test(`bootstrap: /me ${status} ends the session after refresh`, async () => {
    install(response(200, { accessToken: 'fresh-token' }), response(status));
    assert.deepEqual(await bootstrapSession(), { status: 'anonymous' });
    assert.equal(getCurrentUser(), null); assert.equal(getAuthToken(), null);
  });
}
