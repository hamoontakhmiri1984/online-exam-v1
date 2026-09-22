const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Date,
    require(name) { if (name in mocks) return mocks[name]; throw Error(name); },
  });
  return module.exports;
}

function setup() {
  const rows = [], locks = new Map();
  let digit = 0, afterCompare = () => {}, failCreate = false;
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object') {
      if ('lt' in value) return row[key] < value.lt;
      if ('gt' in value) return row[key] > value.gt;
    }
    return row[key] === value;
  });
  const otpCode = {
    async updateMany({ where, data }) {
      const selected = rows.filter(row => matches(row, where));
      for (const row of selected) for (const [key, value] of Object.entries(data)) {
        row[key] = value?.increment ? row[key] + value.increment : value;
      }
      return { count: selected.length };
    },
    async create({ data }) {
      if (failCreate) throw Error('insert failed');
      const row = { ...data, id: String(rows.length), attempts: 0, consumedAt: null, userId: null };
      rows.push(row); return row;
    },
    async findFirst({ where }) { const row = rows.filter(r => matches(r, where)).at(-1); return row && { ...row }; },
  };
  const prisma = { otpCode, async $transaction(fn, options) {
    assert.equal(options.isolationLevel, 'ReadCommitted');
    let release, snapshot;
    try {
      return await fn({ otpCode, async $executeRaw(sql, key) {
        assert.match(sql.join('?'), /pg_advisory_xact_lock/);
        const previous = locks.get(key) || Promise.resolve();
        locks.set(key, new Promise(resolve => { release = resolve; }));
        await previous;
        snapshot = rows.map(r => ({ ...r }));
      } });
    } catch (error) { if (snapshot) rows.splice(0, rows.length, ...snapshot); throw error; }
    finally { release?.(); }
  } };
  const store = load('otpStore.ts', { './prisma': { prisma }, '@prisma/client': {
    Prisma: { TransactionIsolationLevel: { ReadCommitted: 'ReadCommitted' } },
  } });
  const api = load('otp.ts', { './prisma': { prisma }, './otpStore': store,
    'node:crypto': { randomInt: () => (digit++ % 10) },
    bcrypt: { hash: async code => code, compare: async (code, hash) => { await afterCompare(); return code === hash; } },
  });
  const params = { identifier: 'test@example.com', purpose: 'LOGIN', channel: 'EMAIL' };
  return { api, rows, params, setCompare: fn => { afterCompare = fn; }, fail: () => { failCreate = true; } };
}

test('concurrent issuance leaves one active code; old code never returns after consumption', async () => {
  const { api, rows, params } = setup();
  await Promise.all(Array.from({ length: 8 }, () => api.createOtp(params)));
  assert.equal(rows.filter(r => !r.consumedAt).length, 1);
  const active = rows.find(r => !r.consumedAt);
  assert.equal((await api.verifyOtp({ ...params, code: active.codeHash })).ok, true);
  for (const row of rows) assert.equal((await api.verifyOtp({ ...params, code: row.codeHash })).ok, false);
});

test('parallel verification accepts a correct code only once', async () => {
  const { api, params } = setup(); const { code } = await api.createOtp(params);
  const results = await Promise.all(Array.from({ length: 10 }, () => api.verifyOtp({ ...params, code })));
  assert.equal(results.filter(r => r.ok).length, 1);
});

test('parallel guesses cannot exceed the attempt budget', async () => {
  const { api, rows, params } = setup(); await api.createOtp(params);
  await Promise.all(Array.from({ length: 20 }, () => api.verifyOtp({ ...params, code: 'wrong' })));
  assert.equal(rows[0].attempts, 5);
  assert.equal((await api.verifyOtp({ ...params, code: rows[0].codeHash })).reason, 'too_many_attempts');
});

test('expiry during comparison prevents consumption', async () => {
  const { api, rows, params, setCompare } = setup(); const { code } = await api.createOtp(params);
  setCompare(() => { rows[0].expiresAt = new Date(0); });
  assert.equal((await api.verifyOtp({ ...params, code })).ok, false);
});

test('replacement during comparison invalidates the old verification', async () => {
  const { api, params, setCompare } = setup(); const { code } = await api.createOtp(params);
  setCompare(() => api.createOtp(params));
  assert.equal((await api.verifyOtp({ ...params, code })).ok, false);
});

test('different purposes remain independent', async () => {
  const { api, rows, params } = setup();
  await api.createOtp(params); await api.createOtp({ ...params, purpose: 'REGISTER' });
  assert.equal(rows.filter(r => !r.consumedAt).length, 2);
});

test('failed replacement rolls back invalidation', async () => {
  const { api, rows, params, fail } = setup(); await api.createOtp(params); fail();
  await assert.rejects(api.createOtp(params), /insert failed/);
  assert.equal(rows.filter(r => !r.consumedAt).length, 1);
});
