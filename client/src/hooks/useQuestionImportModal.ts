import { useRef, useState } from 'react';
import {
  parseQuestionsFromExcel,
  type ParsedQuestion,
} from '../utils/questionExcel';

type UseQuestionImportModalParams = {
  addMany: (inputs: ParsedQuestion[]) => Promise<unknown>;
};

function useQuestionImportModal({ addMany }: UseQuestionImportModalParams) {
  const pending = useRef(false);
  const generation = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importWarning, setImportWarning] = useState('');

  function open() {
    generation.current += 1;
    setPreview([]);
    setImportError('');
    setImportWarning('');
    setIsOpen(true);
  }

  function close() {
    if (pending.current) return;
    generation.current += 1;
    setIsParsing(false);
    setIsOpen(false);
  }

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (pending.current) return;
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    const request = ++generation.current;
    setPreview([]);
    setIsParsing(true);
    setImportError('');
    setImportWarning('');

    try {
      const { questions, skippedRows } = await parseQuestionsFromExcel(file);
      if (request !== generation.current) return;
      if (questions.length > 500) {
        setImportError('در هر بار حداکثر ۵۰۰ سؤال وارد کنید.');
        return;
      }
      if (questions.length === 0) {
        setImportError(
          'هیچ سوال معتبری تو فایل پیدا نشد. مطمئن شو از قالب درست استفاده کردی (هر سوال حداقل ۲ گزینه‌ی پر و یه پاسخ صحیح مشخص داشته باشه).',
        );
      } else if (skippedRows > 0) {
        setImportWarning(
          `${skippedRows.toLocaleString(
            'fa-IR',
          )} سطر ایمپورت نمی‌شه (کمتر از ۲ گزینه، گزینه‌ی خالی وسط گزینه‌ها، یا پاسخ صحیح خالی/نامعتبر). بقیه‌ی سوال‌ها آماده‌ی افزودنن.`,
        );
      }
      setPreview(questions);
    } catch {
      if (request !== generation.current) return;
      setPreview([]);
      setImportError('خطا در خواندن فایل. مطمئن شو فرمتش Excel یا CSV است.');
    } finally {
      if (request === generation.current) setIsParsing(false);
      input.value = '';
    }
  }

  async function confirmImport() {
    if (pending.current || isParsing || preview.length === 0) return;
    pending.current = true;
    setIsImporting(true);
    try {
      // The server applies the quota atomically when it saves the batch.
      setImportError('');

      const created = await addMany(preview);

      // Keep the preview if saving fails; the page displays the server error.
      if (!created) {
        setImportError('افزودن سوال‌ها با خطا مواجه شد. دوباره تلاش کن.');
        return;
      }

      setIsOpen(false);
      setPreview([]);
    } catch {
      setImportError('افزودن سؤال‌ها ناموفق بود. دوباره تلاش کنید.');
    } finally {
      pending.current = false;
      setIsImporting(false);
    }
  }

  return {
    isOpen,
    preview,
    isParsing,
    isImporting,
    importError,
    importWarning,
    open,
    close,
    handleFileSelected,
    confirmImport,
  };
}

export default useQuestionImportModal;
