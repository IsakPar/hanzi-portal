/**
 * VocabPerformanceSection Component
 * Displays vocabulary performance overview and difficulty analysis
 * 
 * 180 LOC
 */

import { Library, CheckCircle, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import type { VocabProgress, HskBreakdown } from '@/services/analyticsAPI';
import { AnalyticsPieChart } from '../charts/AnalyticsPieChart';
import { AnalyticsBarChart } from '../charts/AnalyticsBarChart';

interface VocabPerformanceSectionProps {
  vocabProgress: VocabProgress | null;
  hskBreakdown: HskBreakdown[];
  loading: boolean;
}

export function VocabPerformanceSection({ vocabProgress, hskBreakdown, loading }: VocabPerformanceSectionProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100" />
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Prepare vocab stage data for pie chart
  const vocabStageData = vocabProgress ? [
    { name: 'New', value: vocabProgress.new },
    { name: 'Weak', value: vocabProgress.weak },
    { name: 'Learning', value: vocabProgress.learning },
    { name: 'Mastered', value: vocabProgress.mastered },
  ].filter(d => d.value > 0) : [];

  // Prepare HSK vocab breakdown data
  const hskVocabData = hskBreakdown.map(h => ({
    level: `HSK ${h.level}`,
    vocabulary: h.vocabulary,
    completions: h.completions,
  }));

  const totalWords = vocabProgress?.total || 0;
  const masteredPercent = totalWords > 0 
    ? ((vocabProgress?.mastered || 0) / totalWords * 100).toFixed(1) 
    : 0;
  const weakPercent = totalWords > 0 
    ? ((vocabProgress?.weak || 0) / totalWords * 100).toFixed(1) 
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <Library className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-gray-900">Vocabulary Performance</h3>
        <span className="text-sm text-gray-500">({totalWords.toLocaleString()} words)</span>
      </div>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-700">{vocabProgress?.mastered || 0}</p>
            <p className="text-sm text-emerald-600">Mastered</p>
            <p className="text-xs text-emerald-500 mt-1">{masteredPercent}% of total</p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{vocabProgress?.learning || 0}</p>
            <p className="text-sm text-blue-600">Learning</p>
            <p className="text-xs text-blue-500 mt-1">In progress</p>
          </div>
          
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-700">{vocabProgress?.weak || 0}</p>
            <p className="text-sm text-amber-600">Weak</p>
            <p className="text-xs text-amber-500 mt-1">{weakPercent}% need review</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <Target className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-700">{vocabProgress?.new || 0}</p>
            <p className="text-sm text-gray-600">New</p>
            <p className="text-xs text-gray-500 mt-1">Not started</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Stage Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Learning Stage Distribution</h4>
            {vocabStageData.length > 0 ? (
              <AnalyticsPieChart
                data={vocabStageData}
                height={220}
                innerRadius={45}
                outerRadius={75}
                colors={['#94a3b8', '#f59e0b', '#3b82f6', '#10b981']}
              />
            ) : (
              <div className="h-[220px] bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <p className="text-sm">No vocabulary data yet</p>
              </div>
            )}
          </div>

          {/* HSK Level Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Vocabulary by HSK Level</h4>
            {hskVocabData.length > 0 ? (
              <AnalyticsBarChart
                data={hskVocabData}
                xAxisKey="level"
                bars={[
                  { dataKey: 'vocabulary', name: 'Total Words', color: '#10b981' },
                ]}
                height={220}
              />
            ) : (
              <div className="h-[220px] bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <p className="text-sm">No HSK data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        {totalWords > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <h4 className="text-sm font-semibold text-green-800 mb-2">📊 Vocabulary Insights</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>{masteredPercent}%</strong> of vocabulary has been mastered</li>
              {Number(weakPercent) > 20 && (
                <li>• <strong>{weakPercent}%</strong> of words need more practice - consider review sessions</li>
              )}
              {hskBreakdown.length > 0 && (
                <li>• Most active level: <strong>HSK {hskBreakdown.reduce((max, h) => h.completions > max.completions ? h : max).level}</strong></li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

