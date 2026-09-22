import Modal from '../../../components/Modal/Modal';
import type { Plan } from '../../../constants/plans';

function PlanChangeModal({
  plan,
  hasActivePaidPlan,
  actionLoading,
  onClose,
  onConfirm,
}: {
  plan: Plan | null;
  hasActivePaidPlan: boolean;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={!!plan} onClose={onClose}>
      {plan && (
        <div className="text-center">
          <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            تغییر به پلن «{plan.name}»
          </h3>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            {plan.price === 0
              ? 'یه دوره‌ی جدید از همین الان با پلن رایگان شروع می‌شه.'
              : `به درگاه پرداخت زرین‌پال منتقل می‌شی تا ${plan.priceLabel} تومان رو پرداخت کنی. بعد از پرداخت موفق، دوره‌ی ${plan.durationDays} روزه‌ت از همین الان شروع می‌شه.`}
          </p>
          {hasActivePaidPlan && (
            <p className="mb-5 text-xs text-danger-600 dark:text-danger-400">
              روزهای باقی‌مونده‌ی پلن فعلی به پلن جدید منتقل نمی‌شه.
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              انصراف
            </button>
            <button
              onClick={onConfirm}
              disabled={actionLoading}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {actionLoading
                ? 'در حال ثبت...'
                : plan.price === 0
                ? 'تایید'
                : 'پرداخت و ادامه'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default PlanChangeModal;
