import type { ReactNode } from 'react';
export const controlClass =
  'rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
export default function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/50">
      {children}
    </div>
  );
}
export function RangeSelect({
  days,
  onChange,
}: {
  days: number;
  onChange: (days: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      بازهٔ زمانی
      <select
        className={controlClass}
        value={days}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {[7, 30, 90].map((n) => (
          <option key={n} value={n}>
            {n.toLocaleString('fa-IR')} روز اخیر
          </option>
        ))}
      </select>
    </label>
  );
}
export function LoadError({
  message,
  retry,
}: {
  message: string | null;
  retry: () => void;
}) {
  return message ? (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
    >
      {message}
      <button type="button" onClick={retry} className="underline">
        تلاش دوباره
      </button>
    </div>
  ) : null;
}
