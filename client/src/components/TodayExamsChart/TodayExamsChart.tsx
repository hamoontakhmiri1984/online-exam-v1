import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import useTheme from '../../hooks/useTheme';

export type TodayExamPoint = {
  label: string;
  participants: number;
};

type TodayExamsChartProps = {
  data: TodayExamPoint[];
};

function TodayExamsChart({ data }: TodayExamsChartProps) {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#1f2937' : '#f3f4f6';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const barColor = '#e08a04';

  const CustomYAxisTick = ({
    x = 0,
    y = 0,
    payload,
  }: {
    x?: number;
    y?: number;
    payload?: { value: string };
  }) => {
    return (
      <foreignObject x={0} y={y - 12} width={x} height={24}>
        <div
          dir="LTR"
          className="flex h-full items-center justify-end whitespace-nowrap pr-0 text-xs"
          style={{
            color: textColor,
          }}
        >
          {payload?.value}
        </div>
      </foreignObject>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          پرشرکت‌کننده‌ترین آزمون‌ها
        </h2>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          آزمون‌هایی که بیشترین دانشجو توشون شرکت کرده
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-55 items-center justify-center text-sm text-gray-400">
          هنوز هیچ دانشجویی آزمونی رو تموم نکرده
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              top: 0,
              right: 20,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              horizontal={false}
            />

            <XAxis
              type="number"
              stroke={textColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(value: number) => value.toLocaleString('fa-IR')}
            />

            <YAxis
              type="category"
              dataKey="label"
              width={125}
              tickLine={false}
              axisLine={false}
              tick={<CustomYAxisTick />}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#111827' : '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{
                color: isDark ? '#f3f4f6' : '#111827',
              }}
              cursor={{
                fill: isDark ? '#1f2937' : '#f9fafb',
              }}
              formatter={(value) => Number(value).toLocaleString('fa-IR')}
            />

            <Bar
              dataKey="participants"
              fill={barColor}
              radius={[0, 8, 8, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default TodayExamsChart;