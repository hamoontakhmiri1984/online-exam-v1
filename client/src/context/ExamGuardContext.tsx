import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal/Modal';

type ExamGuardContextValue = {
  isExamActive: boolean;
  setExamActive: (active: boolean) => void;
  guardNavigation: (action: () => void) => void;
};

const ExamGuardContext = createContext<ExamGuardContextValue | null>(null);

// وقتی دانشجو وسط یه آزمون فعاله (hasStarted && !isFinished تو useExamRunner)،
// هر تلاش برای رفتن به یه صفحه‌ی دیگه (منو، لوگو، خروج) به‌جای اجرای مستقیم،
// اول یه مودال تایید نشون می‌ده. عملیات واقعی (navigate/logout) فقط بعد از
// تایید کاربر اجرا می‌شه.
export function ExamGuardProvider({ children }: { children: ReactNode }) {
  const [isExamActive, setIsExamActive] = useState<boolean>(false);
  const [pendingConfirm, setPendingConfirm] = useState<boolean>(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  function guardNavigation(action: () => void) {
    if (isExamActive) {
      pendingActionRef.current = action;
      setPendingConfirm(true);
    } else {
      action();
    }
  }

  function confirmLeave() {
    setPendingConfirm(false);
    setIsExamActive(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }

  function cancelLeave() {
    setPendingConfirm(false);
    pendingActionRef.current = null;
  }

  return (
    <ExamGuardContext.Provider
      value={{ isExamActive, setExamActive: setIsExamActive, guardNavigation }}
    >
      {children}

      <Modal isOpen={pendingConfirm} onClose={cancelLeave}>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-50 text-danger-600 dark:bg-danger-950/40 dark:text-danger-400">
          <AlertTriangle size={20} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
          شما در حال آزمون هستید
        </h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          می‌خوای آزمون رو لغو کنی؟ اگه از این صفحه خارج بشی، آزمون نیمه‌کاره
          می‌مونه و پیشرفتت ذخیره نمی‌شه.
        </p>
        <div className="flex gap-3">
          <button
            onClick={cancelLeave}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            ادامه‌ی آزمون
          </button>
          <button
            onClick={confirmLeave}
            className="flex-1 rounded-xl bg-danger-600 py-2.5 text-sm font-medium text-white transition hover:bg-danger-700"
          >
            لغو آزمون و خروج
          </button>
        </div>
      </Modal>
    </ExamGuardContext.Provider>
  );
}

export function useExamGuard() {
  const ctx = useContext(ExamGuardContext);
  if (!ctx) {
    throw new Error('useExamGuard باید داخل ExamGuardProvider استفاده بشه');
  }
  return ctx;
}
