/**
 * ContentDetailDrawer Component
 * Slide-over panel showing detailed performance for a single lesson or story
 * 
 * 280 LOC
 */

import { X, BookOpen, FileText, Clock, Target, TrendingUp, Award, Users, Timer, BarChart3 } from 'lucide-react';
import type { LessonEngagementStats, StoryEngagementStats } from '@/services/analyticsAPI';
import { AnalyticsBarChart } from '../charts/AnalyticsBarChart';

interface ContentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'lesson' | 'story';
  lessonData?: LessonEngagementStats;
  storyData?: StoryEngagementStats;
}

export function ContentDetailDrawer({ isOpen, onClose, type, lessonData, storyData }: ContentDetailDrawerProps) {
  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const getPerformanceGrade = (rate: number): { grade: string; color: string; label: string } => {
    if (rate >= 80) return { grade: 'A', color: 'text-emerald-600 bg-emerald-100', label: 'Excellent' };
    if (rate >= 60) return { grade: 'B', color: 'text-blue-600 bg-blue-100', label: 'Good' };
    if (rate >= 40) return { grade: 'C', color: 'text-amber-600 bg-amber-100', label: 'Average' };
    return { grade: 'D', color: 'text-red-600 bg-red-100', label: 'Needs Work' };
  };

  // Block stats chart data for lessons
  const blockChartData = lessonData?.blockStats?.map((block, index) => ({
    block: `Block ${index + 1}`,
    type: block.type,
    avgTime: block.avgTime,
    completions: block.completions,
    dropOffs: block.dropOffs,
  })) || [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${type === 'lesson' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {type === 'lesson' ? (
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
              ) : (
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 truncate max-w-[280px]">
                  {type === 'lesson' ? (lessonData?.title || lessonData?.lessonId) : (storyData?.title || storyData?.storyId)}
                </h2>
                <p className="text-sm text-gray-500">
                  HSK {type === 'lesson' ? lessonData?.hskLevel : storyData?.hskLevel} • {type === 'lesson' ? 'Lesson' : 'Story'} Performance
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Grade */}
          {type === 'lesson' && lessonData && (
            <>
              {(() => {
                const performance = getPerformanceGrade(lessonData.completionRate);
                return (
                  <div className="text-center p-6 bg-gray-50 rounded-2xl">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${performance.color} mb-3`}>
                      <span className="text-4xl font-bold">{performance.grade}</span>
                    </div>
                    <p className="font-semibold text-gray-900">{performance.label} Performance</p>
                    <p className="text-sm text-gray-500 mt-1">{lessonData.completionRate.toFixed(1)}% completion rate</p>
                  </div>
                );
              })()}
            </>
          )}

          {type === 'story' && storyData && (
            <>
              {(() => {
                const performance = getPerformanceGrade(storyData.completionRate);
                return (
                  <div className="text-center p-6 bg-gray-50 rounded-2xl">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${performance.color} mb-3`}>
                      <span className="text-4xl font-bold">{performance.grade}</span>
                    </div>
                    <p className="font-semibold text-gray-900">{performance.label} Performance</p>
                    <p className="text-sm text-gray-500 mt-1">{storyData.completionRate.toFixed(1)}% completion rate</p>
                  </div>
                );
              })()}
            </>
          )}

          {/* Key Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {type === 'lesson' && lessonData && (
                <>
                  <MetricBox 
                    icon={Users} 
                    label="Total Starts" 
                    value={lessonData.totalStarts.toLocaleString()} 
                    color="blue"
                  />
                  <MetricBox 
                    icon={Target} 
                    label="Completions" 
                    value={lessonData.totalCompletions.toLocaleString()} 
                    color="green"
                  />
                  <MetricBox 
                    icon={Clock} 
                    label="Avg Time" 
                    value={formatTime(lessonData.avgTimeSeconds)} 
                    color="amber"
                  />
                  <MetricBox 
                    icon={Award} 
                    label="Avg Score" 
                    value={lessonData.avgScore > 0 ? `${lessonData.avgScore.toFixed(0)}%` : '—'} 
                    color="purple"
                  />
                </>
              )}
              {type === 'story' && storyData && (
                <>
                  <MetricBox 
                    icon={Users} 
                    label="Total Starts" 
                    value={storyData.totalStarts.toLocaleString()} 
                    color="purple"
                  />
                  <MetricBox 
                    icon={Target} 
                    label="Completions" 
                    value={storyData.totalCompletions.toLocaleString()} 
                    color="green"
                  />
                  <MetricBox 
                    icon={Clock} 
                    label="Avg Time" 
                    value={formatTime(storyData.avgTimeSeconds)} 
                    color="amber"
                  />
                  <MetricBox 
                    icon={BookOpen} 
                    label="Avg Sentences" 
                    value={storyData.avgSentencesRead > 0 ? storyData.avgSentencesRead.toFixed(1) : '—'} 
                    color="blue"
                  />
                </>
              )}
            </div>
          </div>

          {/* Time Distribution (Lesson only) */}
          {type === 'lesson' && lessonData && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Time Distribution
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <TimeBar label="Minimum" value={lessonData.minTimeSeconds} max={lessonData.maxTimeSeconds} color="blue" />
                <TimeBar label="Median" value={lessonData.medianTimeSeconds} max={lessonData.maxTimeSeconds} color="green" />
                <TimeBar label="Average" value={lessonData.avgTimeSeconds} max={lessonData.maxTimeSeconds} color="amber" />
                <TimeBar label="P90" value={lessonData.p90TimeSeconds} max={lessonData.maxTimeSeconds} color="purple" />
                <TimeBar label="Maximum" value={lessonData.maxTimeSeconds} max={lessonData.maxTimeSeconds} color="red" />
              </div>
            </div>
          )}

          {/* Block Performance (Lesson only) */}
          {type === 'lesson' && blockChartData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Block Performance
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <AnalyticsBarChart
                  data={blockChartData}
                  xAxisKey="block"
                  bars={[
                    { dataKey: 'avgTime', name: 'Avg Time (s)', color: '#3b82f6' },
                    { dataKey: 'completions', name: 'Completions', color: '#10b981' },
                  ]}
                  height={200}
                  showLegend
                />
              </div>
              
              {/* Block Details Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-600 font-medium">Block</th>
                      <th className="text-left py-2 text-gray-600 font-medium">Type</th>
                      <th className="text-right py-2 text-gray-600 font-medium">Avg Time</th>
                      <th className="text-right py-2 text-gray-600 font-medium">Drop-offs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockChartData.map((block, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 font-medium text-gray-900">{block.block}</td>
                        <td className="py-2 text-gray-600 capitalize">{block.type}</td>
                        <td className="py-2 text-right text-gray-600">{formatTime(block.avgTime)}</td>
                        <td className="py-2 text-right">
                          {block.dropOffs > 0 ? (
                            <span className="text-red-600 font-medium">{block.dropOffs}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Last Activity */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
            Last activity: {
              type === 'lesson' && lessonData?.lastEventAt 
                ? new Date(lessonData.lastEventAt).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })
                : type === 'story' && storyData?.lastEventAt
                ? new Date(storyData.lastEventAt).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })
                : 'Never'
            }
          </div>
        </div>
      </div>
    </>
  );
}

// Helper Components

function MetricBox({ icon: Icon, label, value, color }: { 
  icon: typeof Users; 
  label: string; 
  value: string; 
  color: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className={`rounded-xl p-3 ${colors[color].split(' ')[0]}`}>
      <Icon className={`w-4 h-4 ${colors[color].split(' ')[1]} mb-1`} />
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

function TimeBar({ label, value, max, color }: { 
  label: string; 
  value: number; 
  max: number; 
  color: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
  };

  const percentage = max > 0 ? (value / max) * 100 : 0;
  const formatTime = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-16">{label}</span>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[color]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-16 text-right">{formatTime(value)}</span>
    </div>
  );
}

