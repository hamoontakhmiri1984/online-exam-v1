import Modal from './ExamQuestionDialog';

type DeleteQuestionModalProps = {
  isOpen: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
};

function DeleteQuestionModal({
  isOpen,
  busy,
  error,
  onConfirm,
  onClose,
}: DeleteQuestionModalProps) {
  return (
    <Modal label="حذف سؤال" isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-2 dark:text-white">حذف سوال</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        آیا از حذف این سوال مطمئنی؟ این عملیات قابل بازگشت نیست.
      </p>
      {error && <p role="alert" className="mb-3 text-danger-600">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy}
          onClick={onClose}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          انصراف
        </button>
        <button disabled={busy}
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-danger-600 py-2.5 text-sm font-medium text-white hover:bg-danger-700 transition"
        >
          {busy ? 'در حال حذف…' : 'حذف سؤال'}
        </button>
      </div>
    </Modal>
  );
}

export default DeleteQuestionModal;