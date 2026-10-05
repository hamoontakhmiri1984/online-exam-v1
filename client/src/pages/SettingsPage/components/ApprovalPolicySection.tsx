import { useEffect, useRef, useState } from 'react';
import {
  getApprovalPolicy,
  saveApprovalPolicy,
  type ApprovalPolicy,
  type PendingDecision,
} from '../../../api/approvalPolicyApi';
import ApprovalPolicyChoice from './ApprovalPolicyChoice';
import GroupApprovalQueue from './GroupApprovalQueue';
export default function ApprovalPolicySection() {
  const [policy, setPolicy] = useState<ApprovalPolicy | null>(null);
  const [instructors, setInstructors] = useState(true);
  const [groups, setGroups] = useState(false);
  const [instructorDecision, setInstructorDecision] =
    useState<PendingDecision>('');
  const [groupDecision, setGroupDecision] = useState<PendingDecision>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  function accept(value: ApprovalPolicy) {
    setPolicy(value);
    setInstructors(value.requireInstructorApproval);
    setGroups(value.requireGroupApproval);
    setInstructorDecision('');
    setGroupDecision('');
  }
  useEffect(() => {
    let active = true;
    setError('');
    setPolicy(null);
    getApprovalPolicy()
      .then((value) => {
        if (active) accept(value);
      })
      .catch((e) => {
        if (active) setError(e.message || 'دریافت تنظیمات ناموفق بود.');
      });
    return () => {
      active = false;
    };
  }, [reload]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!policy || pending.current) return;
    if (
      (!instructors && policy.pendingInstructors && !instructorDecision) ||
      (!groups && policy.pendingGroups && !groupDecision)
    ) {
      setError('تکلیف درخواست‌های معلق را انتخاب کنید.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      accept(
        await saveApprovalPolicy({
          revision: policy.revision,
          requireInstructorApproval: instructors,
          requireGroupApproval: groups,
          ...(!instructors && instructorDecision
            ? { pendingInstructors: instructorDecision }
            : {}),
          ...(!groups && groupDecision ? { pendingGroups: groupDecision } : {}),
        }),
      );
      setMessage('تنظیمات و تصمیم درخواست‌های معلق ذخیره شد.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره ناموفق بود.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
      <h2 className="text-lg font-bold">قوانین تأیید مدرس و گروه</h2>
      <p className="text-sm leading-7 text-gray-500 dark:text-gray-400">
        این تنظیمات مستقل هستند. فعال‌کردن تأیید، مدرس‌ها و گروه‌های تأییدشده را
        غیرفعال نمی‌کند. درخواست‌های ردشده نیز خودکار تأیید نمی‌شوند.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="text-sm text-emerald-700 dark:text-emerald-400"
        >
          {message}
        </p>
      )}
      {!policy && !error && <p role="status">دریافت تنظیمات…</p>}
      {policy && (
        <form onSubmit={save} className="space-y-4">
          <ApprovalPolicyChoice
            label="مدرس"
            required={instructors}
            count={policy.pendingInstructors}
            disabled={busy}
            decision={instructorDecision}
            onRequired={(value) => {
              setInstructors(value);
              setMessage('');
            }}
            onDecision={(value) => {
              setInstructorDecision(value);
              setMessage('');
            }}
          />
          <ApprovalPolicyChoice
            label="گروه"
            required={groups}
            count={policy.pendingGroups}
            disabled={busy}
            decision={groupDecision}
            onRequired={(value) => {
              setGroups(value);
              setMessage('');
            }}
            onDecision={(value) => {
              setGroupDecision(value);
              setMessage('');
            }}
          />
          <button
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'در حال ذخیره…' : 'ذخیرهٔ قوانین تأیید'}
          </button>
        </form>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setMessage('');
          setReload((x) => x + 1);
        }}
        className="text-sm text-brand-600 underline dark:text-brand-400"
      >
        دریافت دوبارهٔ تنظیمات
      </button>
      <GroupApprovalQueue
        key={`${reload}-${policy?.revision}`}
        onChanged={() => {
          getApprovalPolicy()
            .then((value) =>
              setPolicy((current) =>
                current
                  ? {
                      ...current,
                      pendingInstructors: value.pendingInstructors,
                      pendingGroups: value.pendingGroups,
                    }
                  : current,
              ),
            )
            .catch(() =>
              setError(
                'تعداد درخواست‌های معلق به‌روز نشد؛ تنظیمات را دوباره دریافت کنید.',
              ),
            );
        }}
      />
    </section>
  );
}
