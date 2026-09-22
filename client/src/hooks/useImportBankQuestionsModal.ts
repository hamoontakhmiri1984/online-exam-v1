import { useState } from 'react';
import {
  downloadBankQuestionTemplate,
  importBankQuestionsFromExcel,
  type BankQuestionImportError,
} from '../api/questionBankApi';
import { ApiError } from '../lib/apiClient';

type UseImportBankQuestionsModalParams = {
  bankId?: string;
  onImported: () => void; // بعد از ایمپورتِ موفق، لیستِ سوال‌ها رو رفرش کن
};

function useImportBankQuestionsModal({
  bankId,
  onImported,
}: UseImportBankQuestionsModalParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const [rowErrors, setRowErrors] = useState<BankQuestionImportError[]>([]);

  function reset() {
    setFile(null);
    setImportError('');
    setCreatedCount(null);
    setRowErrors([]);
  }

  function open() {
    reset();
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    reset();
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setImportError('');
    setCreatedCount(null);
    setRowErrors([]);
    // اجازه بده همون فایل رو دوباره انتخاب کنه (مثلاً بعد از تصحیح و ذخیره‌ی
    // دوباره‌ی همون اسم فایل) - وگرنه onChange دوم با همون فایل فایر نمی‌شه
    event.target.value = '';
  }

  // قبلاً مودال مستقیم downloadBankQuestionTemplate رو با void صدا می‌زد؛ اگه
  // سرور خطا می‌داد فقط یه unhandled rejection تو کنسول می‌شد و کاربر هیچی
  // نمی‌دید
  async function downloadTemplate() {
    setImportError('');

    try {
      await downloadBankQuestionTemplate();
    } catch (err) {
      setImportError(
        err instanceof ApiError
          ? err.message
          : 'دریافت فایل نمونه با خطا مواجه شد'
      );
    }
  }

  async function confirmImport() {
    if (!bankId || !file) return;

    setIsImporting(true);
    setImportError('');

    try {
      const result = await importBankQuestionsFromExcel(bankId, file);
      setCreatedCount(result.created.length);
      setRowErrors(result.errors);
      if (result.created.length > 0) {
        onImported();
      }
      setFile(null);
    } catch (err) {
      setImportError(
        err instanceof ApiError ? err.message : 'ایمپورت فایل با خطا مواجه شد'
      );
    } finally {
      setIsImporting(false);
    }
  }

  return {
    isOpen,
    file,
    isImporting,
    importError,
    createdCount,
    rowErrors,
    open,
    close,
    handleFileSelected,
    downloadTemplate,
    confirmImport,
  };
}

export default useImportBankQuestionsModal;
