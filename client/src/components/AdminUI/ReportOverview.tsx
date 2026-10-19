import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import useAsyncData from '../../hooks/useAsyncData';
import {
  getReportSummary,
  type ReportSummary,
} from '../../api/adminReportingApi';
import StatCard from '../StatCard/StatCard';
import { LoadError } from './FilterBar';
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
  });
export default function ReportOverview({
  days = 30,
  instructorId = '',
}: {
  days?: number;
  instructorId?: string;
}) {
  const { data, loading, error, refetch } = useAsyncData<ReportSummary | null>(
    () => getReportSummary(days, instructorId),
    null,
    'دریافت آمار انجام نشد',
  );
  return (
    <section
      className="mb-8 space-y-5"
      aria-label="خلاصه عملکرد"
      aria-busy={loading}
    >
      <LoadError message={error} retry={refetch} />
      {!data ? (
        loading && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-gray-100 motion-reduce:animate-none dark:bg-gray-800"
              />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="آزمون‌های تکمیل‌شده"
              value={data.completed}
              hint={`${data.started.toLocaleString('fa-IR')} تلاش شروع‌شده در این بازه`}
            />
            <StatCard
              label="میانگین پاسخ صحیح"
              value={
                data.average === null
                  ? '—'
                  : `${data.average.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`
              }
              hint="میانگین درصد هر آزمون تکمیل‌شده"
            />
            <StatCard
              label="مبلغ پرداخت‌های موفق"
              value={data.revenue.toLocaleString('fa-IR')}
              hint={`${data.successfulPayments.toLocaleString('fa-IR')} پرداخت · تومان`}
            />
            <StatCard
              label="اشتراک پولی فعال"
              value={data.activeSubscriptions}
              hint="وضعیت فعلی مدرس‌ها"
            />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              روند فعالیت
            </h2>
            <p className="mt-1 mb-6 text-xs text-gray-500">
              روزهای بدون فعالیت هم نمایش داده می‌شوند · زمان تهران
            </p>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.series}
                  margin={{ right: 12, left: 0, top: 8, bottom: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="day"
                    tickFormatter={dayLabel}
                    tick={{ fontSize: 11 }}
                    minTickGap={32}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    width={36}
                  />
                  <Tooltip
                    labelFormatter={(v) => dayLabel(String(v))}
                    contentStyle={{
                      background: 'var(--report-tooltip)',
                      color: 'var(--report-text)',
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="آزمون تکمیل‌شده"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.12}
                    isAnimationActive={false}
                  />
                  {data.registrationSeriesAvailable && (
                    <Area
                      type="monotone"
                      dataKey="registered"
                      name="ثبت‌نام جدید"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.06}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">
                مشاهدهٔ داده‌های نمودار
              </summary>
              <div className="mt-3 max-h-48 overflow-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr>
                      <th>روز</th>
                      <th>تکمیل آزمون</th>
                      {data.registrationSeriesAvailable && <th>ثبت‌نام</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.series.map((row) => (
                      <tr key={row.day}>
                        <td>{dayLabel(row.day)}</td>
                        <td>{row.completed.toLocaleString('fa-IR')}</td>
                        {data.registrationSeriesAvailable && <td>{row.registered.toLocaleString('fa-IR')}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
