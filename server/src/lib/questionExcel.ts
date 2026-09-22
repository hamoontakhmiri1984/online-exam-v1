import * as XLSX from 'xlsx';
import { createQuestionSchema } from '../validation/questionSchemas';
import { badRequest } from './errors';
import { toLatinDigits } from './identifier';

// ستون‌های تمپلیت - دقیقاً همین ترتیب باید تو فایل ایمپورتی رعایت بشه.
// شش ستون گزینه گذاشتیم (اکثر سوال‌ها ۲-۴ گزینه‌ان، ولی چندگزینه‌ای‌های
// بزرگ‌تر هم جا می‌شن)؛ گزینه‌های خالی نادیده گرفته می‌شن.
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

// سقف تعداد ردیف داده تو هر فایل - جلوی فایل‌های عظیم (تراکنش چندده‌هزار
// create و مصرف حافظه‌ی پارس) رو می‌گیره
const MAX_IMPORT_ROWS = 1000;

const OPTION_COLUMN_COUNT = 6;
const CORRECT_INDEX_COL = 1 + OPTION_COLUMN_COUNT; // 7
const DIFFICULTY_COL = CORRECT_INDEX_COL + 1; // 8

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

// تمپلیت اکسلی که مدرس دانلود می‌کنه و همون فرمت رو پر می‌کنه
export function buildQuestionImportTemplate(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...HEADERS], ...EXAMPLE_ROWS]);
  sheet['!cols'] = HEADERS.map(() => ({ wch: 26 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'سوالات');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export type ParsedQuestionRow = ReturnType<typeof createQuestionSchema.parse>;

export type QuestionImportError = {
  row: number; // شماره‌ی سطر تو فایل اکسل (شامل هدر) - برای نمایش مستقیم به کاربر
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

// بافر اکسل/CSV آپلودی رو می‌خونه و به آرایه‌ای از سوال‌های معتبر (طبق همون
// createQuestionSchema که فرم تک‌سوالی هم ازش استفاده می‌کنه) + لیست خطاهای
// ردیف‌به‌ردیف تبدیل می‌کنه. عمداً کل فایل رو رد نمی‌کنیم اگه یه ردیف خراب
// باشه - سوال‌های سالم ایمپورت می‌شن و خطاها جدا به مدرس نشون داده می‌شه.
export function parseQuestionsExcel(buffer: Buffer): QuestionImportResult {
  let workbook: XLSX.WorkBook;
  try {
    // sheetRows حافظه‌ی پارس رو محدود می‌کنه؛ بیشتر از سقف ردیف رو پایین رد می‌کنیم
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      sheetRows: MAX_IMPORT_ROWS * 3,
    });
  } catch {
    throw badRequest('فایل قابل‌خواندن نیست؛ یک فایل اکسل/CSV معتبر آپلود کن');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw badRequest('فایل هیچ شیتی نداره');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  });

  // ردیف اول رو به‌عنوان هدر در نظر می‌گیریم و رد می‌کنیم (چه دقیقاً با
  // تمپلیت یکی باشه چه نباشه - فقط جایگاه ستون‌ها مهمه، نه متن هدر)
  const dataRows = rows.slice(1);

  const filledRowCount = dataRows.filter((r) => r && !isRowEmpty(r)).length;
  if (filledRowCount > MAX_IMPORT_ROWS) {
    throw badRequest(
      `حداکثر ${MAX_IMPORT_ROWS} سوال تو هر فایل قابل‌ایمپورته؛ فایل رو تکه‌تکه کن`
    );
  }

  const questions: ParsedQuestionRow[] = [];
  const errors: QuestionImportError[] = [];

  dataRows.forEach((row, index) => {
    const excelRowNumber = index + 2; // +1 برای هدر، +1 برای ۱-پایه بودن اکسل
    if (!row || isRowEmpty(row)) return;

    const text = String(row[0] ?? '').trim();

    // فقط گزینه‌های خالیِ انتهایی کنار گذاشته می‌شن. اگه خالی‌ها رو از کل
    // آرایه فیلتر کنیم، با یه گزینه‌ی خالیِ وسط، اندیس بقیه جابه‌جا می‌شه و
    // «شماره‌ی گزینه‌ی صحیح» (که بر اساس ستون اصلیه) بی‌صدا به گزینه‌ی غلط
    // اشاره می‌کنه
    const rawOptions = row
      .slice(1, 1 + OPTION_COLUMN_COUNT)
      .map((cell) => String(cell ?? '').trim());
    let lastFilledIndex = -1;
    rawOptions.forEach((option, optionIndex) => {
      if (option) lastFilledIndex = optionIndex;
    });
    const options = rawOptions.slice(0, lastFilledIndex + 1);

    // ارقام فارسی/عربی هم قبول می‌شن (Number('۲') می‌شه NaN)
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
