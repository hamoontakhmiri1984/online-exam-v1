import test, { before } from 'node:test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as XLSX from 'xlsx';
import express from 'express';
import { excelUpload } from '../src/lib/excelUpload';
import { buildQuestionImportTemplate } from '../src/lib/questionExcel';
import type { Request, Response } from 'express';

import {
  HEADER_BYTES,
  checkCsv,
  detectImage,
  detectPdf,
  detectSpreadsheet,
  detectVideo,
} from '../src/lib/fileSignature';
import { detectUploadedMime, validateUploadedFile } from '../src/lib/uploadValidation';
import { AppError } from '../src/lib/errors';
import { MAX_ZIP_ENTRY_BYTES, validateXlsxArchive } from '../src/lib/spreadsheetArchive';

// Unit tests (بدون DB/Redis/شبکه): فایل‌های ساختگی با هدر واقعی هر فرمت.

const pad = (head: number[] | Buffer, total = 64) =>
  Buffer.concat([Buffer.from(head), Buffer.alloc(Math.max(0, total - head.length))]);

let JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
let PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let WEBP = pad(Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 0, 0, 0]), Buffer.from('WEBP')]));
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const ftyp = (major: string, ...compat: string[]) => {
  const body = Buffer.concat([Buffer.from(major), Buffer.alloc(4), ...compat.map((c) => Buffer.from(c))]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(8 + body.length);
  return pad(Buffer.concat([size, Buffer.from('ftyp'), body]));
};
const MP4 = ftyp('isom', 'isom', 'mp42');
const MOV = ftyp('qt  ', 'qt  ');
const HEIC = ftyp('heic', 'mif1', 'heic');
const M4A = ftyp('M4A ', 'M4A ');
const ebml = (docType: string) =>
  pad(Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]), Buffer.from(docType)]));
const OGG_THEORA = pad(Buffer.concat([Buffer.from('OggS'), Buffer.alloc(24), Buffer.from('\x80theora')]));
const OGG_VORBIS = pad(Buffer.concat([Buffer.from('OggS'), Buffer.alloc(24), Buffer.from('\x01vorbis')]));
const FAKE_HTML = Buffer.from('<html><script>alert(1)</script></html>');
const EXE = pad([0x4d, 0x5a, 0x90, 0x00]);

before(async () => {
  const create = () => sharp({ create: { width: 8, height: 6, channels: 4, background: { r: 40, g: 80, b: 120, alpha: 0.5 } } });
  JPEG = await create().jpeg().toBuffer();
  PNG = await create().png().toBuffer();
  WEBP = await create().webp().toBuffer();
});

const isBadRequest = (e: unknown) => e instanceof AppError && e.statusCode === 400;

// ---------------------------------------------------------------- تشخیص امضا
test('تصویر: JPEG/PNG/WEBP درست تشخیص داده می‌شن و محتوای جعلی رد می‌شه', () => {
  assert.equal(detectImage(JPEG), 'image/jpeg');
  assert.equal(detectImage(PNG), 'image/png');
  assert.equal(detectImage(WEBP), 'image/webp');
  assert.equal(detectImage(FAKE_HTML), null);
  assert.equal(detectImage(EXE), null);
  assert.equal(detectImage(Buffer.from('RIFF....WAVE')), null); // RIFF ولی webp نیست
});

test('PDF: امضا تو ۱۰۲۴ بایت اول؛ بقیه رد', () => {
  assert.equal(detectPdf(PDF), 'application/pdf');
  assert.equal(detectPdf(Buffer.concat([Buffer.alloc(500, 0x20), PDF])), 'application/pdf');
  assert.equal(detectPdf(Buffer.concat([Buffer.alloc(2000, 0x20), PDF])), null);
  assert.equal(detectPdf(EXE), null);
  assert.equal(detectPdf(PNG), null);
});

test('ویدیو: mp4/mov/webm/mkv/ogg-theora قبول؛ HEIC، صوت و فایل جعلی رد', () => {
  assert.equal(detectVideo(MP4), 'video/mp4');
  assert.equal(detectVideo(MOV), 'video/quicktime');
  assert.equal(detectVideo(ebml('webm')), 'video/webm');
  assert.equal(detectVideo(ebml('matroska')), 'video/x-matroska');
  assert.equal(detectVideo(OGG_THEORA), 'video/ogg');
  assert.equal(detectVideo(HEIC), null);
  assert.equal(detectVideo(M4A), null);
  assert.equal(detectVideo(OGG_VORBIS), null);
  assert.equal(detectVideo(EXE), null);
  assert.equal(detectVideo(FAKE_HTML), null);
  assert.equal(detectVideo(Buffer.alloc(0)), null);
});

// ---------------------------------------------------------------- CSV / اکسل
test('CSV: متن UTF-8 معتبر (با/بدون BOM، فارسی، ; یا ,) قبول می‌شه', () => {
  assert.deepEqual(checkCsv(Buffer.from('text,o1,o2\nسوال,الف,ب\n', 'utf8')), { mime: 'text/csv' });
  assert.deepEqual(checkCsv(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('a;b;c\n1;2;3')])), { mime: 'text/csv' });
  assert.deepEqual(checkCsv(Buffer.from('a,b\r\n1,"x, y"\r\n')), { mime: 'text/csv' });
});

test('CSV: باینری، غیر UTF-8، کوتیشن باز و فایل بدون ستون رد می‌شن (بدون تکیه بر magic bytes)', () => {
  const errorOf = (b: Buffer) => ('error' in checkCsv(b) ? (checkCsv(b) as { error: string }).error : null);
  assert.ok(errorOf(PNG)); // PNG با پسوند csv
  assert.ok(errorOf(EXE));
  assert.ok(errorOf(Buffer.from([0x61, 0x2c, 0x00, 0x62, 0x0a]))); // NUL
  assert.match(errorOf(Buffer.from([0x61, 0x2c, 0xe3, 0xc7, 0x0a])) ?? '', /UTF-8/); // cp1256
  assert.match(errorOf(Buffer.from('a,b\n1,"oops\n')) ?? '', /کوتیشن/);
  assert.match(errorOf(Buffer.from('justonecolumn\nvalue\n')) ?? '', /ساختار/);
  assert.ok(errorOf(Buffer.alloc(0)));
  assert.ok(errorOf(Buffer.from('\n\n  \n')));
});

function workbookBytes(kind: 'xlsx' | 'xls', compression = false): Buffer {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['سوال', 'گزینه'], ['نمونه', 'الف']]), 'سوالات');
  return XLSX.write(book, { type: 'buffer', bookType: kind, compression }) as Buffer;
}

test('اکسل: workbook واقعی xlsx فشرده/ساده و xls پذیرفته می‌شود', () => {
  for (const compression of [false, true]) {
    assert.deepEqual(detectSpreadsheet(workbookBytes('xlsx', compression)), {
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
  assert.deepEqual(detectSpreadsheet(workbookBytes('xls')), { mime: 'application/vnd.ms-excel' });
});

test('اکسل: نام‌های جعلی در ZIP و هدر OLE بدون workbook رد می‌شوند', () => {
  const fakeZip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), Buffer.from('[Content_Types].xml xl/workbook.xml')]);
  assert.ok('error' in detectSpreadsheet(fakeZip));
  assert.ok('error' in detectSpreadsheet(pad([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])));
  const ole = XLSX.CFB.utils.cfb_new();
  XLSX.CFB.utils.cfb_add(ole, 'WordDocument', Buffer.from('not an Excel workbook'));
  assert.ok('error' in detectSpreadsheet(XLSX.CFB.write(ole, { type: 'buffer' }) as Buffer));
});

function directoryEntries(buffer: Buffer): number[] {
  const end = buffer.length - 22;
  let cursor = buffer.readUInt32LE(end + 16);
  const result: number[] = [];
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    result.push(cursor);
    cursor += 46 + buffer.readUInt16LE(cursor + 28) + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
  }
  return result;
}

test('XLSX: خرابی CRC، ZIP ناقص، رمزگذاری و اندازه‌های بیش از سقف رد می‌شوند', () => {
  const valid = workbookBytes('xlsx', true);
  assert.doesNotThrow(() => validateXlsxArchive(valid));
  assert.throws(() => validateXlsxArchive(valid.subarray(0, valid.length - 1)));
  const entry = directoryEntries(valid)[0];
  const local = valid.readUInt32LE(entry + 42);
  const badCrc = Buffer.from(valid);
  badCrc.writeUInt32LE((valid.readUInt32LE(entry + 16) + 1) >>> 0, entry + 16);
  badCrc.writeUInt32LE(badCrc.readUInt32LE(entry + 16), local + 14);
  assert.throws(() => validateXlsxArchive(badCrc));
  const encrypted = Buffer.from(valid);
  encrypted.writeUInt16LE(valid.readUInt16LE(entry + 8) | 1, entry + 8);
  encrypted.writeUInt16LE(encrypted.readUInt16LE(entry + 8), local + 6);
  assert.throws(() => validateXlsxArchive(encrypted));
  const oversized = Buffer.from(valid);
  oversized.writeUInt32LE(MAX_ZIP_ENTRY_BYTES + 1, entry + 24);
  oversized.writeUInt32LE(MAX_ZIP_ENTRY_BYTES + 1, local + 22);
  assert.throws(() => validateXlsxArchive(oversized));
});

test('XLSX: اندازهٔ کوچک جعلی، تفاوت نام محلی و نام‌های تکراری رد می‌شوند', () => {
  const valid = workbookBytes('xlsx', true);
  const entries = directoryEntries(valid);
  const entry = entries[0], local = valid.readUInt32LE(entry + 42);
  const small = Buffer.from(valid);
  small.writeUInt32LE(1, entry + 24); small.writeUInt32LE(1, local + 22);
  assert.throws(() => validateXlsxArchive(small));
  const wrongName = Buffer.from(valid); wrongName[local + 30] ^= 1;
  assert.throws(() => validateXlsxArchive(wrongName));
  const duplicate = Buffer.from(valid);
  const pair = entries.flatMap((a, index) => entries.slice(index + 1).filter(b =>
    valid.readUInt16LE(a + 28) === valid.readUInt16LE(b + 28)
  ).map(b => [a, b]))[0];
  assert.ok(pair);
  const [a, b] = pair;
  const nameSize = valid.readUInt16LE(a + 28);
  valid.copy(duplicate, b + 46, a + 46, a + 46 + nameSize);
  valid.copy(duplicate, valid.readUInt32LE(b + 42) + 30, a + 46, a + 46 + nameSize);
  assert.throws(() => validateXlsxArchive(duplicate));
});

test('middleware: ZIP ساختگی با ادعای xlsx پیش از ایمپورت رد می‌شود', async () => {
  const buffer = Buffer.from('PK\x03\x04[Content_Types].xml xl/workbook.xml');
  const { nextArg } = await run('spreadsheet', { mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer, size: buffer.length });
  assert.ok(isBadRequest(nextArg));
});

// ---------------------------------------------------------------- MIME واقعی
test('فایل جعلی با MIME مجاز رد می‌شه', async () => {
  const claim = (mimetype: string, buffer: Buffer) => ({ mimetype, buffer, size: buffer.length });
  await assert.rejects(detectUploadedMime('image', claim('image/png', FAKE_HTML)), isBadRequest);
  await assert.rejects(detectUploadedMime('image', claim('image/jpeg', EXE)), isBadRequest);
  await assert.rejects(detectUploadedMime('pdf', claim('application/pdf', PNG)), isBadRequest);
  await assert.rejects(detectUploadedMime('spreadsheet', claim('text/csv', PNG)), isBadRequest);
  await assert.rejects(detectUploadedMime('image', claim('image/png', Buffer.alloc(0))), isBadRequest);
});

test('MIME ذخیره‌شده از روی محتواست نه ادعای کلاینت', async () => {
  const file = { mimetype: 'image/png', buffer: JPEG, size: JPEG.length }; // JPEG واقعی با ادعای PNG
  assert.equal(await detectUploadedMime('image', file), 'image/jpeg');
});

// ---------------------------------------------------------------- middleware
type Fake = { file?: Record<string, unknown> };
async function run(kind: Parameters<typeof validateUploadedFile>[0], file?: Fake['file']) {
  const req = { file } as unknown as Request;
  let nextArg: unknown = 'not-called';
  await validateUploadedFile(kind)(req, {} as Response, (err?: unknown) => {
    nextArg = err;
  });
  return { file, nextArg };
}

test('middleware: تصویر معتبر -> next() و mimetype جایگزین می‌شه', async () => {
  const { file, nextArg } = await run('image', { mimetype: 'image/png', buffer: WEBP, size: WEBP.length });
  assert.equal(nextArg, undefined);
  assert.equal(file!.mimetype, 'image/webp');
});

test('middleware: محتوای نامعتبر -> next(خطای 400)', async () => {
  const { nextArg } = await run('image', { mimetype: 'image/png', buffer: FAKE_HTML, size: FAKE_HTML.length });
  assert.ok(isBadRequest(nextArg));
});

test('middleware: بدون فایل -> next() (هندلر خودش خطا می‌دهد)', async () => {
  const { nextArg } = await run('image', undefined);
  assert.equal(nextArg, undefined);
});

function tempVideo(head: Buffer, totalBytes: number): string {
  const file = path.join(os.tmpdir(), `upload-validation-${process.pid}-${Math.random().toString(16).slice(2)}.tmp`);
  const fd = fs.openSync(file, 'w');
  fs.writeSync(fd, head);
  fs.ftruncateSync(fd, totalBytes); // بقیه‌ی فایل sparse/صفر
  fs.closeSync(fd);
  return file;
}

test('ویدیوی بزرگ: فقط ابتدای فایل خوانده می‌شود، نه کل فایل', async () => {
  const size = 60 * 1024 * 1024;
  const file = tempVideo(MP4, size);
  const reads: number[] = [];
  const realOpen = fs.promises.open;
  const realReadFile = fs.promises.readFile;
  let readFileCalled = false;
  fs.promises.readFile = (async (...a: unknown[]) => {
    readFileCalled = true;
    return (realReadFile as (...x: unknown[]) => unknown)(...a);
  }) as typeof fs.promises.readFile;
  fs.promises.open = (async (...a: Parameters<typeof realOpen>) => {
    const handle = await realOpen(...a);
    const read = handle.read.bind(handle) as (...x: unknown[]) => Promise<unknown>;
    (handle as unknown as { read: unknown }).read = async (...x: unknown[]) => {
      reads.push(x[2] as number);
      return read(...x);
    };
    return handle;
  }) as typeof fs.promises.open;

  try {
    const { file: f, nextArg } = await run('video', { mimetype: 'video/mp4', path: file, size });
    assert.equal(nextArg, undefined);
    assert.equal(f!.mimetype, 'video/mp4');
    assert.ok(fs.existsSync(file), 'روی موفقیت، فایل موقت برای آپلود نگه داشته می‌شود');
    assert.equal(readFileCalled, false);
    assert.ok(reads.length >= 1 && reads.every((n) => n <= HEADER_BYTES), `reads=${reads}`);
  } finally {
    fs.promises.open = realOpen;
    fs.promises.readFile = realReadFile;
    fs.rmSync(file, { force: true });
  }
});

test('ویدیوی جعلی با MIME مجاز: رد می‌شود و فایل موقت پاک می‌شود', async () => {
  const file = tempVideo(FAKE_HTML, 1024 * 1024);
  const { nextArg } = await run('video', { mimetype: 'video/mp4', path: file, size: 1024 * 1024 });
  assert.ok(isBadRequest(nextArg));
  assert.equal(fs.existsSync(file), false);
});

test('اکسل جعلی (PNG با MIME csv) در middleware رد می‌شود', async () => {
  const { nextArg } = await run('spreadsheet', { mimetype: 'text/csv', buffer: PNG, size: PNG.length });
  assert.ok(isBadRequest(nextArg));
});

test('HTTP multipart: فایل جعلی پیش از پردازش رد و تمپلیت واقعی با MIME صحیح پذیرفته می‌شود', async (t) => {
  const app = express();
  let processed = 0;
  app.post('/import', excelUpload.single('file'), validateUploadedFile('spreadsheet'), (req, res) => {
    processed++;
    res.json({ mime: req.file!.mimetype });
  });
  app.use((err: AppError, _req: Request, res: Response, _next: unknown) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  const address = server.address() as { port: number };
  async function send(buffer: Buffer) {
    const body = new FormData();
    body.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'questions.xlsx');
    return fetch(`http://127.0.0.1:${address.port}/import`, { method: 'POST', body });
  }
  assert.equal((await send(Buffer.from('PK\x03\x04[Content_Types].xml xl/workbook.xml'))).status, 400);
  assert.equal(processed, 0);
  const response = await send(buildQuestionImportTemplate());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(processed, 1);
});
