const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.join(__dirname, '../src', file);
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      Date,
      require: (name) => {
        if (!(name in mocks)) throw Error(name);
        return mocks[name];
      },
    },
    { filename },
  );
  return module.exports;
}
const errors = load('lib/errors.ts');
function setup({
  user = null,
  approval = true,
  verified = true,
  invalidToken = false,
  dbFailure = false,
} = {}) {
  let stored = user && {
    email: 'user@example.com',
    googleId: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    role: 'Student',
    approvalStatus: 'Approved',
    passwordHash: 'old',
    ...user,
  };
  const calls = { created: 0, issued: 0, verified: 0, updated: 0 };
  const db = {
    $queryRaw: async () => [],
    user: {
      findUnique: async ({ where }) =>
        stored?.googleId === where.googleId ? stored : null,
      findFirst: async () => stored,
      findUniqueOrThrow: async () => stored,
      create: async ({ data }) => {
        calls.created++;
        stored = { id: 'new', ...data };
        return stored;
      },
      update: async ({ data }) => {
        calls.updated++;
        stored = { ...stored, ...data };
        return stored;
      },
    },
  };
  const service = load('routes/auth/google/google.service.ts', {
    'google-auth-library': {
      OAuth2Client: class {
        async verifyIdToken({ audience }) {
          calls.verified++;
          assert.equal(audience, 'client-id');
          if (invalidToken) throw Error('invalid');
          return {
            getPayload: () => ({
              sub: 'google-1',
              email: 'USER@example.com',
              email_verified: verified,
            }),
          };
        }
      },
    },
    '../../../config/env': { env: { GOOGLE_CLIENT_ID: 'client-id' } },
    '../../../lib/prisma': {
      prisma: {
        $transaction: async (fn) => {
          if (dbFailure) throw Error('database unavailable');
          return fn(db);
        },
      },
    },
    '../../../lib/approvalPolicy': {
      readCreationPolicy: async () => ({ requireInstructorApproval: approval }),
    },
    '../../../lib/authTokens': {
      issueTokenPair: async () => {
        calls.issued++;
        return {
          accessToken: 'access',
          refreshToken: 'refresh',
          sid: 'session',
        };
      },
    },
    '../../../realtime/socket': { forceLogoutOtherSessions() {} },
    '../../../lib/errors': errors,
    '../auth.helpers': {
      serializeMe: (user) => user,
      instructorApprovalBlockMessage: (user) =>
        user.role === 'Instructor' && user.approvalStatus !== 'Approved'
          ? 'منتظر تأیید'
          : null,
    },
  });
  return { service, calls, user: () => stored };
}
test('new Google identity requires explicit registration; token is verified again and email comes from Google', async () => {
  const s = setup();
  assert.equal(
    (await s.service.loginWithGoogle('token')).type,
    'registration_required',
  );
  assert.equal(s.calls.created, 0);
  assert.equal(s.calls.issued, 0);
  assert.equal(
    (
      await s.service.loginWithGoogle('token', {
        role: 'Student',
        name: 'Student',
      })
    ).type,
    'authenticated',
  );
  assert.equal(s.calls.verified, 2);
  assert.equal(s.user().email, 'user@example.com');
  assert.equal(s.user().role, 'Student');
  assert.ok(s.user().emailVerifiedAt);
});
for (const approval of [true, false])
  test(`Google instructor registration respects approval policy: ${approval}`, async () => {
    const s = setup({ approval });
    const result = await s.service.loginWithGoogle('token', {
      role: 'Instructor',
      name: 'Teacher',
    });
    assert.equal(result.type, approval ? 'pending' : 'authenticated');
    assert.equal(s.calls.issued, approval ? 0 : 1);
  });
test('existing account role/rejection cannot be changed through Google registration', async () => {
  const s = setup({
    user: {
      id: 'existing',
      role: 'Instructor',
      approvalStatus: 'Rejected',
      emailVerifiedAt: new Date(),
    },
  });
  assert.equal(
    (
      await s.service.loginWithGoogle('token', {
        role: 'Student',
        name: 'Other',
      })
    ).type,
    'pending',
  );
  assert.equal(s.user().role, 'Instructor');
  assert.equal(s.user().approvalStatus, 'Rejected');
  assert.equal(s.calls.issued, 0);
});
test('Google claims from an unverified or invalid token never create accounts', async () => {
  for (const options of [{ verified: false }, { invalidToken: true }]) {
    const s = setup(options);
    await assert.rejects(
      s.service.loginWithGoogle('bad', { role: 'Student', name: 'User' }),
    );
    assert.equal(s.calls.created, 0);
  }
});
test('Google verification clears a pre-registration password, preserves a verified password, rejects foreign Google IDs', async () => {
  const unverified = setup({ user: { id: 'u' } });
  await unverified.service.loginWithGoogle('token');
  assert.equal(unverified.user().passwordHash, null);
  const verified = setup({ user: { id: 'u', emailVerifiedAt: new Date() } });
  await verified.service.loginWithGoogle('token');
  assert.equal(verified.user().passwordHash, 'old');
  const foreign = setup({ user: { id: 'u', googleId: 'other' } });
  await assert.rejects(
    foreign.service.loginWithGoogle('token'),
    (e) => e.statusCode === 403,
  );
  assert.equal(foreign.calls.issued, 0);
});
test('Google registration schema rejects admin role and invalid profile input', () => {
  const { googleAuthSchema } = load('validation/authSchemas.ts', {
    zod: require('zod'),
    '../lib/password': { PASSWORD_REGEX: /^(?=.*[A-Za-z])(?=.*\d).{6,}$/ },
  });
  for (const registration of [
    { role: 'SuperAdmin', name: 'Admin' },
    { role: 'Student', name: '' },
    { role: 'Student', name: 'a'.repeat(101) },
  ])
    assert.equal(
      googleAuthSchema.safeParse({ idToken: 'valid-token', registration })
        .success,
      false,
    );
});
