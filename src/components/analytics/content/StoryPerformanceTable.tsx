/**
 * StoryPerformanceTable Component
 * Displays detailed performance metrics for all stories
 * 
 * 200 LOC
 */

import { useState, useMemo } from 'react';
import { FileText, Clock, Target, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Filter, BookOpen } from 'lucide-react';
import type { StoryEngagementStats } from '@/services/analyticsAPI';

interface StoryPerformanceTableProps {
  stories: StoryEngagementStats[];
  loading: boolean;
  onSelect?: (story: StoryEngagementStats) => void;
}

type SortKey = 'title' | 'hskLevel' | 'totalStarts' | 'totalCompletions' | 'completionRate' | 'avgTimeSeconds' | 'avgSentencesRead';
type SortDirection = 'asc' | 'desc';

export function StoryPerformanceTable({ stories, loading, onSelect }: StoryPerformanceTableProps) {
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

  const sortedStories = useMemo(() => {
    let filtered = hskFilter ? stories.filter(s => s.hskLevel === hskFilter) : stories;
    
    return [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? 0;
      let bVal: string | number = b[sortKey] ?? 0;
      
      if (sortKey === 'title') {
        aVal = a.title || a.storyId;
        bVal = b.title || b.storyId;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [stories, sortKey, sortDirection, hskFilter]);

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

  const getPerformanceColor = (rate: number) => {
    if (rate >= 60) return 'text-emerald-600 bg-emerald-50';
    if (rate >= 40) return 'text-amber-600 bg-amber-50';
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
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Story Performance</h3>
          <span className="text-sm text-gray-500">({sortedStories.length} stories)</span>
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
              <SortHeader label="Story" sortKeyName="title" />
              <SortHeader label="HSK" sortKeyName="hskLevel" />
              <SortHeader label="Starts" sortKeyName="totalStarts" />
              <SortHeader label="Completions" sortKeyName="totalCompletions" />
              <SortHeader label="Rate" sortKeyName="completionRate" />
              <SortHeader label="Avg Time" sortKeyName="avgTimeSeconds" />
              <SortHeader label="Avg Sentences" sortKeyName="avgSentencesRead" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedStories.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No story engagement data yet</p>
                  <p className="text-sm mt-1">Data will appear as users read stories</p>
                </td>
              </tr>
            ) : (
              sortedStories.map((story) => (
                <tr
                  key={story.storyId}
                  className="hover:bg-purple-50/50 cursor-pointer transition-colors"
                  onClick={() => onSelect?.(story)}
                >
                  <td className="px-4 py-3">
                    <div className="max-w-[250px]">
                      <p className="font-medium text-gray-900 truncate">
                        {story.title || story.storyId}
                      </p>
                      {story.lastEventAt && (
                        <p className="text-xs text-gray-400">
                          Last read: {new Date(story.lastEventAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      HSK {story.hskLevel || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-medium">
                    {story.totalStarts.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-medium">
                    {story.totalCompletions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${getPerformanceColor(story.completionRate)}`}>
                      {story.completionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {formatTime(story.avgTimeSeconds)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {story.avgSentencesRead > 0 ? (
                      <div className="flex items-center gap-1 text-gray-600">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                        {story.avgSentencesRead.toFixed(1)}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {story.completionRate >= 60 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : story.completionRate >= 40 ? (
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

