import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import express from 'express';
import type { Request, Response } from 'express';
import { detectUploadedMime, validateUploadedFile } from '../src/lib/uploadValidation';
import { imageUpload } from '../src/lib/imageUpload';
import { AppError } from '../src/lib/errors';

let JPEG: Buffer, PNG: Buffer, WEBP: Buffer;
const pad = (bytes: number[] | Buffer) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]);
const isBadRequest = (err: unknown) => err instanceof AppError && err.statusCode === 400;
before(async () => {
  const create = () => sharp({ create: { width: 8, height: 6, channels: 4, background: { r: 40, g: 80, b: 120, alpha: 0.5 } } });
  JPEG = await create().jpeg().toBuffer(); PNG = await create().png().toBuffer(); WEBP = await create().webp().toBuffer();
});

test('تصویر: صرف امضای JPEG/PNG/WEBP و تصویر بریده‌شده پذیرفته نمی‌شوند', async () => {
  for (const buffer of [pad([0xff, 0xd8, 0xff, 0xe0]), pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pad(Buffer.from('RIFF....WEBP')), JPEG.subarray(0, Math.floor(JPEG.length / 2)), PNG.subarray(0, PNG.length - 20), WEBP.subarray(0, WEBP.length - 10)]) {
    await assert.rejects(detectUploadedMime('image', { mimetype: 'image/png', buffer, size: buffer.length }), isBadRequest);
  }
});

test('تصویر: JPEG/PNG/WEBP واقعی پذیرفته و بایت‌ها و شفافیت اصلی حفظ می‌شوند', async () => {
  for (const [buffer, mime] of [[JPEG, 'image/jpeg'], [PNG, 'image/png'], [WEBP, 'image/webp']] as const) {
    const copy = Buffer.from(buffer);
    const file = { mimetype: 'image/jpeg', buffer, size: buffer.length };
    assert.equal(await detectUploadedMime('image', file), mime);
    assert.deepEqual(buffer, copy);
  }
  assert.equal((await sharp(PNG).metadata()).hasAlpha, true);
});

test('تصویر: فایل فشرده با بیش از ۱۶ میلیون پیکسل رد می‌شود', async () => {
  const buffer = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
  assert.ok(buffer.length < 5 * 1024 * 1024);
  await assert.rejects(detectUploadedMime('image', { mimetype: 'image/png', buffer, size: buffer.length }), isBadRequest);
});

test('تصویر: ظرفیت هم‌زمان پر شود 503 می‌دهد و پس از پایان آزاد می‌شود', async () => {
  const file = { mimetype: 'image/png', buffer: PNG, size: PNG.length };
  const results = await Promise.allSettled(Array.from({ length: 3 }, () => detectUploadedMime('image', file)));
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'fulfilled');
  assert.equal(results[2].status, 'rejected');
  if (results[2].status === 'rejected') assert.equal(results[2].reason.statusCode, 503);
  assert.equal(await detectUploadedMime('image', file), 'image/png');
});

test('HTTP image: پیکسل خراب به ذخیره‌سازی نمی‌رسد و MIME تصویر سالم تصحیح می‌شود', async t => {
  let saved = 0;
  const app = express();
  app.post('/cover', imageUpload.single('file'), validateUploadedFile('image'), (req, res) => {
    saved++; res.json({ mime: req.file!.mimetype });
  });
  app.use((err: AppError, _req: Request, res: Response, _next: unknown) => res.status(err.statusCode || 500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address() as { port: number };
  async function send(buffer: Buffer) {
    const body = new FormData();
    body.append('file', new Blob([buffer], { type: 'image/png' }), 'cover.png');
    return fetch(`http://127.0.0.1:${address.port}/cover`, { method: 'POST', body });
  }
  assert.equal((await send(PNG.subarray(0, PNG.length - 20))).status, 400);
  assert.equal(saved, 0);
  const response = await send(JPEG);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mime, 'image/jpeg');
  assert.equal(saved, 1);
});
