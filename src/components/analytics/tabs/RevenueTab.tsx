/**
 * RevenueTab Component
 * Revenue analytics: MRR, subscriptions, churn (RevenueCat integration)
 */

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  RefreshCw,
  Loader2,
  AlertTriangle,
  Smartphone,
  Monitor,
  Clock,
} from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { AnalyticsAreaChart } from '../charts/AnalyticsAreaChart';
import { AnalyticsBarChart } from '../charts/AnalyticsBarChart';
import { AnalyticsPieChart } from '../charts/AnalyticsPieChart';
import type { DateRange } from '../DateRangePicker';
import {
  getRevenueOverview,
  getRevenueTiers,
  getRevenuePlatforms,
  getRevenueTrends,
  getMRRHistory,
  getRevenueEvents,
  getRevenueStatus,
  getExpiringSubscriptions,
  type RevenueOverview,
  type TierBreakdown,
  type PlatformBreakdown,
  type SubscriptionTrend,
  type RevenueEvent,
  type MRRHistoryPoint,
} from '@/services/analyticsAPI';

interface RevenueTabProps {
  dateRange: DateRange;
}

const TIER_COLORS: Record<string, string> = {
  free: '#94a3b8',
  premium: '#8b5cf6',
  pro: '#f59e0b',
};

const PLATFORM_ICONS: Record<string, typeof Smartphone> = {
  ios: Smartphone,
  android: Smartphone,
  web: Monitor,
  unknown: Monitor,
};

export function RevenueTab({ dateRange }: RevenueTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [tiers, setTiers] = useState<TierBreakdown[]>([]);
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([]);
  const [trends, setTrends] = useState<SubscriptionTrend[]>([]);
  const [mrrHistory, setMrrHistory] = useState<MRRHistoryPoint[]>([]);
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [expiringCount, setExpiringCount] = useState(0);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [
        overviewData,
        tiersData,
        platformsData,
        trendsData,
        mrrData,
        eventsData,
        statusData,
        expiringData,
      ] = await Promise.all([
        getRevenueOverview(),
        getRevenueTiers(),
        getRevenuePlatforms(),
        getRevenueTrends(30),
        getMRRHistory(90),
        getRevenueEvents(20),
        getRevenueStatus(),
        getExpiringSubscriptions(7),
      ]);

      setOverview(overviewData);
      setTiers(tiersData.tiers);
      setPlatforms(platformsData.platforms);
      setTrends(trendsData.trends);
      setMrrHistory(mrrData.history);
      setEvents(eventsData.events);
      setStatusCounts(statusData.status);
      setExpiringCount(expiringData.expiring_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }

  // Format cents to dollars
  const formatMoney = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
        <button 
          onClick={loadData}
          className="mt-4 text-sm text-red-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Prepare chart data
  const tierPieData = tiers.map(t => ({
    name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1),
    value: t.mrr / 100,
    color: TIER_COLORS[t.tier] || '#64748b',
  }));

  const mrrChartData = mrrHistory.map(h => ({
    date: h.date,
    mrr: h.mrr / 100,
  }));

  const trendChartData = trends.map(t => ({
    date: t.date,
    new: t.newSubscriptions,
    churned: t.expirations,
    net: t.netChange,
  }));

  const hasData = overview && overview.activeSubscribers > 0;

  return (
    <div className="space-y-8">
      {/* No Data Banner */}
      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">No Subscription Data Yet</p>
              <p className="text-sm text-amber-700">
                Revenue analytics will populate once users start subscribing via RevenueCat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Alert */}
      {expiringCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-orange-800">
              <strong>{expiringCount}</strong> subscription{expiringCount > 1 ? 's' : ''} expiring in the next 7 days
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="MRR"
          value={formatMoney(overview?.mrr || 0)}
          subtitle="Monthly Recurring Revenue"
          icon={DollarSign}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Active Subscribers"
          value={(overview?.activeSubscribers || 0).toLocaleString()}
          subtitle={`of ${overview?.totalSubscribers || 0} total`}
          icon={Users}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="ARPU"
          value={formatMoney(overview?.avgRevenuePerUser || 0)}
          subtitle="Avg Revenue Per User"
          icon={ArrowUpRight}
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Churn Rate"
          value={`${overview?.churnRate || 0}%`}
          subtitle="Last 30 days"
          icon={ArrowDownRight}
          iconColor="text-amber-600"
          trend={overview?.churnRate ? { value: -overview.churnRate, isPositive: overview.churnRate < 5 } : undefined}
        />
      </div>

      {/* Status Breakdown */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      )}

      {/* MRR Trend */}
      {mrrChartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">MRR History</h3>
              <p className="text-sm text-gray-500">Monthly recurring revenue (last 90 days)</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <AnalyticsAreaChart
            data={mrrChartData}
            xAxisKey="date"
            areas={[
              { dataKey: 'mrr', name: 'MRR', color: '#10b981', fillOpacity: 0.4 },
            ]}
            height={300}
            formatTooltip={(value) => `$${Number(value).toLocaleString()}`}
          />
        </div>
      )}

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Tier */}
        {tierPieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue by Tier</h3>
                <p className="text-sm text-gray-500">MRR distribution across plans</p>
              </div>
              <CreditCard className="w-5 h-5 text-purple-500" />
            </div>
            <AnalyticsPieChart
              data={tierPieData}
              height={280}
              innerRadius={60}
              outerRadius={90}
              colors={Object.values(TIER_COLORS)}
              showLabels
            />
            <div className="mt-4 space-y-2">
              {tiers.map(tier => (
                <div key={tier.tier} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: TIER_COLORS[tier.tier] || '#64748b' }}
                    />
                    <span className="capitalize">{tier.tier}</span>
                  </div>
                  <div className="text-gray-600">
                    {tier.count} users • {formatMoney(tier.mrr)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Platform */}
        {platforms.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue by Platform</h3>
                <p className="text-sm text-gray-500">iOS, Android, Web breakdown</p>
              </div>
              <Smartphone className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-4">
              {platforms.map(platform => {
                const Icon = PLATFORM_ICONS[platform.platform] || Monitor;
                return (
                  <div key={platform.platform} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{platform.platform}</span>
                        <span className="text-sm text-gray-600">{formatMoney(platform.mrr)}</span>
                      </div>
                      <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${platform.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {platform.count} subscribers • {platform.percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Subscription Trends */}
      {trendChartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Subscription Trends</h3>
              <p className="text-sm text-gray-500">New vs churned subscribers (last 30 days)</p>
            </div>
          </div>
          <AnalyticsBarChart
            data={trendChartData}
            xAxisKey="date"
            bars={[
              { dataKey: 'new', name: 'New', color: '#10b981' },
              { dataKey: 'churned', name: 'Churned', color: '#ef4444' },
            ]}
            height={280}
          />
        </div>
      )}

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
              <p className="text-sm text-gray-500">Latest subscription activity</p>
            </div>
            <RefreshCw className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" onClick={loadData} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        event.eventType.includes('changed') ? 'bg-green-100 text-green-700' :
                        event.eventType.includes('ended') ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {event.eventType.replace('user.subscription.', '').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{event.tier}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{event.platform}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(event.timestamp * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
