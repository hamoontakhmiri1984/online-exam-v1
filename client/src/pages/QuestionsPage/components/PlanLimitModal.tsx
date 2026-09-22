import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/Modal/Modal';
import type { LimitedQuota } from '../../../hooks/useInstructorPlanLimit';

function limitMessage(quota: LimitedQuota) {
  return quota.expired
    ? 'اشتراکت منقضی شده. برای افزودن سوال جدید اول باید پلنت رو تمدید کنی.'
    : `پلن فعلیت اجازه‌ی حداکثر ${quota.limit.toLocaleString(
        'fa-IR'
      )} سوال تو بانک سوال رو می‌ده و همین الان ${quota.used.toLocaleString(
        'fa-IR'
      )} تا داری. برای سوال بیشتر باید پلنت رو ارتقا بدی.`;
}

type PlanLimitModalProps = {
  quota: LimitedQuota | null;
  onClose: () => void;
};

function PlanLimitModal({ quota, onClose }: PlanLimitModalProps) {
  const navigate = useNavigate();

  return (
    <Modal isOpen={!!quota} onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-600 dark:text-accent-500">
          <Crown size={22} />
        </div>
        <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">
          محدودیت پلن فعلی
        </h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {quota && limitMessage(quota)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            باشه
          </button>
          <button
            onClick={() => navigate('/plans')}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            رفتن به صفحه‌ی پکیج
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default PlanLimitModal;