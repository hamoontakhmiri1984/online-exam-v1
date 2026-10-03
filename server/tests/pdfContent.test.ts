import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Request, Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import { validatePdfContent } from '../src/lib/pdfContent';
import { detectUploadedMime, validateUploadedFile } from '../src/lib/uploadValidation';
import { attachmentUpload } from '../src/lib/attachmentUpload';
import { AppError } from '../src/lib/errors';

const bad = (err: unknown) => err instanceof AppError && err.statusCode === 400;
async function pdf(count = 1, compressed = true) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i++) doc.addPage([595, 842]);
  return Buffer.from(await doc.save({ useObjectStreams: compressed, addDefaultPage: false }));
}

test('PDF: ساختار معمولی و object stream سالم پذیرفته و بایت‌های اصلی حفظ می‌شود', async () => {
  for (const compressed of [false, true]) {
    const buffer = await pdf(2, compressed), original = Buffer.from(buffer);
    assert.equal(await detectUploadedMime('pdf', { buffer, size: buffer.length, mimetype: 'application/pdf' }), 'application/pdf');
    assert.deepEqual(buffer, original);
  }
});

test('PDF: صرف هدر، EOF جعلی، فایل ناقص و xref نامعتبر رد می‌شوند', async () => {
  const valid = await pdf();
  for (const buffer of [Buffer.from('%PDF-1.7\n%%EOF\n'), Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\nstartxref\n9\n%%EOF\n'), valid.subarray(0, valid.length - 15), Buffer.from(valid.toString('latin1').replace(/startxref\s+\d+/, 'startxref\n999999999'), 'latin1')]) {
    await assert.rejects(validatePdfContent(buffer), bad);
  }
});

test('PDF: بدون صفحه، اندازهٔ نامعتبر و بیش از ۲۰۰۰ صفحه رد می‌شوند', async () => {
  await assert.rejects(validatePdfContent(await pdf(0)), bad);
  const doc = await PDFDocument.create(); doc.addPage([-1, 100]);
  await assert.rejects(validatePdfContent(Buffer.from(await doc.save())), bad);
  await assert.rejects(validatePdfContent(await pdf(2001)), bad);
});

test('PDF: محفظه با نشانگر رمزگذاری بدون دورزدن رمز پذیرفته نمی‌شود', async () => {
  const doc = await PDFDocument.create(); doc.addPage();
  doc.context.trailerInfo.Encrypt = doc.context.register(doc.context.obj({ Filter: 'Standard', V: 1, R: 2 }));
  await assert.rejects(validatePdfContent(Buffer.from(await doc.save({ useObjectStreams: false }))), bad);
});

test('PDF: پایان مهلت، worker را متوقف و ظرفیت را آزاد می‌کند', async () => {
  const buffer = await pdf();
  await assert.rejects(validatePdfContent(buffer, 1), bad);
  await assert.doesNotReject(validatePdfContent(buffer));
});

test('PDF: فقط دو بررسی هم‌زمان؛ درخواست سوم 503 می‌گیرد و پس از پایان قابل‌تکرار است', async () => {
  const buffer = await pdf();
  const result = await Promise.allSettled([validatePdfContent(buffer), validatePdfContent(buffer), validatePdfContent(buffer)]);
  assert.equal(result[0].status, 'fulfilled'); assert.equal(result[1].status, 'fulfilled');
  assert.equal(result[2].status, 'rejected');
  if (result[2].status === 'rejected') assert.equal(result[2].reason.statusCode, 503);
  await assert.doesNotReject(validatePdfContent(buffer));
});

test('HTTP PDF: فایل جعلی به ذخیره‌سازی نمی‌رسد و فایل سالم پذیرفته می‌شود', async t => {
  let saved = 0;
  const app = express();
  app.post('/attachment', attachmentUpload.single('file'), validateUploadedFile('pdf'), (_req, res) => { saved++; res.status(201).end(); });
  app.use((err: AppError, _req: Request, res: Response, _next: unknown) => res.status(err.statusCode || 500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address() as { port: number };
  async function send(buffer: Buffer) {
    const body = new FormData(); body.append('file', new Blob([buffer], { type: 'application/pdf' }), 'lesson.pdf');
    return fetch(`http://127.0.0.1:${address.port}/attachment`, { method: 'POST', body });
  }
  assert.equal((await send(Buffer.from('%PDF-1.7\n%%EOF'))).status, 400); assert.equal(saved, 0);
  assert.equal((await send(await pdf())).status, 201); assert.equal(saved, 1);
});
