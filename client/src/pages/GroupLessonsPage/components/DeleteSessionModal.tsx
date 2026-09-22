import Modal from '../../../components/Modal/Modal';

type DeleteSessionModalProps = {
  isOpen: boolean;
  sessionTitle?: string;
  onConfirm: () => void;
  onClose: () => void;
};

function DeleteSessionModal({
  isOpen,
  sessionTitle,
  onConfirm,
  onClose,
}: DeleteSessionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-2 dark:text-white">حذف جلسه</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        آیا از حذف «{sessionTitle}» مطمئنی؟ این عملیات قابل بازگشت نیست.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-danger-600 py-2.5 text-sm font-medium text-white hover:bg-danger-700 transition"
        >
          حذف
        </button>
      </div>
    </Modal>
  );
}

export default DeleteSessionModal;
