// اجرای تست‌های فرانت (client/tests/*.test.ts) بدون وابستگی جدید: با esbuild
// (که vite از قبل نصبش می‌کنه) هر تست به یه فایل CJS موقت bundle و با
// `node --test` اجرا می‌شه. اگه هیچ تستی پیدا نشه یا اجرا fail بشه، exit code
// غیرصفره.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'tests');
const outDir = path.join(root, '.test-dist');

const names = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts'));
if (names.length === 0) {
  console.error('هیچ فایل تستی در client/tests پیدا نشد');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
let status = 1;
try {
  await build({
    entryPoints: names.map((n) => path.join(testsDir, n)),
    outdir: outDir,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    logLevel: 'error',
    // تست‌ها JSX و import.meta.env (vite) دارن؛ خارج از vite باید صریحاً تعریف بشن
    jsx: 'automatic',
    define: { 'import.meta.env': '{}' },
  });
  const files = names.map((n) => path.join(outDir, n.replace(/\.ts$/, '.cjs')));
  status = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' }).status ?? 1;
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
process.exit(status);