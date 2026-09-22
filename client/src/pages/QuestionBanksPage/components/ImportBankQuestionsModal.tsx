import { Upload, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import type { BankQuestionImportError } from '../../../api/questionBankApi';

type ImportBankQuestionsModalProps = {
  isOpen: boolean;
  file: File | null;
  isImporting: boolean;
  importError: string;
  createdCount: number | null;
  rowErrors: BankQuestionImportError[];
  onFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

function ImportBankQuestionsModal({
  isOpen,
  file,
  isImporting,
  importError,
  createdCount,
  rowErrors,
  onFileSelected,
  onDownloadTemplate,
  onConfirm,
  onClose,
}: ImportBankQuestionsModalProps) {
  const finished = createdCount !== null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-2 dark:text-white">
        ایمپورت سوال از اکسل
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        فایل اکسل (یا CSV) رو طبق قالبِ زیر پر کن و آپلودش کن. سوال‌های سالم
        اضافه می‌شن؛ اگه چند سطر مشکل داشته باشن، بقیه‌ی سوال‌ها همچنان اضافه
        می‌شن و فقط خطای همون سطرها نشون داده می‌شه.
      </p>

      <button
        type="button"
        onClick={onDownloadTemplate}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition"
      >
        <Download size={16} />
        دانلود قالب نمونه
      </button>

      {!finished && (
        <label className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-50 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-800 dark:hover:bg-brand-950/20 transition">
          <Upload size={20} />
          {file ? file.name : 'فایل را انتخاب کن (xlsx، xls یا csv)'}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileSelected}
            // sr-only به‌جای hidden: با display:none اینپوت با Tab فوکوس
            // نمی‌گرفت و کاربرِ کیبورد نمی‌تونست فایل انتخاب کنه
            className="sr-only"
          />
        </label>
      )}

      {importError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/30 dark:text-danger-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {importError}
        </div>
      )}

      {finished && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-900 dark:bg-success-950/30 dark:text-success-400">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          {createdCount === 0
            ? 'هیچ سوال معتبری تو فایل پیدا نشد.'
            : `${createdCount.toLocaleString(
                'fa-IR'
              )} سوال با موفقیت اضافه شد.`}
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="mb-4 max-h-48 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
          {rowErrors.map((err, index) => (
            <div
              key={index}
              className="border-b border-gray-100 px-4 py-2.5 text-sm last:border-0 dark:border-gray-800"
            >
              <span className="font-medium text-gray-700 dark:text-gray-200">
                سطر {err.row.toLocaleString('fa-IR')}:
              </span>{' '}
              <span className="text-gray-500 dark:text-gray-400">
                {err.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          {finished ? 'بستن' : 'انصراف'}
        </button>
        {!finished && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={!file || isImporting}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            {isImporting ? 'در حال آپلود...' : 'شروع ایمپورت'}
          </button>
        )}
      </div>
    </Modal>
  );
}

export default ImportBankQuestionsModal;
