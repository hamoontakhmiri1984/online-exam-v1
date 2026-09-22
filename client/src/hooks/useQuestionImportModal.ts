import { useState } from 'react';
import {
  parseQuestionsFromExcel,
  type ParsedQuestion,
} from '../utils/questionExcel';
import type { LimitedQuota } from './useInstructorPlanLimit';

type UseQuestionImportModalParams = {
  addMany: (inputs: ParsedQuestion[]) => Promise<unknown>;
  getQuotaIfGated: () => Promise<LimitedQuota | null>;
  onLimitExceeded: (quota: LimitedQuota) => void;
};

function useQuestionImportModal({
  addMany,
  getQuotaIfGated,
  onLimitExceeded,
}: UseQuestionImportModalParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importWarning, setImportWarning] = useState('');

  function open() {
    setPreview([]);
    setImportError('');
    setImportWarning('');
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setImportError('');
    setImportWarning('');

    try {
      const { questions, skippedRows } = await parseQuestionsFromExcel(file);
      if (questions.length === 0) {
        setImportError(
          'هیچ سوال معتبری تو فایل پیدا نشد. مطمئن شو از قالب درست استفاده کردی (هر سوال حداقل ۲ گزینه‌ی پر و یه پاسخ صحیح مشخص داشته باشه).'
        );
      } else if (skippedRows > 0) {
        setImportWarning(
          `${skippedRows.toLocaleString(
            'fa-IR'
          )} سطر ایمپورت نمی‌شه (کمتر از ۲ گزینه، گزینه‌ی خالی وسط گزینه‌ها، یا پاسخ صحیح خالی/نامعتبر). بقیه‌ی سوال‌ها آماده‌ی افزودنن.`
        );
      }
      setPreview(questions);
    } catch {
      setPreview([]);
      setImportError('خطا در خواندن فایل. مطمئن شو فرمتش Excel یا CSV است.');
    } finally {
      setIsParsing(false);
      event.target.value = '';
    }
  }

  async function confirmImport() {
    if (preview.length === 0) return;

    const quota = await getQuotaIfGated();
    if (quota) {
      if (quota.expired || quota.remaining === 0) {
        setIsOpen(false);
        onLimitExceeded(quota);
        return;
      }
      if (preview.length > quota.remaining) {
        setImportError(
          `این فایل ${preview.length.toLocaleString(
            'fa-IR'
          )} سوال داره ولی پلن فعلیت فقط ${quota.remaining.toLocaleString(
            'fa-IR'
          )} سوال دیگه جا داره. فایل رو کوچیک‌تر کن یا پلنت رو ارتقا بده.`
        );
        return;
      }
    }

    setIsImporting(true);
    setImportError('');

    try {
      const created = await addMany(preview);

      // موقع خطا useQuestionBank پیام رو تو Toast نشون می‌ده و undefined
      // برمی‌گردونه؛ مودال با پیش‌نمایش باز می‌مونه تا نیاز به آپلود دوباره نباشه
      if (!created) {
        setImportError('افزودن سوال‌ها با خطا مواجه شد. دوباره تلاش کن.');
        return;
      }

      setIsOpen(false);
      setPreview([]);
    } finally {
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
