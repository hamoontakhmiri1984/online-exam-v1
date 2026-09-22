import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import { getCurrentUser } from '../../api/authApi';
import {
  getPaymentHistory,
  renewSubscription,
  startCheckout,
  type PaymentRecord,
} from '../../api/subscriptionApi';
import { PLANS, PLAN_ORDER, type PlanId } from '../../constants/plans';
import useSubscription from '../../hooks/useSubscription';
import CurrentPlanCard from './components/CurrentPlanCard';
import PlanGrid from './components/PlanGrid';
import PlanChangeModal from './components/PlanChangeModal';
import PaymentHistoryCard from './components/PaymentHistoryCard';

function PlansPage() {
  const currentUser = getCurrentUser();
  const {
    loading,
    subscription,
    plan,
    usage,
    remainingDays,
    isExpired,
    refresh,
  } = useSubscription();

  const [pendingPlanId, setPendingPlanId] = useState<PlanId | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: 'success' | 'danger' | 'warning';
  } | null>(null);

  const pendingPlan = pendingPlanId ? PLANS[pendingPlanId] : null;

  const hasActivePaidPlan =
    !!subscription && !isExpired && PLANS[subscription.planId].price > 0;

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

  // تاریخچه‌ی پرداخت‌ها جدا از useSubscription می‌گیریمش - چون فقط این
  // صفحه بهش نیاز داره، لازم نیست جزو hook مشترک بشه
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Instructor') return;
    let cancelled = false;
    getPaymentHistory().then((data) => {
      if (!cancelled) setPayments(data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, paymentsRefreshKey]);

  // نتیجه‌ی برگشت از درگاه زرین‌پال - سرور بعد از verify کاربر رو به
  // /plans?payment=success یا /plans?payment=failed ریدایرکت می‌کنه
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;

    if (payment === 'success') {
      setToast({ message: 'پرداخت با موفقیت انجام شد', tone: 'success' });
      refresh();
      setPaymentsRefreshKey((key) => key + 1);
    } else if (payment === 'failed') {
      setToast({
        message: 'پرداخت ناموفق بود یا لغو شد',
        tone: 'danger',
      });
    } else if (payment === 'pending') {
      // نتیجه‌ی تایید پرداخت هنوز قطعی نیست (مثلاً قطعی شبکه موقع تایید).
      // اگه پول از حسابت کم شده، چند دقیقه بعد همین صفحه رو رفرش کن یا با
      // پشتیبانی تماس بگیر - اشتراک بعد از تایید نهایی فعال می‌شه
      setToast({
        message:
          'نتیجه‌ی پرداخت هنوز تایید نشده. اگه مبلغ از حسابت کسر شده، چند دقیقه بعد دوباره سر بزن یا با پشتیبانی تماس بگیر',
        tone: 'warning',
      });
    }

    // پاک کردن query param از URL تا رفرش دستی صفحه دوباره toast نشون نده
    params.delete('payment');
    const newSearch = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (newSearch ? `?${newSearch}` : '')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // برای پلن رایگان مستقیم تمدید می‌کنه؛ برای پلن پولی باید دوباره از درگاه
  // پرداخت رد بشه (چون سرور تمدید مستقیم پلن پولی رو رد می‌کنه)
  async function handleRenew() {
    if (!currentUser || !subscription) return;
    setActionLoading(true);
    try {
      if (PLANS[subscription.planId].price === 0) {
        await renewSubscription(currentUser.id);
        setToast({ message: 'اشتراک با موفقیت تمدید شد', tone: 'success' });
        refresh();
      } else {
        const result = await startCheckout(subscription.planId);
        if (!result.free) {
          window.location.href = result.paymentUrl;
          return;
        }
        refresh();
      }
    } catch {
      setToast({ message: 'تمدید اشتراک با خطا مواجه شد', tone: 'danger' });
    } finally {
      setActionLoading(false);
    }
  }

  function handleCardSelect(planId: PlanId) {
    if (subscription && planId === subscription.planId) {
      if (isExpired) handleRenew();
      return;
    }
    if (
      hasActivePaidPlan &&
      subscription &&
      PLAN_ORDER.indexOf(planId) < PLAN_ORDER.indexOf(subscription.planId)
    ) {
      return;
    }
    setPendingPlanId(planId);
  }

  async function confirmPlanChange() {
    if (!currentUser || !pendingPlanId) return;
    setActionLoading(true);
    try {
      const result = await startCheckout(pendingPlanId);
      if (!result.free) {
        // ریدایرکت به درگاه زرین‌پال - از این‌جا به بعد کنترل دست کاربره،
        // نیازی به toast/refresh این‌جا نیست چون صفحه عوض می‌شه
        window.location.href = result.paymentUrl;
        return;
      }
      setToast({
        message: `پلن با موفقیت به «${PLANS[pendingPlanId].name}» تغییر کرد`,
        tone: 'success',
      });
      refresh();
    } catch {
      setToast({ message: 'تغییر پلن با خطا مواجه شد', tone: 'danger' });
    } finally {
      setActionLoading(false);
      setPendingPlanId(null);
    }
  }

  return (
    <AppLayout title="پکیج من">
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}

      <PlanChangeModal
        plan={pendingPlan}
        hasActivePaidPlan={hasActivePaidPlan}
        actionLoading={actionLoading}
        onClose={() => setPendingPlanId(null)}
        onConfirm={confirmPlanChange}
      />

      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        پکیج من
      </h1>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <CurrentPlanCard
            subscription={subscription}
            plan={plan}
            usage={usage}
            remainingDays={remainingDays}
            isExpired={isExpired}
            actionLoading={actionLoading}
            onRenew={handleRenew}
          />

          <PlanGrid
            subscription={subscription}
            isExpired={isExpired}
            actionLoading={actionLoading}
            onSelect={handleCardSelect}
          />

          <PaymentHistoryCard payments={payments} />
        </>
      )}
    </AppLayout>
  );
}

export default PlansPage;
