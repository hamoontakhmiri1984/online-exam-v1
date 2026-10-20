import * as XLSX from 'xlsx';
import { createQuestionSchema } from '../validation/questionSchemas';
import { badRequest } from './errors';
import { toLatinDigits } from './identifier';

const HEADERS = [
  'متن سوال',
  'گزینه ۱',
  'گزینه ۲',
  'گزینه ۳',
  'گزینه ۴',
  'گزینه ۵ (اختیاری)',
  'گزینه ۶ (اختیاری)',
  'شماره گزینه‌ی صحیح',
  'سطح دشواری (Easy/Medium/Hard - اختیاری)',
] as const;

// Limit both physical sheet rows and nonempty questions to bound parsing and writes.
export const MAX_IMPORT_ROWS = 1000;
export const MAX_SHEET_ROWS = 5000;

const OPTION_COLUMN_COUNT = 6;
const CORRECT_INDEX_COL = 1 + OPTION_COLUMN_COUNT;
const DIFFICULTY_COL = CORRECT_INDEX_COL + 1;

const EXAMPLE_ROWS: (string | number)[][] = [
  [
    'پایتخت ایران کدام است؟',
    'تهران',
    'اصفهان',
    'شیراز',
    'مشهد',
    '',
    '',
    1,
    'Easy',
  ],
  ['کدام گزینه عدد اول است؟', '4', '6', '7', '9', '10', '', 3, 'Medium'],
];

export function buildQuestionImportTemplate(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...HEADERS], ...EXAMPLE_ROWS]);
  sheet['!cols'] = HEADERS.map(() => ({ wch: 26 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'سوالات');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export type ParsedQuestionRow = ReturnType<typeof createQuestionSchema.parse>;

export type QuestionImportError = {
  row: number;
  message: string;
};

export type QuestionImportResult = {
  questions: ParsedQuestionRow[];
  errors: QuestionImportError[];
};

function normalizeDifficulty(raw: unknown): 'Easy' | 'Medium' | 'Hard' | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!value) return 'Medium';
  if (value === 'easy') return 'Easy';
  if (value === 'medium') return 'Medium';
  if (value === 'hard') return 'Hard';
  return null;
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((cell) => String(cell ?? '').trim() === '');
}

function isBinarySpreadsheet(buffer: Buffer): boolean {
  const zip = buffer.length >= 4 && buffer.readUInt32BE(0) === 0x504b0304;
  const ole = buffer.length >= 4 && buffer.readUInt32BE(0) === 0xd0cf11e0;
  return zip || ole;
}

// Count physical CSV lines conservatively, including line breaks inside quoted fields.
function countTextLines(buffer: Buffer): number {
  let breaks = 0;
  for (let i = buffer.indexOf(10); i !== -1; i = buffer.indexOf(10, i + 1)) breaks++;
  if (breaks === 0) {
    for (let i = buffer.indexOf(13); i !== -1; i = buffer.indexOf(13, i + 1)) breaks++;
  }
  const last = buffer.length ? buffer[buffer.length - 1] : 10;
  return breaks + (last === 10 || last === 13 ? 0 : 1);
}

function rowLimitError(): ReturnType<typeof badRequest> {
  return badRequest(
    `فایل بیشتر از ${MAX_SHEET_ROWS.toLocaleString(
      'fa-IR'
    )} ردیف دارد (ردیف‌های خالی هم شمرده می‌شوند)؛ ردیف‌های خالیِ اضافه را حذف کن یا فایل را تکه‌تکه کن`
  );
}

// Return valid rows and row-specific errors; do not silently truncate oversized files.
export function parseQuestionsExcel(buffer: Buffer): QuestionImportResult {
  if (!isBinarySpreadsheet(buffer) && countTextLines(buffer) > MAX_SHEET_ROWS) {
    throw rowLimitError();
  }

  let workbook: XLSX.WorkBook;
  try {
    // Read one extra row to distinguish an exact-limit sheet from a truncated import.
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      sheetRows: MAX_SHEET_ROWS + 1,
    });
  } catch {
    throw badRequest('فایل قابل‌خواندن نیست؛ یک فایل اکسل/CSV معتبر آپلود کن');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw badRequest('فایل هیچ شیتی نداره');
  }

  const sheet = workbook.Sheets[sheetName];
  const sheetRef = sheet['!ref'];
  const usedRange = sheetRef ? XLSX.utils.decode_range(sheetRef) : null;

  // Reject truncated sheets rather than importing only the visible prefix.
  if (sheet['!fullref'] || (usedRange && usedRange.e.r + 1 > MAX_SHEET_ROWS)) {
    throw rowLimitError();
  }

  // Start at A1 so blank leading cells do not shift columns or reported row numbers.
  const rows = usedRange
    ? XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        range: {
          s: { r: 0, c: 0 },
          e: { r: usedRange.e.r, c: Math.max(usedRange.e.c, DIFFICULTY_COL) },
        },
      })
    : [];

  // The first physical row is the header; columns are positional.
  const dataRows = rows.slice(1);

  const filledRowCount = dataRows.filter((r) => r && !isRowEmpty(r)).length;
  if (filledRowCount > MAX_IMPORT_ROWS) {
    throw badRequest(
      `حداکثر ${MAX_IMPORT_ROWS.toLocaleString(
        'fa-IR'
      )} سوال تو هر فایل قابل‌ایمپورته (فایل ${filledRowCount.toLocaleString(
        'fa-IR'
      )} ردیف پُر دارد)؛ فایل رو تکه‌تکه کن`
    );
  }

  const questions: ParsedQuestionRow[] = [];
  const errors: QuestionImportError[] = [];

  dataRows.forEach((row, index) => {
    const excelRowNumber = index + 2;
    if (!row || isRowEmpty(row)) return;

    const text = String(row[0] ?? '').trim();

    // Trim only trailing empty options to preserve the correct-answer column index.
    const rawOptions = row
      .slice(1, 1 + OPTION_COLUMN_COUNT)
      .map((cell) => String(cell ?? '').trim());
    let lastFilledIndex = -1;
    rawOptions.forEach((option, optionIndex) => {
      if (option) lastFilledIndex = optionIndex;
    });
    const options = rawOptions.slice(0, lastFilledIndex + 1);

    const correctText = toLatinDigits(
      String(row[CORRECT_INDEX_COL] ?? '').trim()
    );
    const correctNumber = Number(correctText);
    const difficulty = normalizeDifficulty(row[DIFFICULTY_COL]);

    if (difficulty === null) {
      errors.push({
        row: excelRowNumber,
        message: 'سطح دشواری نامعتبره - فقط Easy/Medium/Hard یا خالی',
      });
      return;
    }

    if (text.length < 2) {
      errors.push({
        row: excelRowNumber,
        message: 'متن سوال خالیه یا خیلی کوتاهه',
      });
      return;
    }

    if (options.length < 2) {
      errors.push({
        row: excelRowNumber,
        message: 'هر سوال حداقل ۲ گزینه‌ی پر می‌خواد',
      });
      return;
    }

    const emptyOptionIndex = options.findIndex((option) => option.length === 0);
    if (emptyOptionIndex >= 0) {
      errors.push({
        row: excelRowNumber,
        message: `گزینه‌ی ${
          emptyOptionIndex + 1
        } خالیه ولی بعدش گزینه‌ی پر هست؛ گزینه‌ها رو پشت‌سرهم و بدون ستون خالی بنویس`,
      });
      return;
    }

    if (!correctText) {
      errors.push({
        row: excelRowNumber,
        message: 'شماره‌ی گزینه‌ی صحیح خالیه',
      });
      return;
    }

    if (!Number.isFinite(correctNumber) || !Number.isInteger(correctNumber)) {
      errors.push({
        row: excelRowNumber,
        message: 'شماره‌ی گزینه‌ی صحیح باید یک عدد صحیح باشه',
      });
      return;
    }

    if (correctNumber < 1 || correctNumber > options.length) {
      errors.push({
        row: excelRowNumber,
        message: `شماره‌ی گزینه‌ی صحیح باید بین ۱ و ${options.length.toLocaleString(
          'fa-IR'
        )} باشه (تعداد گزینه‌های پر)`,
      });
      return;
    }

    const parsed = createQuestionSchema.safeParse({
      text,
      options,
      correctOptionIndex: correctNumber - 1,
      difficulty,
    });

    if (!parsed.success) {
      errors.push({
        row: excelRowNumber,
        message: parsed.error.issues[0]?.message ?? 'ردیف نامعتبره',
      });
      return;
    }

    questions.push(parsed.data);
  });

  if (questions.length === 0 && errors.length === 0) {
    throw badRequest('فایل هیچ ردیف داده‌ای نداره');
  }

  return { questions, errors };
}
