const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTypeScript(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require,
  }, { filename: file });
  return module.exports;
}

const src = path.resolve(__dirname, '../src');

test('attempt event schema accepts supported integrity signals only', () => {
  const { attemptEventSchema } = loadTypeScript(
    path.join(src, 'validation/attemptSchemas.ts'),
  );

  for (const type of ['TAB_HIDDEN', 'FULLSCREEN_EXIT', 'WINDOW_BLUR']) {
    assert.equal(attemptEventSchema.safeParse({ type }).success, true, type);
  }

  for (const type of ['CHEATING_CONFIRMED', 'WINDOW_FOCUS', '', null]) {
    assert.equal(attemptEventSchema.safeParse({ type }).success, false);
  }
});

test('audit pagination defaults, rejects invalid values and caps page size', () => {
  const { parsePagination } = loadTypeScript(
    path.join(src, 'lib/pagination.ts'),
  );

  assert.deepEqual({ ...parsePagination(undefined, undefined) }, {
    page: 1,
    pageSize: 25,
  });
  assert.deepEqual({ ...parsePagination('3', '50') }, {
    page: 3,
    pageSize: 50,
  });
  assert.deepEqual({ ...parsePagination('-1', '1000') }, {
    page: 1,
    pageSize: 100,
  });
  assert.deepEqual({ ...parsePagination('not-a-page', '0') }, {
    page: 1,
    pageSize: 25,
  });
});
