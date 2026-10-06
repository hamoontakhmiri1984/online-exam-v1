type Props = { identifier: string; onEdit: () => void; disabled?: boolean };
export default function IdentifierSummary({
  identifier,
  onEdit,
  disabled,
}: Props) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
      <span
        dir="ltr"
        className="min-w-0 truncate text-sm text-gray-800 dark:text-gray-100"
        title={identifier}
      >
        {identifier}
      </span>
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="shrink-0 text-sm font-medium text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
      >
        ویرایش
      </button>
    </div>
  );
}
