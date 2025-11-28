/**
 * AnalyticsPieChart Component
 * Wrapper around Recharts PieChart with consistent styling
 * 
 * 92 LOC
 */

import type { ReactElement } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { cn } from '@/lib/utils';

interface PieDataItem {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface AnalyticsPieChartProps {
  data: PieDataItem[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  className?: string;
  emptyMessage?: string;
  colors?: string[];
}

const DEFAULT_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

export function AnalyticsPieChart({
  data,
  height = 300,
  innerRadius = 0,
  outerRadius = 100,
  showLegend = true,
  showLabels = true,
  className,
  emptyMessage = 'No data available',
  colors = DEFAULT_COLORS,
}: AnalyticsPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-gray-400", className)} style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderLabel = (props: PieLabelRenderProps): ReactElement | string | null => {
    const { name, percent } = props;
    if (!percent || percent < 0.05) return null; // Don't show labels for small slices
    return `${name || ''} (${(percent * 100).toFixed(0)}%)`;
  };

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={showLabels ? renderLabel : undefined}
            labelLine={showLabels}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
          />
          {showLegend && (
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingLeft: 20 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

