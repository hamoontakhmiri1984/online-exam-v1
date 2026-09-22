import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import useTheme from '../../hooks/useTheme';

export type ProgressPoint = {
  label: string;
  averageScore: number;
};

type ProgressChartProps = {
  data: ProgressPoint[];
};

function ProgressChart({ data }: ProgressChartProps) {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#1f2937' : '#f3f4f6';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const lineColor = '#4f46c9';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          روند پیشرفت میانگین نمرات
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          میانگین نمرات دانشجویان در ماه‌های اخیر
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-55 items-center justify-center text-sm text-gray-400">
          هنوز داده‌ای برای نمایش روند نیست
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke={textColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={textColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value: number) => value.toLocaleString('fa-IR')}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#111827' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
              cursor={{
                stroke: lineColor,
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
              formatter={(value) => Number(value).toLocaleString('fa-IR')}
            />
            <Area
              type="monotone"
              dataKey="averageScore"
              stroke={lineColor}
              strokeWidth={2.5}
              fill="url(#progressFill)"
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default ProgressChart;