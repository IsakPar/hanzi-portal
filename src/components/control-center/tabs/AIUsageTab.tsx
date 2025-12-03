import { Zap, BookOpen } from 'lucide-react';
import type { AIUsageSummary, DailyUsage, DailyUsageByProvider, ProviderConfig, TutorUsageSummary } from '../types';

// Provider colors fallback
const PROVIDER_COLORS: Record<string, string> = {
  deepseek: '#0066FF',
  qwen: '#7C3AED',
  elevenlabs: '#10B981',
  cloudflare: '#F59E0B',
  other: '#6B7280',
};

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  elevenlabs: 'ElevenLabs',
  cloudflare: 'Cloudflare AI',
  other: 'Other',
};

// Chart data types
interface ChartDataPoint {
  date: string;
  deepseek: number;
  qwen: number;
  elevenlabs: number;
  other: number;
  total: number;
}

function prepareChartData(dailyByProvider: DailyUsageByProvider[]): ChartDataPoint[] {
  const byDate: Record<string, ChartDataPoint> = {};
  
  for (const entry of dailyByProvider) {
    if (!byDate[entry.date]) {
      byDate[entry.date] = { 
        date: entry.date, 
        deepseek: 0, 
        qwen: 0, 
        elevenlabs: 0, 
        other: 0,
        total: 0 
      };
    }
    const provider = entry.provider as keyof Omit<ChartDataPoint, 'date' | 'total'>;
    if (provider in byDate[entry.date]) {
      byDate[entry.date][provider] += entry.cost;
    } else {
      byDate[entry.date].other += entry.cost;
    }
    byDate[entry.date].total += entry.cost;
  }
  
  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

function CostChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return null;
  
  const maxCost = Math.max(...data.map(d => d.total), 0.001);
  const providers = ['deepseek', 'qwen', 'elevenlabs', 'other'] as const;
  
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {providers.filter(p => data.some(d => d[p] > 0)).map(provider => (
          <div key={provider} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: PROVIDER_COLORS[provider] }}
            />
            <span className="text-gray-600">{PROVIDER_LABELS[provider]}</span>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="flex items-end gap-1 h-48">
        {data.map((day, i) => {
          const barHeight = (day.total / maxCost) * 100;
          const deepseekH = day.total > 0 ? (day.deepseek / day.total) * barHeight : 0;
          const qwenH = day.total > 0 ? (day.qwen / day.total) * barHeight : 0;
          const elevenlabsH = day.total > 0 ? (day.elevenlabs / day.total) * barHeight : 0;
          const otherH = day.total > 0 ? (day.other / day.total) * barHeight : 0;
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center group">
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute -mt-20 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap">
                <div className="font-semibold">{day.date}</div>
                <div>Total: ${day.total.toFixed(4)}</div>
                {day.deepseek > 0 && <div>DeepSeek: ${day.deepseek.toFixed(4)}</div>}
                {day.qwen > 0 && <div>Qwen: ${day.qwen.toFixed(4)}</div>}
                {day.elevenlabs > 0 && <div>ElevenLabs: ${day.elevenlabs.toFixed(4)}</div>}
              </div>
              
              {/* Stacked bar */}
              <div 
                className="w-full flex flex-col-reverse rounded-t transition-all hover:opacity-80"
                style={{ height: `${Math.max(barHeight, 2)}%` }}
              >
                {otherH > 0 && (
                  <div style={{ height: `${otherH}%`, backgroundColor: PROVIDER_COLORS.other }} />
                )}
                {elevenlabsH > 0 && (
                  <div style={{ height: `${elevenlabsH}%`, backgroundColor: PROVIDER_COLORS.elevenlabs }} />
                )}
                {qwenH > 0 && (
                  <div style={{ height: `${qwenH}%`, backgroundColor: PROVIDER_COLORS.qwen }} />
                )}
                {deepseekH > 0 && (
                  <div style={{ height: `${deepseekH}%`, backgroundColor: PROVIDER_COLORS.deepseek }} className="rounded-t" />
                )}
              </div>
              
              {/* Date label */}
              <div className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-top-left w-8 truncate">
                {day.date.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Y-axis label */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>$0</span>
        <span>${maxCost.toFixed(4)}</span>
      </div>
    </div>
  );
}

function AITutorSection({ tutorSummary }: { tutorSummary: TutorUsageSummary }) {
  const maxDailyCost = Math.max(...tutorSummary.daily.map(d => d.cost), 0.0001);
  
  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 overflow-hidden">
      <div className="p-5 border-b border-violet-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI Tutor Lesson Generation</h3>
          <p className="text-sm text-gray-500">Mobile app personalized lessons (Qwen 32B)</p>
        </div>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="p-5 grid grid-cols-4 gap-4">
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Lessons</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{tutorSummary.totalLessons}</div>
          <div className="text-xs text-gray-400 mt-1">Generated for users</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Cost</div>
          <div className="text-2xl font-bold text-violet-600 mt-1">${tutorSummary.totalCost.toFixed(4)}</div>
          <div className="text-xs text-gray-400 mt-1">OpenRouter API</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Avg Cost/Lesson</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">${tutorSummary.avgCostPerLesson.toFixed(5)}</div>
          <div className="text-xs text-gray-400 mt-1">~$0.00039 target</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Avg Latency</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatLatency(tutorSummary.avgLatencyMs)}</div>
          <div className="text-xs text-gray-400 mt-1">AI calls only</div>
        </div>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-4">
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Tokens</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{tutorSummary.totalTokens.toLocaleString()}</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Avg Tokens/Lesson</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {tutorSummary.totalLessons > 0 
              ? Math.round(tutorSummary.totalTokens / tutorSummary.totalLessons).toLocaleString() 
              : 0}
          </div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Steps/Lesson</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {tutorSummary.recentLessons.length > 0 
              ? (tutorSummary.recentLessons.reduce((sum, l) => sum + l.steps, 0) / tutorSummary.recentLessons.length).toFixed(1)
              : '-'}
          </div>
          <div className="text-xs text-gray-400 mt-1">reading + practice + grammar</div>
        </div>
      </div>

      {/* Daily Chart */}
      {tutorSummary.daily.length > 0 && (
        <div className="px-5 pb-5">
          <div className="bg-white/70 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Lessons Generated Per Day</div>
            <div className="flex items-end gap-1 h-24">
              {tutorSummary.daily.slice(-14).reverse().map((day, i) => {
                const barHeight = (day.cost / maxDailyCost) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="hidden group-hover:block absolute -top-20 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap">
                      <div className="font-semibold">{day.date}</div>
                      <div>{day.lessons} lesson{day.lessons !== 1 ? 's' : ''}</div>
                      <div>${day.cost.toFixed(4)}</div>
                      <div>Avg latency: {formatLatency(day.avgLatencyMs)}</div>
                    </div>
                    <div 
                      className="w-full bg-violet-500 rounded-t transition-all hover:bg-violet-400"
                      style={{ height: `${Math.max(barHeight, 4)}%` }}
                    />
                    <div className="text-xs text-gray-500 mt-1">{day.lessons}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Lessons Table */}
      {tutorSummary.recentLessons.length > 0 && (
        <div className="border-t border-violet-100">
          <div className="p-4 bg-white/50">
            <div className="text-sm font-medium text-gray-700 mb-3">Recent User Generations</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-violet-100">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-left py-2 px-3 font-medium">Focus Words</th>
                    <th className="text-right py-2 px-3 font-medium">HSK</th>
                    <th className="text-right py-2 px-3 font-medium">Position</th>
                    <th className="text-right py-2 px-3 font-medium">Tokens</th>
                    <th className="text-right py-2 px-3 font-medium">Latency</th>
                    <th className="text-right py-2 px-3 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {tutorSummary.recentLessons.slice(0, 10).map((lesson) => (
                    <tr key={lesson.sessionId} className="border-b border-violet-50 hover:bg-violet-50/50">
                      <td className="py-2 px-3 font-medium">
                        {new Date(lesson.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-chinese">
                          {lesson.metadata?.focusWords?.slice(0, 3).join(', ') || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {lesson.metadata?.hskLevel || '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        L{lesson.metadata?.userLessonPosition || '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {(lesson.inputTokens + lesson.outputTokens).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {formatLatency(lesson.latencyMs)}
                      </td>
                      <td className="py-2 px-3 text-right text-violet-600 font-medium">
                        ${lesson.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AIUsageTabProps {
  summary: AIUsageSummary | null;
  daily: DailyUsage[];
  dailyByProvider: DailyUsageByProvider[];
  providers: Record<string, ProviderConfig>;
  tutorSummary: TutorUsageSummary | null;
  loading: boolean;
  timePeriod: '7' | '30' | '90' | '0';
  setTimePeriod: (v: '7' | '30' | '90' | '0') => void;
}

export function AIUsageTab({ 
  summary, 
  daily, 
  dailyByProvider,
  providers: _providers,
  tutorSummary,
  loading, 
  timePeriod, 
  setTimePeriod 
}: AIUsageTabProps) {
  void _providers;
  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const chartData = prepareChartData(dailyByProvider);
  const periodLabel = timePeriod === '0' ? 'All Time' : `Last ${timePeriod} Days`;

  const activeProviders = summary?.byProvider 
    ? Object.entries(summary.byProvider).filter(([_, data]) => data.requests > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header with Time Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Provider Analytics</h2>
          <p className="text-sm text-gray-500">
            {summary?.firstLogDate 
              ? `Tracking since ${summary.firstLogDate}` 
              : 'No data yet'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['7', '30', '90', '0'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                timePeriod === period
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {period === '0' ? 'All Time' : `${period}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-medium text-gray-500">Total Requests</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{summary.totalRequests.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">{periodLabel}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-medium text-gray-500">Total Tokens</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{summary.totalTokens.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">Characters for ElevenLabs</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-5">
            <div className="text-sm font-medium text-emerald-600">Total Cost</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">${summary.totalCost.toFixed(2)}</div>
            <div className="text-xs text-emerald-500 mt-1">{periodLabel}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-medium text-gray-500">Active Providers</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{activeProviders.length}</div>
            <div className="text-xs text-gray-400 mt-1">DeepSeek, Qwen, ElevenLabs</div>
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {activeProviders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Usage by Provider</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {activeProviders.map(([provider, data]) => {
              const color = PROVIDER_COLORS[provider] || PROVIDER_COLORS.other;
              const label = PROVIDER_LABELS[provider] || provider;
              const percentage = summary?.totalCost ? (data.cost / summary.totalCost) * 100 : 0;
              const isElevenLabs = provider === 'elevenlabs';
              
              return (
                <div key={provider} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {label.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{label}</div>
                        <div className="text-xs text-gray-500">
                          {data.models.length > 0 
                            ? data.models.slice(0, 2).join(', ') + (data.models.length > 2 ? ` +${data.models.length - 2}` : '')
                            : 'No models'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color }}>${data.cost.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</div>
                    </div>
                  </div>
                  
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Requests:</span>{' '}
                      <span className="font-medium">{data.requests.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">{isElevenLabs ? 'Characters:' : 'Tokens:'}</span>{' '}
                      <span className="font-medium">{data.tokens.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg/req:</span>{' '}
                      <span className="font-medium">
                        {data.requests > 0 ? Math.round(data.tokens / data.requests).toLocaleString() : 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost Over Time Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Cost Over Time by Provider</h3>
            <p className="text-sm text-gray-500 mt-1">Last 14 days of AI spending</p>
          </div>
          <div className="p-5">
            <CostChart data={chartData} />
          </div>
        </div>
      )}

      {/* AI Tutor Section */}
      {tutorSummary && tutorSummary.totalLessons > 0 && (
        <AITutorSection tutorSummary={tutorSummary} />
      )}

      {/* Daily Usage Table */}
      {daily.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Daily Usage</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-5 font-medium">Date</th>
                  <th className="text-right py-3 px-5 font-medium">Requests</th>
                  <th className="text-right py-3 px-5 font-medium">Tokens/Chars</th>
                  <th className="text-right py-3 px-5 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {daily.slice(0, 30).map((d, i) => (
                  <tr key={d.date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-3 px-5 font-medium">{d.date}</td>
                    <td className="text-right py-3 px-5">{d.requests.toLocaleString()}</td>
                    <td className="text-right py-3 px-5">{(d.tokens || 0).toLocaleString()}</td>
                    <td className="text-right py-3 px-5 text-emerald-600 font-medium">${(d.cost || 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!summary || summary.totalRequests === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Usage Data Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            AI usage will be tracked here when you use features like example sentence generation,
            vocabulary tagging, or audio synthesis.
          </p>
        </div>
      )}
    </div>
  );
}

