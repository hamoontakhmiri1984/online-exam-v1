import { Upload, Download, AlertTriangle } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import {
  downloadQuestionTemplate,
  type ParsedQuestion,
} from '../../../utils/questionExcel';

type ImportQuestionsModalProps = {
  isOpen: boolean;
  preview: ParsedQuestion[];
  isParsing: boolean;
  isImporting: boolean;
  importError: string;
  importWarning?: string;
  onFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirm: () => void;
  onClose: () => void;
};

function ImportQuestionsModal({
  isOpen,
  preview,
  isParsing,
  isImporting,
  importError,
  importWarning = '',
  onFileSelected,
  onConfirm,
  onClose,
}: ImportQuestionsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-2 dark:text-white">
        ایمپورت سوال از اکسل
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        فایل Excel یا CSV را طبق قالب زیر آپلود کن.
      </p>

      <button
        onClick={downloadQuestionTemplate}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition"
      >
        <Download size={16} />
        دانلود قالب نمونه
      </button>

      <label className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-800 dark:hover:bg-brand-950/20 transition">
        <Upload size={20} />
        فایل را انتخاب کن (xlsx یا csv)
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFileSelected}
          className="hidden"
        />
      </label>

      {isParsing && (
        <p className="mb-4 text-sm text-gray-400">در حال خواندن فایل...</p>
      )}

      {importError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/30 dark:text-danger-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {importError}
        </div>
      )}

      {importWarning && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-700 dark:text-accent-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {importWarning}
        </div>
      )}

      {preview.length > 0 && (
        <div className="mb-4 max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
          {preview.map((question, index) => (
            <div
              key={index}
              className="border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
            >
              <p className="mb-1 text-sm font-medium text-gray-800 dark:text-white">
                {(index + 1).toLocaleString('fa-IR')}. {question.text}
              </p>
              <p className="text-xs text-gray-400">
                {question.options.length.toLocaleString('fa-IR')} گزینه — جواب
                درست: {String.fromCharCode(65 + question.correctOptionIndex)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          انصراف
        </button>
        <button
          onClick={onConfirm}
          disabled={preview.length === 0 || isImporting}
          className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 transition"
        >
          {isImporting
            ? 'در حال افزودن...'
            : `افزودن ${
                preview.length ? preview.length.toLocaleString('fa-IR') : ''
              } سوال`}
        </button>
      </div>
    </Modal>
  );
}

export default ImportQuestionsModal;
