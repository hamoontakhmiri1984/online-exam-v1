import { FileQuestion, PlayCircle, Layers, type LucideIcon } from 'lucide-react';
import type { Plan } from '../../../constants/plans';
import type { UsageSummary as Usage } from '../../../api/subscriptionApi';

function formatLimit(value: number | null): string {
  return value === null ? 'نامحدود' : value.toLocaleString('fa-IR');
}

function UsageRow({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: LucideIcon;
  label: string;
  used: number;
  limit: number | null;
}) {
  const percent =
    limit === null ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const isNearLimit = limit !== null && used >= limit;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <Icon size={14} />
          {label}
        </span>
        <span
          className={`font-medium ${
            isNearLimit
              ? 'text-danger-600 dark:text-danger-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {used.toLocaleString('fa-IR')} / {formatLimit(limit)}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? 'bg-danger-500' : 'bg-brand-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function UsageSummary({ plan, usage }: { plan: Plan; usage: Usage }) {
  return (
    <div className="flex flex-col gap-4">
      <UsageRow
        icon={FileQuestion}
        label="بانک سوال"
        used={usage.questions}
        limit={plan.maxQuestions}
      />
      <UsageRow
        icon={PlayCircle}
        label="آزمون فعال هم‌زمان"
        used={usage.activeExams}
        limit={plan.maxActiveExams}
      />
      <UsageRow icon={Layers} label="گروه" used={usage.groups} limit={plan.maxGroups} />
    </div>
  );
}

export default UsageSummary;