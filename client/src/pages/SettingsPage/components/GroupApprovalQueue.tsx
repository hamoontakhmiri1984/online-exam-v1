import { useEffect, useRef, useState } from 'react';
import {
  getGroupReviews,
  reviewGroup,
  type GroupReview,
} from '../../../api/approvalPolicyApi';
const labels = {
  Pending: 'منتظر بررسی',
  Approved: 'تأییدشده',
  Rejected: 'ردشده',
};
export default function GroupApprovalQueue({
  onChanged,
}: {
  onChanged: () => void;
}) {
  const [status, setStatus] =
    useState<GroupReview['approvalStatus']>('Pending');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GroupReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getGroupReviews(status, { page, pageSize: 10 })
      .then((data) => {
        if (!active) return;
        if (!data.items.length && page > 1) {
          setPage(page - 1);
          return;
        }
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => {
        if (active) setError(e.message || 'دریافت فهرست ناموفق بود.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, reload]);
  async function decide(group: GroupReview, decision: 'Approved' | 'Rejected') {
    if (pending.current) return;
    pending.current = true;
    setBusy(group.id);
    setError('');
    try {
      await reviewGroup(group, decision);
      onChanged();
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت تصمیم ناموفق بود.');
    } finally {
      pending.current = false;
      setBusy('');
    }
  }
  return (
    <div className="space-y-4 border-t border-gray-200 pt-5 dark:border-gray-700">
      <h3 className="font-bold">بررسی گروه‌ها</h3>
      <label className="flex items-center gap-3 text-sm">
        وضعیت گروه
        <select
          disabled={!!busy}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as GroupReview['approvalStatus']);
            setPage(1);
          }}
          className="rounded-lg border bg-white p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:[color-scheme:dark]"
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">دریافت گروه‌ها…</p>
      ) : (
        !error &&
        (items.length ? (
          items.map((group) => (
            <article
              key={group.id}
              className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-950"
            >
              <h4 className="font-semibold">{group.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                مدرس:{' '}
                {group.instructor.name ||
                  group.instructor.username ||
                  'بدون نام'}{' '}
                • {group.category}
              </p>
              {group.approvalStatus !== 'Approved' && (
                <div className="flex gap-3">
                  <button
                    disabled={!!busy}
                    onClick={() => decide(group, 'Approved')}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    تأیید گروه
                  </button>
                  {group.approvalStatus === 'Pending' && (
                    <button
                      disabled={!!busy}
                      onClick={() => decide(group, 'Rejected')}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 dark:text-red-300 disabled:opacity-50"
                    >
                      رد درخواست
                    </button>
                  )}
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            گروهی با این وضعیت وجود ندارد.
          </p>
        ))
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          disabled={loading || !!busy || page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="disabled:opacity-40"
        >
          قبلی
        </button>
        <span>
          صفحهٔ {page.toLocaleString('fa-IR')} • {total.toLocaleString('fa-IR')}{' '}
          گروه
        </span>
        <button
          disabled={loading || !!busy || page * 10 >= total}
          onClick={() => setPage((p) => p + 1)}
          className="disabled:opacity-40"
        >
          بعدی
        </button>
        <button
          disabled={!!busy}
          onClick={() => setReload((x) => x + 1)}
          className="text-brand-600 underline dark:text-brand-400"
        >
          تازه‌سازی
        </button>
      </div>
    </div>
  );
}
