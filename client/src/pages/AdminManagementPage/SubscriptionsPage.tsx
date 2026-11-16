import UiSelect from '../../components/UiSelect';
import { Save, Pencil } from 'lucide-react';
import { notifySaveSuccess, notifySaveError } from '../../components/Toast/Toast';
import { useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import DataTable from '../../components/AdminUI/DataTable';
import { LoadError, controlClass } from '../../components/AdminUI/FilterBar';
import ListPagination from '../../components/ListPagination/ListPagination';
import usePagedList from '../../hooks/usePagedList';
import {
  getAdminInstructors,
  type InstructorSummary,
} from '../../api/adminInstructorApi';
import { assignSubscription } from '../../api/subscriptionApi';
import { userDisplayName } from '../../lib/userDisplayName';
import { PLANS, PLAN_ORDER, type PlanId } from '../../constants/plans';
export default function SubscriptionsPage() {
  const list = usePagedList((q) => getAdminInstructors(q, 'Approved'));
  const [editing, setEditing] = useState<InstructorSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanId>('free');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    try {
      await assignSubscription(editing.id, plan);
      setEditing(null);
      notifySaveSuccess('اشتراک مدرس با موفقیت تغییر کرد');
      list.reload();
    } catch {
      setError('تغییر اشتراک انجام نشد؛ دوباره تلاش کنید.');
      notifySaveError('تغییر اشتراک انجام نشد؛ دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppLayout title="اشتراک‌ها">
      <PageHeader
        title="اشتراک‌ها"
        description="مدیریت اشتراک مدرس‌های تأییدشده؛ تخصیص دستی اشتراک به‌معنی ثبت پرداخت نیست."
      />
      <ListPagination {...list} maxSearchLength={100} />
      <LoadError message={list.error} retry={list.reload} />
      {editing && (
        <section
          className="mb-5 rounded-2xl border border-brand-300 bg-brand-50 p-5 dark:bg-gray-900"
          aria-label="تغییر اشتراک"
        >
          <h2 className="mb-3 font-semibold dark:text-white">
            تغییر اشتراک {userDisplayName(editing)}
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            اشتراک انتخاب‌شده از امروز فعال می‌شود و جای اشتراک فعلی را می‌گیرد.
          </p>
          <div className="flex flex-wrap gap-3">
            <UiSelect
              aria-label="اشتراک جدید"
              className="min-w-48"
              value={plan}
              disabled={busy}
              onChange={(e) => setPlan(e.target.value as PlanId)}
            >
              {PLAN_ORDER.map((id) => (
                <option key={id} value={id}>
                  {PLANS[id].name}
                </option>
              ))}
            </UiSelect>
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="ui-primary-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white disabled:opacity-50"
            >
              <Save size={17}/>{busy ? 'در حال ثبت…' : 'ذخیره تغییر'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(null)}
              className={controlClass}
            >
              انصراف
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </section>
      )}
      <DataTable
        items={list.items}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        loading={list.loading}
        columns={[
          { key: 'name', label: 'مدرس', render: (i) => userDisplayName(i) },
          {
            key: 'plan',
            label: 'اشتراک',
            render: (i) =>
              PLANS[(i.plan?.planId || 'free') as PlanId]?.name || '—',
          },
          {
            key: 'end',
            label: 'پایان اعتبار',
            render: (i) =>
              i.plan?.endDate
                ? new Date(i.plan.endDate).toLocaleDateString('fa-IR')
                : 'بدون انقضا',
          },
          {
            key: 'edit',
            label: 'عملیات',
            render: (i) => (
              <button
                type="button"
                className="ui-action-edit rounded-lg px-3 py-2"
                onClick={() => {
                  setEditing(i);
                  setPlan((i.plan?.planId || 'free') as PlanId);
                  setError(null);
                }}
              >
                <Pencil size={15}/> تغییر اشتراک
              </button>
            ),
          },
        ]}
      />
    </AppLayout>
  );
}
