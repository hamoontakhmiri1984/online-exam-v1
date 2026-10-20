import { toLatinDigits } from './identifier';

export type ParsedQuestion = {
  text: string;
  options: string[];
  correctOptionIndex: number;
};

export type ParsedQuestionsResult = {
  questions: ParsedQuestion[];
  // Report rows rejected for invalid options or correct-answer values.
  skippedRows: number;
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Accept both exam and bank question template headers.
const QUESTION_COLUMNS = ['سوال', 'متن سوال'];
const CORRECT_ANSWER_COLUMNS = ['پاسخ صحیح', 'شماره گزینه\u200cی صحیح'];

const COLUMN_QUESTION = QUESTION_COLUMNS[0];
const COLUMN_ANSWER_CORRECT = CORRECT_ANSWER_COLUMNS[0];

function getOptionColumnLabels(headers: string[]): string[] {
  return headers.filter((header) => header.trim().startsWith('گزینه'));
}

function findColumn(headers: string[], names: string[]): string | undefined {
  return headers.find((header) => names.includes(header.trim()));
}

// Parse A-F or digits 1-6 into zero-based indices; invalid values remain null.
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
  // Load the spreadsheet parser only when importing or exporting.
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  // CSV has no workbook encoding metadata; decode UTF-8 before SheetJS so
  // Persian column names work even when the file has no BOM.
  const workbook = /\.csv$/i.test(file.name)
    ? XLSX.read(new TextDecoder('utf-8', { fatal: true }).decode(buffer), { type: 'string' })
    : XLSX.read(buffer, { type: 'array' });
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

    // Trim only trailing empty options to preserve correct-answer indices.
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
