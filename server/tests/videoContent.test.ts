import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import express, { type Request, type Response } from 'express';
import { videoUpload } from '../src/lib/videoUpload';
import { validateVideoContent } from '../src/lib/videoContent';
import { detectUploadedMime, validateUploadedFile } from '../src/lib/uploadValidation';
import { AppError } from '../src/lib/errors';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-validation-'));
const files: Record<string, string> = {};
const bad = (err: unknown) => err instanceof AppError && err.statusCode === 400;
before(() => {
  for (const [ext, codec] of [['mp4', 'mpeg4'], ['mov', 'mpeg4'], ['webm', 'libvpx'], ['mkv', 'ffv1'], ['ogg', 'libtheora']]) {
    const file = path.join(dir, `sample.${ext}`);
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=5', '-t', '0.4', '-c:v', codec, '-threads', '1', file]);
    files[ext] = file;
  }
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('ویدیو: MP4/MOV/WebM/MKV/Ogg واقعی با فریم قابل‌خواندن پذیرفته می‌شوند', async () => {
  for (const [ext, mime] of [['mp4', 'video/mp4'], ['mov', 'video/quicktime'], ['webm', 'video/webm'], ['mkv', 'video/x-matroska'], ['ogg', 'video/ogg']]) {
    const file = files[ext];
    assert.equal(await detectUploadedMime('video', { path: file, size: fs.statSync(file).size, mimetype: 'video/mp4' }), mime);
  }
});

test('ویدیو: هدر معتبرِ تنها، فایل ناقص و صوت با محفظهٔ MP4 رد می‌شوند', async () => {
  const fake = path.join(dir, 'fake.mp4');
  fs.writeFileSync(fake, fs.readFileSync(files.mp4).subarray(0, 32));
  await assert.rejects(validateVideoContent(fake), bad);
  const truncated = path.join(dir, 'truncated.mp4');
  const original = fs.readFileSync(files.mp4); fs.writeFileSync(truncated, original.subarray(0, Math.floor(original.length / 2)));
  await assert.rejects(validateVideoContent(truncated), bad);
  const audio = path.join(dir, 'audio.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '0.2', '-c:a', 'aac', audio]);
  await assert.rejects(validateVideoContent(audio), bad);
});

test('ویدیو: نام فایل دارای فاصله و نویسه‌های shell بدون اجرای shell بررسی می‌شود', async () => {
  const file = path.join(dir, 'درس $(touch injected).mp4'); fs.copyFileSync(files.mp4, file);
  await assert.doesNotReject(validateVideoContent(file));
  assert.equal(fs.existsSync(path.join(dir, 'injected')), false);
});

test('ویدیو: نبودن ffprobe پاسخ 503 می‌دهد؛ timeout ظرفیت را آزاد می‌کند', async () => {
  await assert.rejects(validateVideoContent(files.mp4, { binary: path.join(dir, 'missing-ffprobe') }), (err: unknown) => err instanceof AppError && err.statusCode === 503);
  await assert.rejects(validateVideoContent(files.mp4, { timeoutMs: 1 }), bad);
  await assert.doesNotReject(validateVideoContent(files.mp4));
});

test('ویدیو: فقط دو بررسی هم‌زمان؛ درخواست سوم 503 می‌گیرد', async () => {
  const result = await Promise.allSettled(Array.from({ length: 3 }, () => validateVideoContent(files.mp4)));
  assert.equal(result[0].status, 'fulfilled'); assert.equal(result[1].status, 'fulfilled');
  assert.equal(result[2].status, 'rejected');
  if (result[2].status === 'rejected') assert.equal(result[2].reason.statusCode, 503);
});

test('middleware: ویدیوی دارای هدر جعلی رد و فایل موقت حذف می‌شود', async () => {
  const file = path.join(dir, 'middleware.tmp');
  fs.writeFileSync(file, fs.readFileSync(files.mp4).subarray(0, 32));
  let error: unknown;
  const req = { file: { path: file, size: fs.statSync(file).size, mimetype: 'video/mp4' } } as unknown as Request;
  await validateUploadedFile('video')(req, {} as Response, err => { error = err; });
  assert.ok(bad(error)); assert.equal(fs.existsSync(file), false);
});


test('HTTP ویدیو: قبل از ذخیره بررسی می‌شود و فایل موقت در موفقیت و شکست باقی نمی‌ماند', async t => {
  const app = express();
  const paths: string[] = [];
  let saved = 0;
  app.post('/video', videoUpload.single('video'), (req, _res, next) => { paths.push(req.file!.path); next(); }, validateUploadedFile('video'), (req, res) => {
    saved++; fs.unlinkSync(req.file!.path); res.status(201).end();
  });
  app.use((err: AppError, _req: Request, res: Response, _next: unknown) => res.status(err.statusCode || 500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address() as { port: number };
  async function send(buffer: Buffer) {
    const body = new FormData(); body.append('video', new Blob([buffer], { type: 'video/mp4' }), 'lesson.mp4');
    return fetch(`http://127.0.0.1:${address.port}/video`, { method: 'POST', body });
  }
  const valid = fs.readFileSync(files.mp4);
  assert.equal((await send(valid.subarray(0, 32))).status, 400); assert.equal(saved, 0);
  assert.equal((await send(valid)).status, 201); assert.equal(saved, 1);
  assert.ok(paths.every(file => !fs.existsSync(file)));
});
