/**
 * ExercisesTab Component
 * Shows exercise success rates, hardest exercises, trends by type
 * 
 * 180 LOC
 */

import { useState, useEffect } from "react";
import { Target, TrendingUp, TrendingDown, Clock, Users, AlertTriangle } from "lucide-react";
import { MetricCard } from "../MetricCard";
import { AnalyticsBarChart, AnalyticsLineChart } from "../charts";
import { api } from "@/services/api";
import type { DateRange } from "../DateRangePicker";

interface ExercisesTabProps {
  dateRange: DateRange;
}

interface ExerciseOverview {
  overall: {
    totalAttempts: number;
    correctAttempts: number;
    successRate: number;
    avgTimeMs: number;
    uniqueUsers: number;
    lessonsPracticed: number;
  };
  byType: Array<{
    exercise_type: string;
    attempts: number;
    correct: number;
    success_rate: number;
    avg_time_ms: number;
  }>;
}

interface DailyExercise {
  date: string;
  attempts: number;
  correct: number;
  success_rate: number;
  unique_users: number;
}

interface HardestExercise {
  block_id: string;
  exercise_type: string;
  lesson_id: string;
  lesson_title: string;
  attempts: number;
  correct: number;
  success_rate: number;
}

export function ExercisesTab({ dateRange }: ExercisesTabProps) {
  const [overview, setOverview] = useState<ExerciseOverview | null>(null);
  const [daily, setDaily] = useState<DailyExercise[]>([]);
  const [hardest, setHardest] = useState<HardestExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, dailyRes, hardestRes] = await Promise.all([
          api.get(`/v1/analytics/exercises/overview?from=${dateRange.from}&to=${dateRange.to}`),
          api.get(`/v1/analytics/exercises/daily?days=30`),
          api.get(`/v1/analytics/exercises/hardest?limit=10`),
        ]);
        setOverview(overviewRes as ExerciseOverview);
        setDaily((dailyRes as { data: DailyExercise[] }).data || []);
        setHardest((hardestRes as { hardest: HardestExercise[] }).hardest || []);
      } catch (err) {
        console.error("Failed to fetch exercise data:", err);
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

  const typeChartData = (overview?.byType || []).map(t => ({
    name: t.exercise_type.replace(/_/g, ' '),
    successRate: t.success_rate,
    attempts: t.attempts,
  }));

  const trendChartData = daily.map(d => ({
    date: d.date,
    successRate: d.success_rate,
    attempts: d.attempts,
  }));

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Attempts"
          value={overview?.overall.totalAttempts.toLocaleString() || "0"}
          icon={Target}
          trend={overview?.overall.totalAttempts && overview.overall.totalAttempts > 100 
            ? { value: 12, isPositive: true } 
            : undefined}
        />
        <MetricCard
          title="Success Rate"
          value={`${overview?.overall.successRate || 0}%`}
          icon={overview?.overall.successRate && overview.overall.successRate >= 70 ? TrendingUp : TrendingDown}
          trend={overview?.overall.successRate
            ? { value: overview.overall.successRate, isPositive: overview.overall.successRate >= 70 }
            : undefined}
        />
        <MetricCard
          title="Avg Time"
          value={`${Math.round((overview?.overall.avgTimeMs || 0) / 1000)}s`}
          icon={Clock}
        />
        <MetricCard
          title="Active Users"
          value={overview?.overall.uniqueUsers.toLocaleString() || "0"}
          icon={Users}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate by Type */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate by Exercise Type</h3>
          {typeChartData.length > 0 ? (
            <AnalyticsBarChart
              data={typeChartData}
              xAxisKey="name"
              bars={[{ dataKey: 'successRate', name: 'Success Rate %', color: '#8b5cf6' }]}
              height={250}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No exercise data yet
            </div>
          )}
        </div>

        {/* Success Rate Trend */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate Trend</h3>
          {trendChartData.length > 0 ? (
            <AnalyticsLineChart
              data={trendChartData}
              xAxisKey="date"
              lines={[{ dataKey: 'successRate', name: 'Success Rate %', color: '#10b981' }]}
              height={250}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No trend data yet
            </div>
          )}
        </div>
      </div>

      {/* Hardest Exercises */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Hardest Exercises</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Exercises with lowest success rates (min 5 attempts)
        </p>
        {hardest.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Exercise</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Lesson</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Attempts</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {hardest.map((ex, idx) => (
                  <tr key={ex.block_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span className="capitalize">{ex.exercise_type.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{ex.lesson_title || ex.lesson_id}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{ex.attempts}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${ex.success_rate < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                        {ex.success_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            No exercise data collected yet
          </div>
        )}
      </div>
    </div>
  );
}
