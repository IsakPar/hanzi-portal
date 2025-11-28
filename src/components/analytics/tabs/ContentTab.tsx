/**
 * ContentTab Component
 * Content analytics with sub-tabs for lessons, stories, and vocabulary
 * Phase 3b: Full exposure of per-item performance metrics
 * 
 * 380 LOC
 */

import { useEffect, useState } from 'react';
import { BookOpen, FileText, Library, TrendingUp, AlertCircle, LayoutGrid, BarChart3 } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { AnalyticsLineChart } from '../charts/AnalyticsLineChart';
import type { DateRange } from '../DateRangePicker';
import {
  getContentOverview,
  getContentEngagementData,
  getHskBreakdown,
  getVocabProgress,
  getEngagementOverview,
  getAllLessonEngagementStats,
  getAllStoryEngagementStats,
  type ContentOverview,
  type ContentEngagementData,
  type HskBreakdown,
  type VocabProgress,
  type EngagementOverview,
  type LessonEngagementStats,
  type StoryEngagementStats,
} from '@/services/analyticsAPI';
import { logger } from '@/utils/logger';
import { LessonPerformanceTable, StoryPerformanceTable, VocabPerformanceSection, ContentDetailDrawer } from '../content';

interface ContentTabProps {
  dateRange: DateRange;
}

type ContentSubTab = 'overview' | 'lessons' | 'stories' | 'vocabulary';

export function ContentTab({ dateRange }: ContentTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ContentSubTab>('overview');
  
  // Data states
  const [overview, setOverview] = useState<ContentOverview | null>(null);
  const [engagementData, setEngagementData] = useState<ContentEngagementData[]>([]);
  const [hskBreakdown, setHskBreakdown] = useState<HskBreakdown[]>([]);
  const [vocabProgress, setVocabProgress] = useState<VocabProgress | null>(null);
  const [engagementOverview, setEngagementOverview] = useState<EngagementOverview | null>(null);
  const [lessonStats, setLessonStats] = useState<LessonEngagementStats[]>([]);
  const [storyStats, setStoryStats] = useState<StoryEngagementStats[]>([]);
  
  // Detail drawer state
  const [selectedLesson, setSelectedLesson] = useState<LessonEngagementStats | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryEngagementStats | null>(null);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const daysDiff = Math.ceil(
        (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)
      );

      const [overviewData, engagement, hsk, vocab, engOverview, lessonEngagement, storyEngagement] = await Promise.all([
        getContentOverview(),
        getContentEngagementData(daysDiff),
        getHskBreakdown(),
        getVocabProgress(),
        getEngagementOverview(dateRange.from, dateRange.to).catch(() => null),
        getAllLessonEngagementStats({ limit: 100, orderBy: 'completions' }).catch(() => []),
        getAllStoryEngagementStats({ limit: 100, orderBy: 'completions' }).catch(() => []),
      ]);

      setOverview(overviewData);
      setEngagementData(engagement);
      setHskBreakdown(hsk);
      setVocabProgress(vocab);
      setEngagementOverview(engOverview);
      setLessonStats(lessonEngagement);
      setStoryStats(storyEngagement);
    } catch (err) {
      logger.error('Failed to load content analytics:', err);
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

  // Sub-tab navigation
  const subTabs: { id: ContentSubTab; label: string; icon: typeof BookOpen; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'lessons', label: 'Lessons', icon: BookOpen, count: lessonStats.length },
    { id: 'stories', label: 'Stories', icon: FileText, count: storyStats.length },
    { id: 'vocabulary', label: 'Vocabulary', icon: Library },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex gap-1">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSubTab === tab.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeSubTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Lessons"
              value={overview?.lessons.total.toLocaleString() || '—'}
              subtitle={`${overview?.lessons.published || 0} published`}
              icon={BookOpen}
              iconColor="text-blue-600"
              loading={loading}
            />
            <MetricCard
              title="Total Stories"
              value={overview?.stories.total.toLocaleString() || '—'}
              subtitle={`${overview?.stories.published || 0} published`}
              icon={FileText}
              iconColor="text-purple-600"
              loading={loading}
            />
            <MetricCard
              title="Vocabulary Items"
              value={overview?.vocabulary.total.toLocaleString() || '—'}
              subtitle={`${overview?.vocabulary.wordsMastered || 0} mastered`}
              icon={Library}
              iconColor="text-green-600"
              loading={loading}
            />
            <MetricCard
              title="Avg Completion Rate"
              value={engagementOverview ? `${engagementOverview.lessons.avgCompletionRate.toFixed(1)}%` : '—'}
              subtitle="Lessons"
              icon={TrendingUp}
              iconColor="text-amber-600"
              loading={loading}
            />
          </div>

          {/* Engagement Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Content Engagement</h3>
                <p className="text-sm text-gray-500">Activity over time</p>
              </div>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            {loading ? (
              <div className="h-[280px] bg-gray-100 animate-pulse rounded-lg" />
            ) : engagementData.length > 0 ? (
              <AnalyticsLineChart
                data={engagementData}
                xAxisKey="date"
                lines={[
                  { dataKey: 'lessons', name: 'Lessons', color: '#3b82f6' },
                  { dataKey: 'stories', name: 'Stories', color: '#8b5cf6' },
                  { dataKey: 'vocabulary', name: 'Vocabulary', color: '#10b981' },
                ]}
                height={280}
                formatXAxis={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                No engagement data yet
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {engagementOverview && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Lessons</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">{engagementOverview.lessons.totalCompletions}</p>
                <p className="text-sm text-blue-700 mt-1">
                  completions • {engagementOverview.lessons.avgCompletionRate.toFixed(1)}% rate
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">Stories</span>
                </div>
                <p className="text-3xl font-bold text-purple-900">{engagementOverview.stories.totalCompletions}</p>
                <p className="text-sm text-purple-700 mt-1">
                  completions • {engagementOverview.stories.avgCompletionRate.toFixed(1)}% rate
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <Library className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Vocabulary</span>
                </div>
                <p className="text-3xl font-bold text-green-900">{engagementOverview.vocab.totalReviews}</p>
                <p className="text-sm text-green-700 mt-1">
                  reviews • {engagementOverview.vocab.avgAccuracyRate.toFixed(1)}% accuracy
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lessons Tab */}
      {activeSubTab === 'lessons' && (
        <LessonPerformanceTable
          lessons={lessonStats}
          loading={loading}
          onSelect={(lesson) => setSelectedLesson(lesson)}
        />
      )}

      {/* Stories Tab */}
      {activeSubTab === 'stories' && (
        <StoryPerformanceTable
          stories={storyStats}
          loading={loading}
          onSelect={(story) => setSelectedStory(story)}
        />
      )}

      {/* Vocabulary Tab */}
      {activeSubTab === 'vocabulary' && (
        <VocabPerformanceSection
          vocabProgress={vocabProgress}
          hskBreakdown={hskBreakdown}
          loading={loading}
        />
      )}

      {/* Detail Drawer */}
      <ContentDetailDrawer
        isOpen={!!selectedLesson}
        onClose={() => setSelectedLesson(null)}
        type="lesson"
        lessonData={selectedLesson || undefined}
      />
      <ContentDetailDrawer
        isOpen={!!selectedStory}
        onClose={() => setSelectedStory(null)}
        type="story"
        storyData={selectedStory || undefined}
      />
    </div>
  );
}
