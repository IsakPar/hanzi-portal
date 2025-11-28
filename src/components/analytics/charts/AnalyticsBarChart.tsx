/**
 * AnalyticsBarChart Component
 * Wrapper around Recharts BarChart with consistent styling
 * 
 * 107 LOC
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DataBar {
  dataKey: string;
  name: string;
  color: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartData = any[];

interface AnalyticsBarChartProps {
  data: ChartData;
  bars: DataBar[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  className?: string;
  emptyMessage?: string;
  colorByValue?: boolean; // Use different colors for each bar
  colors?: string[];
}

const DEFAULT_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function AnalyticsBarChart({
  data,
  bars,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = false,
  stacked = false,
  horizontal = false,
  className,
  emptyMessage = 'No data available',
  colorByValue = false,
  colors = DEFAULT_COLORS,
}: AnalyticsBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-gray-400", className)} style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  const Chart = horizontal ? (
    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />}
      <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
      <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      />
      {showLegend && <Legend />}
      {bars.map((bar) => (
        <Bar key={bar.dataKey} dataKey={bar.dataKey} name={bar.name} fill={bar.color} radius={[0, 4, 4, 0]} stackId={stacked ? 'stack' : undefined}>
          {colorByValue && data.map((_, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
        </Bar>
      ))}
    </BarChart>
  ) : (
    <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />}
      <XAxis dataKey={xAxisKey} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={50} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      />
      {showLegend && <Legend />}
      {bars.map((bar) => (
        <Bar key={bar.dataKey} dataKey={bar.dataKey} name={bar.name} fill={bar.color} radius={[4, 4, 0, 0]} stackId={stacked ? 'stack' : undefined}>
          {colorByValue && data.map((_, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
        </Bar>
      ))}
    </BarChart>
  );

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {Chart}
      </ResponsiveContainer>
    </div>
  );
}

