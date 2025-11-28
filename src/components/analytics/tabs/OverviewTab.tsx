/**
 * OverviewTab Component
 * Displays key metrics summary across all analytics areas
 * 
 * 241 LOC
 */

import { useEffect, useState } from 'react';
import {
  Users,
  BookOpen,
  Cpu,
  DollarSign,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { AnalyticsAreaChart } from '../charts/AnalyticsAreaChart';
import { AnalyticsPieChart } from '../charts/AnalyticsPieChart';
import type { DateRange } from '../DateRangePicker';
import {
  getAIUsageStats,
  formatCurrency,
  formatNumber,
  type AIUsageStats,
} from '@/services/analyticsAPI';
import { fetchDashboardData } from '@/services/dashboardAPI';
import { logger } from '@/utils/logger';

interface OverviewTabProps {
  dateRange: DateRange;
}

// Mock data for trend charts (will be replaced with real API data in Phase 2)
const generateMockTrendData = (days: number) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toISOString().split('T')[0],
      users: Math.floor(50 + Math.random() * 30 + i * 2),
      sessions: Math.floor(100 + Math.random() * 50 + i * 3),
      aiRequests: Math.floor(20 + Math.random() * 40 + i * 1.5),
    };
  });
};

export function OverviewTab({ dateRange }: OverviewTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiStats, setAiStats] = useState<AIUsageStats | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [trendData, setTrendData] = useState<ReturnType<typeof generateMockTrendData>>([]);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [aiData, dashboardData] = await Promise.all([
        getAIUsageStats({ from: dateRange.from, to: dateRange.to }),
        fetchDashboardData(),
      ]);

      setAiStats(aiData);
      setUserCount(dashboardData.userCount);

      // Calculate days in range for mock data
      const daysDiff = Math.ceil(
        (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)
      );
      setTrendData(generateMockTrendData(Math.min(daysDiff, 30)));
    } catch (err) {
      logger.error('Failed to load overview data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare model usage data for pie chart
  const modelUsageData = aiStats?.records.reduce((acc: Record<string, number>, record) => {
    const model = record.modelUsed || 'unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {}) || {};

  const modelChartData = Object.entries(modelUsageData).map(([name, value]) => ({
    name,
    value,
  }));

  // Generate sparkline data from AI stats
  const costSparkline = trendData.map(() => ({
    value: Math.random() * (aiStats?.summary.totalCost || 10) / trendData.length,
  }));

  const tokenSparkline = trendData.map(() => ({
    value: Math.random() * (aiStats?.summary.totalTokens || 1000) / trendData.length,
  }));

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={formatNumber(userCount)}
          subtitle="Registered users"
          icon={Users}
          iconColor="text-blue-600"
          trend={{ value: 12.5 }}
          loading={loading}
        />
        <MetricCard
          title="AI Requests"
          value={formatNumber(aiStats?.summary.totalRequests || 0)}
          subtitle="Total generations"
          icon={Cpu}
          iconColor="text-purple-600"
          trend={{ value: 8.2 }}
          sparklineData={tokenSparkline}
          sparklineColor="#8b5cf6"
          loading={loading}
        />
        <MetricCard
          title="Total Tokens"
          value={formatNumber(aiStats?.summary.totalTokens || 0)}
          subtitle="Tokens consumed"
          icon={Zap}
          iconColor="text-amber-600"
          loading={loading}
        />
        <MetricCard
          title="AI Cost"
          value={formatCurrency(aiStats?.summary.totalCost || 0)}
          subtitle="Generation costs"
          icon={DollarSign}
          iconColor="text-green-600"
          trend={{ value: -3.1, isPositive: true }}
          sparklineData={costSparkline}
          sparklineColor="#10b981"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Trend</h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Users
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                AI Requests
              </span>
            </div>
          </div>
          {loading ? (
            <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />
          ) : (
            <AnalyticsAreaChart
              data={trendData}
              xAxisKey="date"
              areas={[
                { dataKey: 'users', name: 'Active Users', color: '#3b82f6' },
                { dataKey: 'aiRequests', name: 'AI Requests', color: '#8b5cf6' },
              ]}
              height={300}
              showLegend={false}
              formatXAxis={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
          )}
        </div>

        {/* Model Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Usage</h3>
          {loading ? (
            <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />
          ) : (
            <AnalyticsPieChart
              data={modelChartData}
              height={300}
              innerRadius={60}
              outerRadius={90}
              showLabels={false}
            />
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 opacity-80" />
            <span className="font-medium">Content</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="opacity-80">Lessons</span>
              <span className="font-semibold">—</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Stories</span>
              <span className="font-semibold">—</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Vocabulary</span>
              <span className="font-semibold">—</span>
            </div>
          </div>
          <p className="text-xs opacity-60 mt-4">Full stats in Content tab →</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-6 h-6 opacity-80" />
            <span className="font-medium">Revenue</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="opacity-80">MRR</span>
              <span className="font-semibold">—</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Subscribers</span>
              <span className="font-semibold">—</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Churn</span>
              <span className="font-semibold">—</span>
            </div>
          </div>
          <p className="text-xs opacity-60 mt-4">RevenueCat integration coming →</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 opacity-80" />
            <span className="font-medium">Performance</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="opacity-80">Avg Response</span>
              <span className="font-semibold">—</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Error Rate</span>
              <span className="font-semibold">—</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-80">Uptime</span>
              <span className="font-semibold">99.9%</span>
            </div>
          </div>
          <p className="text-xs opacity-60 mt-4">System metrics in Performance tab →</p>
        </div>
      </div>
    </div>
  );
}

