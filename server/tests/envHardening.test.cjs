const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/config/env.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const base = { DATABASE_URL: 'postgresql://test:test@localhost/test', REDIS_URL: 'redis://localhost:6379', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40) };
const prod = { ...base, NODE_ENV: 'production', ZARINPAL_SANDBOX: 'false', ZARINPAL_MERCHANT_ID: 'real-merchant', CLIENT_URL: 'https://exam.example.com', S3_ACCESS_KEY_ID: 'real-access', S3_SECRET_ACCESS_KEY: 'real-secret' };
function parse(env) {
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, process: { env }, URL, require: name => name === 'dotenv' ? { config() {} } : name.endsWith('/logger') ? { logEvent() {} } : require(name) });
  return module.exports.env;
}
test('Google is optional in development and production', () => {
  assert.equal(parse(base).GOOGLE_CLIENT_ID, ''); assert.equal(parse(prod).GOOGLE_CLIENT_ID, '');
});
for (const CLIENT_URL of ['http://example.com', 'https://localhost', 'https://localhost.', 'https://[::]', 'https://[::ffff:127.0.0.1]', 'https://app.localhost', 'https://127.0.0.1', 'https://[::1]', 'https://0.0.0.0', 'https://user:secret@example.com', 'not-a-url']) {
  test(`production rejects unsafe CLIENT_URL ${CLIENT_URL}`, () => assert.throws(() => parse({ ...prod, CLIENT_URL })));
}
for (const key of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
  test(`production rejects missing/default ${key}`, () => {
    for (const value of [undefined, '', 'minioadmin', ' MINIOADMIN ']) assert.throws(() => parse({ ...prod, [key]: value }));
  });
}
