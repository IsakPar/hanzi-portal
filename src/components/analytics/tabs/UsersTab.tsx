/**
 * UsersTab Component
 * User analytics: growth, retention, engagement, segments
 * 
 * 298 LOC
 */

import { useEffect, useState } from 'react';
import { Users, TrendingUp, UserPlus, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { AnalyticsLineChart } from '../charts/AnalyticsLineChart';
import { AnalyticsBarChart } from '../charts/AnalyticsBarChart';
import type { DateRange } from '../DateRangePicker';
import {
  getUserAnalyticsOverview,
  getUserGrowthData,
  getRetentionCohorts,
  type UserAnalyticsOverview,
  type UserGrowthData,
  type RetentionCohort,
} from '@/services/analyticsAPI';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';

interface UsersTabProps {
  dateRange: DateRange;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function UsersTab({ dateRange }: UsersTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<UserAnalyticsOverview | null>(null);
  const [growthData, setGrowthData] = useState<UserGrowthData[]>([]);
  const [cohorts, setCohorts] = useState<RetentionCohort[]>([]);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Calculate days from date range
      const daysDiff = Math.ceil(
        (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)
      );

      const [overviewData, growth, retention] = await Promise.all([
        getUserAnalyticsOverview(),
        getUserGrowthData(daysDiff),
        getRetentionCohorts(8),
      ]);

      setOverview(overviewData);
      setGrowthData(growth);
      setCohorts(retention);
    } catch (err) {
      logger.error('Failed to load user analytics:', err);
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

  // Prepare tier segment data
  const tierSegmentData = overview ? [
    { name: 'Free', count: overview.tierBreakdown.free, color: '#94a3b8' },
    { name: 'Premium', count: overview.tierBreakdown.premium, color: '#8b5cf6' },
    { name: 'Pro', count: overview.tierBreakdown.pro, color: '#f59e0b' },
  ] : [];

  // Prepare retention cohort data for display
  const cohortsByWeek = cohorts.reduce((acc, c) => {
    if (!acc[c.cohortWeek]) {
      acc[c.cohortWeek] = { cohortWeek: c.cohortWeek, usersInCohort: c.usersInCohort, weeks: {} };
    }
    acc[c.cohortWeek].weeks[c.weekNumber] = c.retentionRate;
    return acc;
  }, {} as Record<string, { cohortWeek: string; usersInCohort: number; weeks: Record<number, number> }>);

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={overview?.totalUsers.toLocaleString() || '—'}
          subtitle="All registered users"
          icon={Users}
          iconColor="text-blue-600"
          loading={loading}
        />
        <MetricCard
          title="New Users (30d)"
          value={overview?.newSignups.last30Days.toLocaleString() || '—'}
          subtitle="New signups"
          icon={UserPlus}
          iconColor="text-green-600"
          loading={loading}
        />
        <MetricCard
          title="Active Users (MAU)"
          value={overview?.activeUsers.monthly.toLocaleString() || '—'}
          subtitle="Monthly active"
          icon={UserCheck}
          iconColor="text-purple-600"
          loading={loading}
        />
        <MetricCard
          title="Avg Session"
          value={overview ? formatDuration(overview.avgSessionDuration) : '—'}
          subtitle="Time spent per session"
          icon={Clock}
          iconColor="text-amber-600"
          loading={loading}
        />
      </div>

      {/* Active Users Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Users</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-3xl font-bold text-blue-600">
              {loading ? '—' : overview?.activeUsers.daily.toLocaleString()}
            </p>
            <p className="text-sm text-blue-600/80 mt-1">Daily Active (DAU)</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <p className="text-3xl font-bold text-purple-600">
              {loading ? '—' : overview?.activeUsers.weekly.toLocaleString()}
            </p>
            <p className="text-sm text-purple-600/80 mt-1">Weekly Active (WAU)</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-3xl font-bold text-green-600">
              {loading ? '—' : overview?.activeUsers.monthly.toLocaleString()}
            </p>
            <p className="text-sm text-green-600/80 mt-1">Monthly Active (MAU)</p>
          </div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            <p className="text-sm text-gray-500">Total users over time</p>
          </div>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        {loading ? (
          <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <AnalyticsLineChart
            data={growthData}
            xAxisKey="date"
            lines={[
              { dataKey: 'totalUsers', name: 'Total Users', color: '#3b82f6' },
              { dataKey: 'activeUsers', name: 'Active Users', color: '#8b5cf6' },
            ]}
            height={300}
            formatXAxis={(date) => {
              const d = new Date(date);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
        )}
      </div>

      {/* Segments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Signups */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Signups</h3>
          {loading ? (
            <div className="h-[250px] bg-gray-100 animate-pulse rounded-lg" />
          ) : (
            <AnalyticsBarChart
              data={growthData.slice(-14)}
              xAxisKey="date"
              bars={[{ dataKey: 'newSignups', name: 'New Signups', color: '#10b981' }]}
              height={250}
            />
          )}
        </div>

        {/* Subscription Tiers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Tiers</h3>
          {loading ? (
            <div className="h-[250px] bg-gray-100 animate-pulse rounded-lg" />
          ) : (
            <AnalyticsBarChart
              data={tierSegmentData}
              xAxisKey="name"
              bars={[{ dataKey: 'count', name: 'Users', color: '#8b5cf6' }]}
              height={250}
              horizontal
              colorByValue
              colors={['#94a3b8', '#8b5cf6', '#f59e0b']}
            />
          )}
        </div>
      </div>

      {/* Retention Cohorts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Retention Cohorts</h3>
            <p className="text-sm text-gray-500">Weekly cohort analysis</p>
          </div>
        </div>
        {loading ? (
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        ) : cohorts.length === 0 ? (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium">No Cohort Data Yet</p>
              <p className="text-sm mt-1">Retention cohorts are calculated weekly</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Cohort</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Users</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Week 0</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Week 1</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Week 2</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Week 3</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-medium">Week 4</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(cohortsByWeek).slice(0, 8).map((cohort) => (
                  <tr key={cohort.cohortWeek} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-mono text-gray-700">{cohort.cohortWeek}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{cohort.usersInCohort}</td>
                    {[0, 1, 2, 3, 4].map((week) => {
                      const rate = cohort.weeks[week];
                      return (
                        <td key={week} className="px-4 py-2 text-center">
                          {rate !== undefined ? (
                            <span className={cn(
                              "inline-block px-2 py-1 rounded text-xs font-medium",
                              rate >= 70 ? "bg-green-100 text-green-700" :
                              rate >= 40 ? "bg-yellow-100 text-yellow-700" :
                              rate >= 20 ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            )}>
                              {rate.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
