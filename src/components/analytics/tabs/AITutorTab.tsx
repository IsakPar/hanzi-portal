/**
 * AITutorTab Component
 * AI Tutor conversation analytics
 * 
 * 195 LOC
 */

import { useState, useEffect } from "react";
import { MessageCircle, DollarSign, Star, Sparkles, Users, TrendingUp } from "lucide-react";
import { MetricCard } from "../MetricCard";
import { AnalyticsLineChart, AnalyticsBarChart } from "../charts";
import { api } from "@/services/api";
import type { DateRange } from "../DateRangePicker";

interface AITutorTabProps {
  dateRange: DateRange;
}

interface TutorOverview {
  sessions: {
    total: number;
    uniqueUsers: number;
  };
  messages: {
    total: number;
    avgPerSession: number;
  };
  cost: {
    total: number;
    avgPerSession: number;
    totalTokens: number;
  };
  corrections: {
    avgPerSession: number;
  };
  ratings: Array<{
    rating: number;
    count: number;
  }>;
}

interface DailyTutor {
  date: string;
  sessions: number;
  messages: number;
  cost: number;
  unique_users: number;
}

interface Topic {
  topic: string;
  count: number;
}

export function AITutorTab({ dateRange }: AITutorTabProps) {
  const [overview, setOverview] = useState<TutorOverview | null>(null);
  const [daily, setDaily] = useState<DailyTutor[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, dailyRes, topicsRes] = await Promise.all([
          api.get(`/v1/analytics/ai-tutor/overview?from=${dateRange.from}&to=${dateRange.to}`),
          api.get(`/v1/analytics/ai-tutor/daily?days=30`),
          api.get(`/v1/analytics/ai-tutor/topics?limit=15`),
        ]);
        setOverview(overviewRes as TutorOverview);
        setDaily((dailyRes as { data: DailyTutor[] }).data || []);
        setTopics((topicsRes as { topics: Topic[] }).topics || []);
      } catch (err) {
        console.error("Failed to fetch AI tutor data:", err);
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

  const avgRating = overview?.ratings?.length 
    ? overview.ratings.reduce((sum, r) => sum + r.rating * r.count, 0) / 
      overview.ratings.reduce((sum, r) => sum + r.count, 0)
    : 0;

  const trendChartData = daily.map(d => ({
    date: d.date,
    sessions: d.sessions,
    messages: d.messages,
  }));

  const topicsChartData = topics.slice(0, 10).map(t => ({
    name: t.topic,
    count: t.count,
  }));

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Sessions"
          value={overview?.sessions.total.toLocaleString() || "0"}
          icon={MessageCircle}
        />
        <MetricCard
          title="Unique Users"
          value={overview?.sessions.uniqueUsers.toLocaleString() || "0"}
          icon={Users}
        />
        <MetricCard
          title="Avg Messages"
          value={String(overview?.messages.avgPerSession || 0)}
          subtitle="per session"
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Cost"
          value={`$${overview?.cost.total.toFixed(2) || "0.00"}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Avg Rating"
          value={avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
          icon={Star}
          trend={avgRating >= 4 ? { value: avgRating, isPositive: true } : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Trend */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session & Message Trend</h3>
          {trendChartData.length > 0 ? (
            <AnalyticsLineChart
              data={trendChartData}
              xAxisKey="date"
              lines={[
                { dataKey: 'sessions', name: 'Sessions', color: '#8b5cf6' },
                { dataKey: 'messages', name: 'Messages', color: '#06b6d4' },
              ]}
              height={250}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No session data yet
            </div>
          )}
        </div>

        {/* Topics Discussed */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Discussed Topics</h3>
          {topicsChartData.length > 0 ? (
            <AnalyticsBarChart
              data={topicsChartData}
              xAxisKey="name"
              bars={[{ dataKey: 'count', name: 'Discussions', color: '#8b5cf6' }]}
              height={250}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No topic data yet
            </div>
          )}
        </div>
      </div>

      {/* Ratings Distribution */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">User Ratings Distribution</h3>
        </div>
        {overview?.ratings && overview.ratings.length > 0 ? (
          <div className="flex items-end justify-center gap-4 h-48">
            {[1, 2, 3, 4, 5].map(rating => {
              const data = overview.ratings.find(r => r.rating === rating);
              const count = data?.count || 0;
              const maxCount = Math.max(...overview.ratings.map(r => r.count));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={rating} className="flex flex-col items-center gap-2">
                  <div 
                    className="w-12 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-lg transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-medium">{rating}</span>
                  </div>
                  <span className="text-sm text-gray-500">{count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            No ratings data collected yet
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">AI Tutor Cost Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 mb-1">Total Tokens Used</p>
            <p className="text-2xl font-bold text-purple-700">
              {overview?.cost.totalTokens.toLocaleString() || 0}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Cost per Session</p>
            <p className="text-2xl font-bold text-blue-700">
              ${overview?.cost.avgPerSession.toFixed(4) || "0.0000"}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 mb-1">Corrections Made</p>
            <p className="text-2xl font-bold text-green-700">
              {overview?.corrections.avgPerSession || 0} avg/session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
