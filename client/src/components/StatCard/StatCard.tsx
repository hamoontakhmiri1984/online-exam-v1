import Card from '../Card/Card';

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'default' | 'attention';
};

export default function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: StatCardProps) {
  const display =
    typeof value === 'number' ? value.toLocaleString('fa-IR') : value;
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`text-3xl font-semibold tabular-nums tracking-tight ${
          tone === 'attention'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {display}
      </p>
      {hint && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </Card>
  );
}
