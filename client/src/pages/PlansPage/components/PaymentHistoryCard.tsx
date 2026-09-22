import { Receipt } from 'lucide-react';
import type { PaymentRecord, PaymentStatus } from '../../../api/subscriptionApi';
import { PLANS } from '../../../constants/plans';

const STATUS_STYLES: Record<PaymentStatus, string> = {
  Pending:
    'bg-accent-500/10 text-accent-600 dark:text-accent-500',
  Success:
    'bg-success-500/10 text-success-600 dark:text-success-500',
  Failed: 'bg-danger-50 text-danger-600 dark:bg-danger-950/40 dark:text-danger-400',
  Refunded:
    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  Pending: 'در انتظار پرداخت',
  Success: 'موفق',
  Failed: 'ناموفق',
  Refunded: 'استرداد شده',
};

function formatAmount(amount: number): string {
  return amount.toLocaleString('fa-IR');
}

// فقط پرداخت‌های واقعی (نه لزوماً موفق) رو نشون می‌ده - پرداخت‌های Pending
// که هیچ‌وقت کامل نشدن هم قابل‌مشاهده‌ان (شفافیت برای مدرس)
function PaymentHistoryCard({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) return null;

  return (
    <div className="mb-8 max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <Receipt size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-400">تاریخچه‌ی پرداخت‌ها</p>
          <p className="font-bold text-gray-900 dark:text-white">رسیدها</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-100 text-right text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th className="py-2">پلن</th>
              <th className="py-2">مبلغ (تومان)</th>
              <th className="py-2">وضعیت</th>
              <th className="py-2">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-gray-100 text-gray-700 dark:border-gray-800 dark:text-gray-200"
              >
                <td className="py-3 font-medium">
                  {PLANS[payment.planId].name}
                </td>
                <td className="py-3">{formatAmount(payment.amount)}</td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[payment.status]}`}
                  >
                    {STATUS_LABELS[payment.status]}
                  </span>
                </td>
                <td className="py-3 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(payment.createdAt).toLocaleDateString('fa-IR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaymentHistoryCard;
