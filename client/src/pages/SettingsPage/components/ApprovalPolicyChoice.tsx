import type { PendingDecision } from '../../../api/approvalPolicyApi';
const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 [color-scheme:light] dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:[color-scheme:dark]';
type Props = {
  label: string;
  required: boolean;
  count: number;
  disabled: boolean;
  decision: PendingDecision;
  onRequired: (value: boolean) => void;
  onDecision: (value: PendingDecision) => void;
};
export default function ApprovalPolicyChoice({
  label,
  required,
  count,
  disabled,
  decision,
  onRequired,
  onDecision,
}: Props) {
  return (
    <fieldset
      disabled={disabled}
      className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
    >
      <legend className="px-2 font-semibold">{label}</legend>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => onRequired(e.target.checked)}
          className="h-5 w-5 accent-brand-600"
        />
        نیاز به تأیید مدیر برای ثبت‌های جدید
      </label>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {required
          ? 'ثبت جدید تا تأیید مدیر فعال نمی‌شود.'
          : 'ثبت جدید به‌صورت خودکار فعال می‌شود.'}
      </p>
      <p className="text-sm">
        {count.toLocaleString('fa-IR')} درخواست منتظر بررسی
      </p>
      {!required && count > 0 && (
        <label className="block space-y-2 text-sm">
          <span>تکلیف درخواست‌های معلقِ {label}</span>
          <select
            className={selectClass}
            value={decision}
            onChange={(e) => onDecision(e.target.value as PendingDecision)}
            required
          >
            <option value="">انتخاب کنید</option>
            <option value="keep">برای بررسی دستی باقی بمانند</option>
            <option value="approve">همهٔ درخواست‌های معلق تأیید شوند</option>
          </select>
        </label>
      )}
    </fieldset>
  );
}
