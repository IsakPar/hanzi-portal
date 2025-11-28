/**
 * MetricCard Component
 * Displays a single metric with optional trend indicator and sparkline
 * 
 * 89 LOC
 */

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface SparklineDataPoint {
  value: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number; // percentage change
    isPositive?: boolean; // override auto-detection
  };
  sparklineData?: SparklineDataPoint[];
  sparklineColor?: string;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-gray-600',
  trend,
  sparklineData,
  sparklineColor = '#8b5cf6',
  loading = false,
  className,
}: MetricCardProps) {
  const isPositiveTrend = trend?.isPositive ?? (trend?.value ?? 0) >= 0;

  if (loading) {
    return (
      <div className={cn("bg-white rounded-xl shadow-sm border border-gray-200 p-6", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden", className)}>
      {/* Sparkline Background */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 40, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparklineColor}
                fill={sparklineColor}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {Icon && <Icon className={cn("w-5 h-5", iconColor)} />}
        </div>
        
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <span className={cn(
              "text-sm font-medium",
              isPositiveTrend ? "text-green-600" : "text-red-600"
            )}>
              {isPositiveTrend ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
            </span>
          )}
        </div>
        
        {subtitle && (
          <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

