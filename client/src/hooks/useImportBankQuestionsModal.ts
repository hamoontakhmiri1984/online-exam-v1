import { useState } from 'react';
import {
  downloadBankQuestionTemplate,
  importBankQuestionsFromExcel,
  type BankQuestionImportError,
} from '../api/questionBankApi';
import { ApiError } from '../lib/apiClient';

type UseImportBankQuestionsModalParams = {
  bankId?: string;
  onImported: () => void;
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
    // Reset the input so the same corrected file can be selected again.
    event.target.value = '';
  }

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
