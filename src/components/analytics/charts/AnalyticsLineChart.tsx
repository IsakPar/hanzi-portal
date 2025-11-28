/**
 * AnalyticsLineChart Component
 * Wrapper around Recharts LineChart with consistent styling
 * 
 * 98 LOC
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DataLine {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartData = any[];

interface AnalyticsLineChartProps {
  data: ChartData;
  lines: DataLine[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
  emptyMessage?: string;
  formatXAxis?: (value: string) => string;
  formatTooltip?: (value: number) => string;
}

export function AnalyticsLineChart({
  data,
  lines,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  className,
  emptyMessage = 'No data available',
  formatXAxis,
  formatTooltip,
}: AnalyticsLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-gray-400", className)} style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={formatXAxis}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              formatTooltip ? formatTooltip(value) : value.toLocaleString(),
              name,
            ]}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={line.strokeWidth ?? 2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

