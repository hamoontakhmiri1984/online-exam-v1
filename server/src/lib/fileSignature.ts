import { isStructuredWorkbook } from './spreadsheetStructure';

// MIME claims are untrusted; inspect content before accepting uploads.
export const HEADER_BYTES = 4096;

export type UploadKind = 'image' | 'pdf' | 'video' | 'spreadsheet';

export const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MIME_XLS = 'application/vnd.ms-excel';
export const MIME_CSV = 'text/csv';

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

function ascii(buf: Buffer, start: number, end: number): string {
  return buf.subarray(start, end).toString('latin1');
}

export function detectImage(header: Buffer): string | null {
  if (startsWith(header, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (ascii(header, 0, 4) === 'RIFF' && ascii(header, 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

// The PDF header may appear within the first 1024 bytes.
export function detectPdf(header: Buffer): string | null {
  return header.subarray(0, 1024).includes('%PDF-', 0, 'latin1')
    ? 'application/pdf'
    : null;
}

// Exclude image and audio-only ISO media brands.
const MP4_VIDEO_BRANDS = new Set([
  'isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'iso7', 'iso8', 'iso9',
  'mp41', 'mp42', 'mp71', 'avc1', 'dash', 'msnv', 'mmp4', 'f4v ',
  'M4V ', 'M4VH', 'M4VP', '3gp4', '3gp5', '3gp6', '3gp7', '3g2a', 'XAVC', 'NDAS',
]);

export function detectVideo(header: Buffer): string | null {
  if (ascii(header, 4, 8) === 'ftyp') {
    const declared = header.readUInt32BE(0);
    const boxEnd = Math.min(
      header.length,
      declared >= 16 ? declared : header.length
    );
    const brands = [ascii(header, 8, 12)];
    for (let i = 16; i + 4 <= boxEnd; i += 4) brands.push(ascii(header, i, i + 4));
    if (brands[0] === 'qt  ') return 'video/quicktime';
    if (brands.some((b) => MP4_VIDEO_BRANDS.has(b))) return 'video/mp4';
    return null;
  }

  if (startsWith(header, [0x1a, 0x45, 0xdf, 0xa3])) {
    const head = header.subarray(0, 128).toString('latin1');
    if (head.includes('webm')) return 'video/webm';
    if (head.includes('matroska')) return 'video/x-matroska';
    return null;
  }

  // Ogg must contain a Theora video stream, not only audio.
  if (ascii(header, 0, 4) === 'OggS') {
    return header.subarray(0, 512).includes('theora', 0, 'latin1')
      ? 'video/ogg'
      : null;
  }

  return null;
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export type SpreadsheetCheck = { mime: string } | { error: string };

export function checkCsv(buffer: Buffer): SpreadsheetCheck {
  if (buffer.length === 0) return { error: 'فایل خالیه' };
  const body =
    buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
      ? buffer.subarray(3)
      : buffer;

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    return {
      error:
        'فایل CSV باید با کدگذاری UTF-8 ذخیره شود (در اکسل: Save As → CSV UTF-8)',
    };
  }

  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    return { error: 'محتوای فایل متنی CSV معتبر نیست (کاراکتر باینری دارد)' };
  }

  const firstLine = text.split(/\r\n|\n|\r/).find((l) => l.trim() !== '');
  if (!firstLine) return { error: 'فایل CSV هیچ داده‌ای نداره' };
  if (!/[,;\t|]/.test(firstLine)) {
    return { error: 'ساختار CSV معتبر نیست؛ ستون‌ها باید با , یا ; جدا شده باشند' };
  }

  const quotes = text.split('"').length - 1;
  if (quotes % 2 !== 0) {
    return { error: 'ساختار CSV معتبر نیست؛ کوتیشن (") بسته نشده است' };
  }

  return { mime: MIME_CSV };
}

export function detectSpreadsheet(buffer: Buffer): SpreadsheetCheck {
  if (startsWith(buffer, ZIP_MAGIC)) {
    return isStructuredWorkbook(buffer, 'xlsx')
      ? { mime: MIME_XLSX }
      : { error: 'ساختار فایل اکسل (xlsx) نامعتبر یا حجم بازشدهٔ آن بیش از حد مجاز است' };
  }
  if (startsWith(buffer, OLE_MAGIC)) {
    return isStructuredWorkbook(buffer, 'xls')
      ? { mime: MIME_XLS }
      : { error: 'فایل یک workbook اکسل (xls) معتبر نیست' };
  }
  return checkCsv(buffer);
}
