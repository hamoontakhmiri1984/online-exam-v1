import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';

type Props = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  busy?: boolean;
  error?: string;
};

export default function ConfirmDeleteModal({ isOpen, title, description, onConfirm, onClose, busy = false, error }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} label={title}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle size={21}/></span>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs text-gray-400">این عملیات قابل بازگشت نیست.</p>
        </div>
      </div>
      <p className="mb-6 rounded-xl border border-rose-200/60 bg-rose-50/40 p-4 text-sm leading-7 text-gray-700 dark:border-rose-400/15 dark:bg-rose-400/5 dark:text-gray-200">{description}</p>
      {error && <p role="alert" className="form-inline-error mb-3">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">انصراف</button>
        <button type="button" disabled={busy} onClick={() => void onConfirm()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"><Trash2 size={16}/>{busy ? 'در حال حذف…' : 'حذف'}</button>
      </div>
    </Modal>
  );
}
