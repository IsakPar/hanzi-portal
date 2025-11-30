/**
 * OverviewTab Component (Executive Dashboard)
 * High-level business metrics, retention curves, growth trends
 * 
 * 270 LOC
 */

import { useEffect, useState } from 'react';
import {
  Users,
  Target,
  BookOpen,
  BookMarked,
  MessageCircle,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { AnalyticsLineChart } from '../charts/AnalyticsLineChart';
import type { DateRange } from '../DateRangePicker';
import { api } from '@/services/api';

interface OverviewTabProps {
  dateRange: DateRange;
}

interface ExecutiveOverview {
  users: {
    total: number;
    new30d: number;
    momGrowthPct: number;
  };
  activeUsers: {
    dau: number;
    wau: number;
    mau: number;
  };
  learning: {
    lessonsCompleted30d: number;
    storiesCompleted30d: number;
    wordsLearned30d: number;
  };
  cost: {
    aiTotal30d: number;
  };
}

interface RetentionData {
  curve: {
    day1: number;
    day7: number;
    day30: number;
  };
  cohorts: Array<{
    signup_date: string;
    cohort_size: number;
    day1: number;
    day7: number;
    day30: number;
  }>;
}

interface TrendData {
  date: string;
  active_users: number;
  new_users: number;
  lessons_completed?: number;
  stories_completed?: number;
}

export function OverviewTab({ dateRange }: OverviewTabProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [retention, setRetention] = useState<RetentionData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, retentionRes, trendsRes] = await Promise.all([
          api.get('/v1/analytics/executive/overview'),
          api.get('/v1/analytics/executive/retention'),
          api.get('/v1/analytics/executive/trends?days=30'),
        ]);
        setOverview(overviewRes as ExecutiveOverview);
        setRetention(retentionRes as RetentionData);
        setTrends((trendsRes as { data: TrendData[] }).data || []);
      } catch (err) {
        console.error('Failed to fetch executive data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  const trendChartData = trends.map(t => ({
    date: t.date,
    activeUsers: t.active_users || 0,
    newUsers: t.new_users || 0,
  }));

  const growthPositive = (overview?.users.momGrowthPct || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 opacity-80" />
            {growthPositive ? (
              <ArrowUpRight className="w-5 h-5 text-green-300" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-300" />
            )}
          </div>
          <p className="text-3xl font-bold">{overview?.users.total.toLocaleString() || 0}</p>
          <p className="text-sm opacity-80">Total Users</p>
          <p className={`text-sm mt-2 ${growthPositive ? 'text-green-300' : 'text-red-300'}`}>
            {growthPositive ? '+' : ''}{overview?.users.momGrowthPct || 0}% MoM
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Day 7</span>
          </div>
          <p className="text-3xl font-bold">{retention?.curve.day7 || 0}%</p>
          <p className="text-sm opacity-80">Retention Rate</p>
          <p className="text-sm mt-2 opacity-70">
            D1: {retention?.curve.day1 || 0}% → D30: {retention?.curve.day30 || 0}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{overview?.learning.wordsLearned30d.toLocaleString() || 0}</p>
          <p className="text-sm opacity-80">Words Learned (30d)</p>
          <p className="text-sm mt-2 opacity-70">
            {Math.round((overview?.learning.wordsLearned30d || 0) / 30)} per day avg
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${overview?.cost.aiTotal30d.toFixed(2) || '0.00'}</p>
          <p className="text-sm opacity-80">AI Cost (30d)</p>
          <p className="text-sm mt-2 opacity-70">
            ${((overview?.cost.aiTotal30d || 0) / Math.max(overview?.users.total || 1, 1)).toFixed(4)}/user
          </p>
        </div>
      </div>

      {/* Active Users Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="DAU (Today)"
          value={overview?.activeUsers.dau.toLocaleString() || "0"}
          icon={Users}
          trend={overview?.activeUsers.dau && overview.users.total > 0
            ? { value: Math.round(100 * overview.activeUsers.dau / overview.users.total), isPositive: true }
            : undefined}
        />
        <MetricCard
          title="WAU (7 days)"
          value={overview?.activeUsers.wau.toLocaleString() || "0"}
          icon={Users}
        />
        <MetricCard
          title="MAU (30 days)"
          value={overview?.activeUsers.mau.toLocaleString() || "0"}
          icon={Users}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Trend */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Trend</h3>
          {trendChartData.length > 0 ? (
            <AnalyticsLineChart
              data={trendChartData}
              xAxisKey="date"
              lines={[
                { dataKey: 'activeUsers', name: 'Active Users', color: '#8b5cf6' },
                { dataKey: 'newUsers', name: 'New Users', color: '#10b981' },
              ]}
              height={250}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No trend data yet
            </div>
          )}
        </div>

        {/* Retention Curve Visualization */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Curve</h3>
          <div className="flex items-end justify-between h-48 px-4">
            {[
              { day: 'Day 1', value: retention?.curve.day1 || 0 },
              { day: 'Day 7', value: retention?.curve.day7 || 0 },
              { day: 'Day 30', value: retention?.curve.day30 || 0 },
            ].map((point) => (
              <div key={point.day} className="flex flex-col items-center flex-1">
                <div className="relative w-full max-w-[80px] flex flex-col items-center">
                  <span className="text-2xl font-bold text-purple-600 mb-2">{point.value}%</span>
                  <div 
                    className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg transition-all"
                    style={{ height: `${Math.max(point.value * 1.5, 20)}px` }}
                  />
                </div>
                <span className="mt-2 text-sm font-medium text-gray-600">{point.day}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center mt-4">
            {retention?.curve.day7 && retention.curve.day7 >= 40 
              ? '✅ Above industry average (40%)' 
              : '⚠️ Below industry average (40%)'}
          </p>
        </div>
      </div>

      {/* Learning Activity Summary */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Activity (Last 30 Days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {overview?.learning.lessonsCompleted30d.toLocaleString() || 0}
              </p>
              <p className="text-sm text-blue-600">Lessons Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BookMarked className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">
                {overview?.learning.storiesCompleted30d.toLocaleString() || 0}
              </p>
              <p className="text-sm text-purple-600">Stories Read</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
            <div className="p-3 bg-green-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {overview?.learning.wordsLearned30d.toLocaleString() || 0}
              </p>
              <p className="text-sm text-green-600">Words Learned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Detailed Users', icon: Users, color: 'blue' },
          { label: 'Lesson Stats', icon: BookOpen, color: 'indigo' },
          { label: 'Story Analytics', icon: BookMarked, color: 'purple' },
          { label: 'AI Tutor', icon: MessageCircle, color: 'pink' },
        ].map((item) => (
          <button
            key={item.label}
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-3 transition-colors group"
          >
            <item.icon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              {item.label}
            </span>
            <ArrowUpRight className="w-4 h-4 ml-auto text-gray-400 group-hover:text-gray-600" />
          </button>
        ))}
      </div>
    </div>
  );
}
