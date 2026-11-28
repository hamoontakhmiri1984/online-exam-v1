const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function createRedis() {
  const values = new Map();
  return {
    async get(key) {
      const row = values.get(key);
      if (!row) return null;
      if (row.expiresAt <= Date.now()) {
        values.delete(key);
        return null;
      }
      return row.value;
    },
    async set(key, value, options = {}) {
      values.set(key, {
        value: String(value),
        expiresAt: Date.now() + (options.EX ?? 60) * 1000,
      });
      return 'OK';
    },
    async del(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      let deleted = 0;
      for (const key of list) if (values.delete(key)) deleted++;
      return deleted;
    },
    async eval(_script, options) {
      const key = options.keys[0];
      const previous = await this.get(key);
      const next = Number(previous ?? 0) + 1;
      await this.set(key, next, { EX: Number(options.arguments[0]) });
      return next;
    },
  };
}

function loadLoginSecurity(redis) {
  const filename = path.resolve(__dirname, '../src/lib/loginSecurity.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (name) => {
        if (name === './redis') return { redis };
        if (name === './duration') {
          return {
            durationToSeconds: (value) =>
              value === '30m' ? 1800 : value === '15m' ? 900 : 60,
          };
        }
        return require(name);
      },
      Date,
      Promise,
    },
    { filename },
  );
  return module.exports;
}

test('captcha threshold is scoped to the same IP and login identity', async () => {
  const redis = createRedis();
  const { isCaptchaRequired, registerIpFailure } = loadLoginSecurity(redis);
  const sharedProxyIp = 'codespaces-proxy';
  const accountA = 'EMAIL:hamoon@example.com';
  const accountB = 'EMAIL:other@example.com';

  assert.equal(await isCaptchaRequired(sharedProxyIp, accountA), false);
  await registerIpFailure(sharedProxyIp, accountA);
  await registerIpFailure(sharedProxyIp, accountA);
  assert.equal(await isCaptchaRequired(sharedProxyIp, accountA), false);

  await registerIpFailure(sharedProxyIp, accountA);
  assert.equal(await isCaptchaRequired(sharedProxyIp, accountA), true);

  // A different person behind the same proxy must not inherit this challenge.
  assert.equal(await isCaptchaRequired(sharedProxyIp, accountB), false);

  // The same account from another IP has an independent failure scope.
  assert.equal(await isCaptchaRequired('another-ip', accountA), false);
});

test('captcha state survives a successful-login counter reset only for its own identity', async () => {
  const redis = createRedis();
  const {
    clearIpFailures,
    isCaptchaRequired,
    registerIpFailure,
  } = loadLoginSecurity(redis);
  const ip = 'shared-proxy';
  const accountA = 'PHONE:09123456789';
  const accountB = 'PHONE:09111111111';

  for (let i = 0; i < 3; i++) await registerIpFailure(ip, accountA);
  await clearIpFailures(ip, accountA);

  assert.equal(await isCaptchaRequired(ip, accountA), true);
  assert.equal(await isCaptchaRequired(ip, accountB), false);
  await registerIpFailure(ip, accountA);
  assert.equal(await isCaptchaRequired(ip, accountA), true);
});
