type SpinnerProps = { label?: string; compact?: boolean };

export default function Spinner({ label = 'در حال بارگذاری…', compact = false }: SpinnerProps) {
  return (
    <div
      className={`site-loading ${compact ? 'site-loading-compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label}
      dir="rtl"
    >
      <span className="site-loading-spinner" aria-hidden="true">
        <span className="site-loading-spinner-ring" />
        <span className="site-loading-spinner-core" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
