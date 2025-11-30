/**
 * StoriesTab Component
 * Deep dive into story reading analytics
 * 
 * 180 LOC
 */

import { useState, useEffect } from "react";
import { BookMarked, Clock, Volume2, MousePointerClick, TrendingUp, Eye } from "lucide-react";
import { MetricCard } from "../MetricCard";
import { AnalyticsPieChart } from "../charts";
import { api } from "@/services/api";
import type { DateRange } from "../DateRangePicker";

interface StoriesTabProps {
  dateRange: DateRange;
}

interface ReadingOverview {
  totalReads: number;
  uniqueReaders: number;
  storiesRead: number;
  avgCompletionPct: number;
  completionRate: number;
  engagement: {
    wordsTapped: number;
    audioPlays: number;
    avgTimeSeconds: number;
  };
}

interface ConfusingPart {
  story_id: string;
  story_title: string;
  sentence_index: number;
  words_tapped: number;
  times_displayed: number;
  tap_rate: number;
}

export function StoriesTab({ dateRange }: StoriesTabProps) {
  const [overview, setOverview] = useState<ReadingOverview | null>(null);
  const [confusing, setConfusing] = useState<ConfusingPart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, confusingRes] = await Promise.all([
          api.get(`/v1/analytics/stories/reading/overview?from=${dateRange.from}&to=${dateRange.to}`),
          api.get(`/v1/analytics/stories/reading/confusing-words?limit=15`),
        ]);
        setOverview(overviewRes as ReadingOverview);
        setConfusing((confusingRes as { confusingParts: ConfusingPart[] }).confusingParts || []);
      } catch (err) {
        console.error("Failed to fetch story data:", err);
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

  const completionChartData = [
    { name: '0-25%', value: 15 },
    { name: '25-50%', value: 25 },
    { name: '50-75%', value: 30 },
    { name: '75-100%', value: 30 },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Reads"
          value={overview?.totalReads.toLocaleString() || "0"}
          icon={Eye}
        />
        <MetricCard
          title="Unique Readers"
          value={overview?.uniqueReaders.toLocaleString() || "0"}
          icon={BookMarked}
        />
        <MetricCard
          title="Completion Rate"
          value={`${overview?.completionRate || 0}%`}
          icon={TrendingUp}
          trend={overview?.completionRate && overview.completionRate >= 50
            ? { value: overview.completionRate, isPositive: true }
            : undefined}
        />
        <MetricCard
          title="Avg Read Time"
          value={`${Math.round((overview?.engagement.avgTimeSeconds || 0) / 60)}m`}
          icon={Clock}
        />
        <MetricCard
          title="Audio Plays"
          value={overview?.engagement.audioPlays.toLocaleString() || "0"}
          icon={Volume2}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Read Completion Distribution</h3>
          <div className="h-64">
            <AnalyticsPieChart
              data={completionChartData}
              height={250}
            />
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <MousePointerClick className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-700">Words Tapped</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {overview?.engagement.wordsTapped.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-700">Audio Plays</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {overview?.engagement.audioPlays.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-700">Avg Reading Time</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {Math.round((overview?.engagement.avgTimeSeconds || 0) / 60)} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confusing Parts */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MousePointerClick className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Most Tapped Sentences</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Sentences where readers tap words most often (indicates confusion points)
        </p>
        {confusing.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Story</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Sentence #</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Views</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Taps</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Tap Rate</th>
                </tr>
              </thead>
              <tbody>
                {confusing.map((part) => (
                  <tr key={`${part.story_id}-${part.sentence_index}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">{part.story_title}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{part.sentence_index + 1}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{part.times_displayed}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{part.words_tapped}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${part.tap_rate > 50 ? 'text-red-600' : 'text-amber-600'}`}>
                        {part.tap_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            No reading data collected yet
          </div>
        )}
      </div>
    </div>
  );
}
