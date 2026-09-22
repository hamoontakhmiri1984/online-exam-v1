import { useEffect } from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

// قبلاً کلیک رو پس‌زمینه (بیرونِ کادرِ مودال) هم بسته می‌شد - یعنی اگه وسطِ
// پر کردنِ یه فرم (مثلاً فرمِ گروه/آزمون) دستت به یه گوشه‌ی بیرونِ مودال
// می‌خورد، کل فرم بی‌هیچ تاییدی بسته می‌شد و هرچی تایپ کرده بودی از بین
// می‌رفت. الان فقط دو راه برای بستن هست: دکمه‌ی ✕ یا کلید Escape - کلیکِ
// روی پس‌زمینه دیگه هیچ اثری نداره.
function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto p-6">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
