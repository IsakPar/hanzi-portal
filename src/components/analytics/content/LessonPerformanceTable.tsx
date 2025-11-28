/**
 * LessonPerformanceTable Component
 * Displays detailed performance metrics for all lessons
 * 
 * 220 LOC
 */

import { useState, useMemo } from 'react';
import { BookOpen, Clock, Target, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import type { LessonEngagementStats } from '@/services/analyticsAPI';

interface LessonPerformanceTableProps {
  lessons: LessonEngagementStats[];
  loading: boolean;
  onSelect?: (lesson: LessonEngagementStats) => void;
}

type SortKey = 'title' | 'hskLevel' | 'totalStarts' | 'totalCompletions' | 'completionRate' | 'avgTimeSeconds' | 'avgScore';
type SortDirection = 'asc' | 'desc';

export function LessonPerformanceTable({ lessons, loading, onSelect }: LessonPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalCompletions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hskFilter, setHskFilter] = useState<number | null>(null);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedLessons = useMemo(() => {
    let filtered = hskFilter ? lessons.filter(l => l.hskLevel === hskFilter) : lessons;
    
    return [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? 0;
      let bVal: string | number = b[sortKey] ?? 0;
      
      if (sortKey === 'title') {
        aVal = a.title || a.lessonId;
        bVal = b.title || b.lessonId;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [lessons, sortKey, sortDirection, hskFilter]);

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const getPerformanceColor = (rate: number, type: 'completion' | 'score') => {
    const thresholds = type === 'completion' 
      ? { good: 60, medium: 40 }
      : { good: 75, medium: 50 };
    
    if (rate >= thresholds.good) return 'text-emerald-600 bg-emerald-50';
    if (rate >= thresholds.medium) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-t border-gray-100 flex items-center px-4 gap-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header with filter */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Lesson Performance</h3>
          <span className="text-sm text-gray-500">({sortedLessons.length} lessons)</span>
        </div>
        
        {/* HSK Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={hskFilter ?? ''}
            onChange={(e) => setHskFilter(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
          >
            <option value="">All HSK Levels</option>
            {[1, 2, 3, 4, 5, 6].map(level => (
              <option key={level} value={level}>HSK {level}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortHeader label="Lesson" sortKeyName="title" />
              <SortHeader label="HSK" sortKeyName="hskLevel" />
              <SortHeader label="Starts" sortKeyName="totalStarts" />
              <SortHeader label="Completions" sortKeyName="totalCompletions" />
              <SortHeader label="Rate" sortKeyName="completionRate" />
              <SortHeader label="Avg Time" sortKeyName="avgTimeSeconds" />
              <SortHeader label="Avg Score" sortKeyName="avgScore" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedLessons.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No lesson engagement data yet</p>
                  <p className="text-sm mt-1">Data will appear as users complete lessons</p>
                </td>
              </tr>
            ) : (
              sortedLessons.map((lesson) => (
                <tr
                  key={lesson.lessonId}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  onClick={() => onSelect?.(lesson)}
                >
                  <td className="px-4 py-3">
                    <div className="max-w-[250px]">
                      <p className="font-medium text-gray-900 truncate">
                        {lesson.title || lesson.lessonId}
                      </p>
                      {lesson.lastEventAt && (
                        <p className="text-xs text-gray-400">
                          Last activity: {new Date(lesson.lastEventAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      HSK {lesson.hskLevel || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-medium">
                    {lesson.totalStarts.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-medium">
                    {lesson.totalCompletions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${getPerformanceColor(lesson.completionRate, 'completion')}`}>
                      {lesson.completionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {formatTime(lesson.avgTimeSeconds)}
                    </div>
                    {lesson.medianTimeSeconds > 0 && lesson.medianTimeSeconds !== lesson.avgTimeSeconds && (
                      <p className="text-xs text-gray-400">median: {formatTime(lesson.medianTimeSeconds)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lesson.avgScore > 0 ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${getPerformanceColor(lesson.avgScore, 'score')}`}>
                        {lesson.avgScore.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lesson.completionRate >= 60 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : lesson.completionRate >= 40 ? (
                      <Target className="w-5 h-5 text-amber-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

