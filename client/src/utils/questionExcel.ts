import { toLatinDigits } from './identifier';

export type ParsedQuestion = {
  text: string;
  options: string[];
  correctOptionIndex: number;
};

export type ParsedQuestionsResult = {
  questions: ParsedQuestion[];
  // سطرهایی که متن سوال داشتن ولی به‌خاطر گزینه‌ی خالی/ناقص یا پاسخ صحیحِ
  // نامعتبر ایمپورت نشدن - تا مدرس بدونه چندتا کنار گذاشته شده
  skippedRows: number;
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// هم قالب همین صفحه ('سوال' / 'پاسخ صحیح') و هم قالب بانک سوال
// ('متن سوال' / 'شماره گزینه‌ی صحیح') پذیرفته می‌شه
const QUESTION_COLUMNS = ['سوال', 'متن سوال'];
const CORRECT_ANSWER_COLUMNS = ['پاسخ صحیح', 'شماره گزینه\u200cی صحیح'];

// عنوان ستون‌هایی که توی فایل قالب نوشته می‌شن (اولین اسمِ لیست‌های بالا)
const COLUMN_QUESTION = QUESTION_COLUMNS[0];
const COLUMN_ANSWER_CORRECT = CORRECT_ANSWER_COLUMNS[0];

function getOptionColumnLabels(headers: string[]): string[] {
  return headers.filter((header) => header.trim().startsWith('گزینه'));
}

function findColumn(headers: string[], names: string[]): string | undefined {
  return headers.find((header) => names.includes(header.trim()));
}

// پاسخ صحیح رو به اندیس (۰-پایه) تبدیل می‌کنه: حرف A-F یا عدد ۱-۶ (لاتین،
// فارسی یا عربی). خالی یا نامعتبر => null؛ دیگه بی‌صدا «گزینه‌ی اول» حساب
// نمی‌شه، چون یه پاسخ اشتباه تو آزمون ثبت می‌کرد
function parseCorrectIndex(raw: unknown): number | null {
  const value = toLatinDigits(String(raw ?? '').trim()).toUpperCase();
  if (!value) return null;

  const letterIndex = OPTION_LETTERS.indexOf(value);
  if (letterIndex >= 0) return letterIndex;

  if (/^[1-6]$/.test(value)) return Number(value) - 1;

  return null;
}

export async function parseQuestionsFromExcel(
  file: File
): Promise<ParsedQuestionsResult> {
  // xlsx حجیمه (اصلی‌ترین عامل سنگین‌بودنِ chunk این صفحه)؛ فقط همین‌جا که
  // واقعاً لازمش داریم دانلود/اجرا می‌شه، نه با کل صفحه
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
  });

  if (rows.length === 0) return { questions: [], skippedRows: 0 };

  const headers = Object.keys(rows[0]);
  const questionColumn = findColumn(headers, QUESTION_COLUMNS);
  const correctColumn = findColumn(headers, CORRECT_ANSWER_COLUMNS);
  const optionColumns = getOptionColumnLabels(headers);

  if (!questionColumn) return { questions: [], skippedRows: 0 };

  const parsed: ParsedQuestion[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const text = String(row[questionColumn] ?? '').trim();
    if (!text) continue;

    // فقط گزینه‌های خالیِ انتهایی (مثلاً سوال ۲-گزینه‌ای که گزینه‌ی ۳/۴
    // خالی مونده) رو کنار می‌ذاریم - نه با filter رو کل آرایه، چون اون‌جوری
    // اگه یه گزینه‌ی وسط خالی باشه، اندیس بقیه‌ی گزینه‌ها جابه‌جا می‌شه و
    // پاسخ صحیح (که بر اساس حرف/اندیس ستون اصلیه) به گزینه‌ی غلط اشاره می‌کنه
    const rawOptions = optionColumns.map((col) =>
      String(row[col] ?? '').trim()
    );
    let lastFilledIndex = -1;
    rawOptions.forEach((opt, idx) => {
      if (opt) lastFilledIndex = idx;
    });
    const options = rawOptions.slice(0, lastFilledIndex + 1);

    const correctIndex = parseCorrectIndex(
      correctColumn ? row[correctColumn] : ''
    );

    // کمتر از ۲ گزینه، گزینه‌ی خالی وسط گزینه‌ها (داده‌ی ناقص)، یا پاسخ
    // صحیحِ خالی/نامعتبر/خارج از گزینه‌ها => این سطر ایمپورت نمی‌شه
    if (
      options.length < 2 ||
      options.some((opt) => opt.length === 0) ||
      correctIndex === null ||
      correctIndex >= options.length
    ) {
      skippedRows += 1;
      continue;
    }

    parsed.push({
      text,
      options,
      correctOptionIndex: correctIndex,
    });
  }

  return { questions: parsed, skippedRows };
}

export async function downloadQuestionTemplate() {
  const XLSX = await import('xlsx');
  const templateRows = [
    {
      [COLUMN_QUESTION]: 'پایتخت ایران کدام است؟',
      'گزینه ۱': 'تهران',
      'گزینه ۲': 'مشهد',
      'گزینه ۳': 'اصفهان',
      'گزینه ۴': 'شیراز',
      [COLUMN_ANSWER_CORRECT]: 'A',
    },
    {
      [COLUMN_QUESTION]: 'نمونه‌ی سوال با ۳ گزینه',
      'گزینه ۱': 'گزینه‌ی اول',
      'گزینه ۲': 'گزینه‌ی دوم',
      'گزینه ۳': 'گزینه‌ی سوم',
      'گزینه ۴': '',
      [COLUMN_ANSWER_CORRECT]: 'B',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'سوالات');
  XLSX.writeFile(workbook, 'قالب-ایمپورت-سوالات.xlsx');
}