import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

import {
  MAX_IMPORT_ROWS,
  MAX_SHEET_ROWS,
  parseQuestionsExcel,
} from '../src/lib/questionExcel';
import { AppError } from '../src/lib/errors';

// Unit tests (no DB/Redis): فایل‌های واقعی xlsx/csv با خود SheetJS ساخته و
// از parseQuestionsExcel رد می‌شن.

const HEADER = ['text', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'correct', 'difficulty'];
const q = (text: string, correct: number | string = 1) => [text, 'A', 'B', '', '', '', '', correct, 'Easy'];
const blanks = (n: number): unknown[][] => Array.from({ length: n }, () => []);

function xlsxBuffer(rows: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'S');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function csvBuffer(lines: string[]): Buffer {
  return Buffer.from(lines.join('\n'), 'utf8');
}

const isBadRequest = (e: unknown) => e instanceof AppError && e.statusCode === 400;

test('فایل ساده: سوال‌های معتبر خوانده می‌شن', () => {
  const result = parseQuestionsExcel(xlsxBuffer([HEADER, q('Question one'), q('Question two', 2)]));
  assert.equal(result.questions.length, 2);
  assert.equal(result.errors.length, 0);
});

test('ردیف‌های خالی زیاد (زیر سقف): سوال انتهای فایل خوانده می‌شه و شماره‌ی ردیف خطا درسته', () => {
  // ردیف ۱ هدر، ردیف ۲ سوال سالم، ردیف‌های ۳..۳۰۰۲ خالی، ردیف ۳۰۰۳ سوال با شماره‌ی گزینه‌ی غلط
  const rows = [HEADER, q('Question one'), ...blanks(3000), q('Question bad', 9)];
  const result = parseQuestionsExcel(xlsxBuffer(rows));
  assert.equal(result.questions.length, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].row, 3003);
});

test('ردیف اول خالی: شماره‌ی ردیف خطا همچنان با اکسل یکی است', () => {
  // ردیف ۱ خالی (هدر)، ردیف ۲ سالم، ردیف ۳ نامعتبر
  const result = parseQuestionsExcel(xlsxBuffer([[], q('Question one'), q('Question bad', 9)]));
  assert.equal(result.questions.length, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].row, 3);
});

test('سوال بعد از سقف ردیف فیزیکی (بعد از کلی ردیف خالی) بی‌صدا نادیده گرفته نمی‌شه: فایل رد می‌شه', () => {
  const rows = [HEADER, q('Question one'), ...blanks(MAX_SHEET_ROWS + 100), q('Question hidden')];
  assert.throws(() => parseQuestionsExcel(xlsxBuffer(rows)), isBadRequest);
});

test('مرز سقف ردیف فیزیکی: دقیقاً سقف قبول، یک ردیف بیشتر رد', () => {
  const atLimit = [HEADER, ...blanks(MAX_SHEET_ROWS - 2), q('Question last')]; // طول = MAX_SHEET_ROWS
  assert.equal(atLimit.length, MAX_SHEET_ROWS);
  const ok = parseQuestionsExcel(xlsxBuffer(atLimit));
  assert.equal(ok.questions.length, 1);

  const overLimit = [HEADER, ...blanks(MAX_SHEET_ROWS - 1), q('Question last')]; // طول = MAX_SHEET_ROWS + 1
  assert.throws(() => parseQuestionsExcel(xlsxBuffer(overLimit)), isBadRequest);
});

test('سقف تعداد سوال: دقیقاً سقف قبول، یکی بیشتر رد با پیام مشخص', () => {
  const make = (n: number) => [HEADER, ...Array.from({ length: n }, (_, i) => q(`Question ${i}`))];
  const ok = parseQuestionsExcel(xlsxBuffer(make(MAX_IMPORT_ROWS)));
  assert.equal(ok.questions.length, MAX_IMPORT_ROWS);

  assert.throws(
    () => parseQuestionsExcel(xlsxBuffer(make(MAX_IMPORT_ROWS + 1))),
    (e: unknown) => isBadRequest(e) && (e as AppError).message.includes('سوال'),
  );
});

test('CSV: سوال انتهای فایل بعد از ردیف‌های خالیِ زیر سقف خوانده می‌شه', () => {
  const lines = [HEADER.join(','), ...Array(4000).fill(''), 'Question end,A,B,,,,,1,Easy'];
  const result = parseQuestionsExcel(csvBuffer(lines));
  assert.equal(result.questions.length, 1);
  assert.equal(result.errors.length, 0);
});

test('CSV: سوال بعد از سقف ردیف فیزیکی بی‌صدا نادیده گرفته نمی‌شه: فایل رد می‌شه', () => {
  const lines = [HEADER.join(','), ...Array(MAX_SHEET_ROWS + 500).fill(''), 'Question hidden,A,B,,,,,1,Easy'];
  assert.throws(() => parseQuestionsExcel(csvBuffer(lines)), isBadRequest);
});

test('فایل خراب یا بدون ردیف داده: خطای 400', () => {
  assert.throws(() => parseQuestionsExcel(xlsxBuffer([HEADER])), isBadRequest);
});