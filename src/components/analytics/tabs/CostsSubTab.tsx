/**
 * CostsSubTab Component
 * Displays comprehensive cost breakdown for AI and audio generation
 */

import { useEffect, useState } from 'react';
import { DollarSign, Cpu, Mic, TrendingUp, AlertTriangle } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { AnalyticsAreaChart } from '../charts/AnalyticsAreaChart';
import { AnalyticsBarChart } from '../charts/AnalyticsBarChart';
import {
  getCostsAnalytics,
  formatCost,
  formatPerDollar,
  formatNumber,
  type CostsAnalytics,
} from '@/services/analyticsAPI';
import { logger } from '@/utils/logger';
import type { DateRange } from '../DateRangePicker';

interface CostsSubTabProps {
  dateRange: DateRange;
}

export function CostsSubTab({ dateRange }: CostsSubTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CostsAnalytics | null>(null);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const result = await getCostsAnalytics(dateRange.from, dateRange.to);
      setData(result);
    } catch (err: unknown) {
      logger.error('Failed to load costs analytics:', err);
      // Extract detailed error message
      let errorMessage = 'Failed to load data';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      // Check for API error response
      if (typeof err === 'object' && err !== null && 'error' in err) {
        errorMessage = String((err as { error: string }).error);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
          <p className="text-red-600 font-medium mb-2">Failed to load costs data</p>
          <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-lg font-mono break-all">
            {error}
          </p>
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

  // Prepare chart data - separate for each service
  const openAIChartData = data?.daily.map(d => ({
    date: d.date,
    cost: Number(d.aiCost.toFixed(4)),
  })) || [];

  const elevenLabsChartData = data?.daily.map(d => ({
    date: d.date,
    cost: Number(d.audioCost.toFixed(4)),
  })) || [];

  const aiByTypeChartData = data?.aiByType
    .filter(t => t.cost > 0)
    .slice(0, 6)
    .map(t => ({
      name: t.type.length > 20 ? t.type.substring(0, 20) + '...' : t.type,
      cost: Number(t.cost.toFixed(4)),
      requests: t.requests,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total AI Cost"
          value={formatCost(data?.summary.totalAICost || 0)}
          subtitle={formatPerDollar(data?.summary.storiesPerDollarAI || 0) + ' stories'}
          icon={Cpu}
          iconColor="text-purple-600"
          loading={loading}
        />
        <MetricCard
          title="Total Audio Cost"
          value={formatCost(data?.summary.totalAudioCost || 0)}
          subtitle={formatPerDollar(data?.summary.segmentsPerDollarAudio || 0) + ' segments'}
          icon={Mic}
          iconColor="text-blue-600"
          loading={loading}
        />
        <MetricCard
          title="Combined Total"
          value={formatCost(data?.summary.totalCombined || 0)}
          subtitle={`Avg ${formatCost(data?.summary.avgCostPerStory || 0)}/story`}
          icon={DollarSign}
          iconColor="text-green-600"
          loading={loading}
        />
        <MetricCard
          title="Best Value"
          value={data?.summary.totalAudioCost && data.summary.totalAICost 
            ? data.summary.totalAudioCost > data.summary.totalAICost * 10 
              ? '🤖 AI is cheap!' 
              : '🎤 Audio is cheap!'
            : '—'}
          subtitle="Relative cost comparison"
          icon={TrendingUp}
          iconColor="text-amber-600"
          loading={loading}
        />
      </div>

      {/* Two Separate Cost Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenAI Daily Costs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">OpenAI Usage</h3>
                <p className="text-sm text-gray-500">Daily AI generation costs</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-purple-600">
                {formatCost(data?.summary.totalAICost || 0)}
              </span>
              <p className="text-xs text-gray-500">total</p>
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] bg-gray-100 animate-pulse rounded-lg" />
          ) : openAIChartData.some(d => d.cost > 0) ? (
            <AnalyticsAreaChart
              data={openAIChartData}
              xAxisKey="date"
              areas={[
                { dataKey: 'cost', name: 'Cost ($)', color: '#8b5cf6', fillOpacity: 0.4 },
              ]}
              height={220}
              formatXAxis={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">
              No AI costs recorded yet
            </div>
          )}
        </div>

        {/* ElevenLabs Daily Costs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ElevenLabs Usage</h3>
                <p className="text-sm text-gray-500">Daily audio generation costs</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-blue-600">
                {formatCost(data?.summary.totalAudioCost || 0)}
              </span>
              <p className="text-xs text-gray-500">total</p>
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] bg-gray-100 animate-pulse rounded-lg" />
          ) : elevenLabsChartData.some(d => d.cost > 0) ? (
            <AnalyticsAreaChart
              data={elevenLabsChartData}
              xAxisKey="date"
              areas={[
                { dataKey: 'cost', name: 'Cost ($)', color: '#3b82f6', fillOpacity: 0.4 },
              ]}
              height={220}
              formatXAxis={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">
              No audio costs recorded yet
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Costs by Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Costs by Usage Type</h3>
          </div>
          {loading ? (
            <div className="h-[260px] bg-gray-100 animate-pulse rounded-lg" />
          ) : aiByTypeChartData.length > 0 ? (
            <AnalyticsBarChart
              data={aiByTypeChartData}
              xAxisKey="name"
              bars={[{ dataKey: 'cost', name: 'Cost ($)', color: '#8b5cf6' }]}
              height={260}
            />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400">
              No AI usage data
            </div>
          )}
        </div>

        {/* ElevenLabs Audio Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">ElevenLabs Audio</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : data?.audio ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${data.audio.configured ? 'text-green-600' : 'text-red-600'}`}>
                  {data.audio.configured ? '✅ Configured' : '❌ Not Configured'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Characters Used</span>
                <span className="font-medium text-gray-900">{formatNumber(data.audio.charactersUsed)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Segments Generated</span>
                <span className="font-medium text-gray-900">{formatNumber(data.audio.segmentsGenerated)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Estimated Cost</span>
                <span className="font-medium text-green-600">{formatCost(data.audio.estimatedCost)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Cost per Segment</span>
                <span className="font-medium text-gray-900">{formatCost(data.audio.costPerSegment)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Segments per $1</span>
                <span className="font-medium text-purple-600">{formatPerDollar(data.audio.segmentsPerDollar)}</span>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                💡 ElevenLabs pricing: ${data.audio.costPer1kChars}/1K characters (Starter plan)
              </div>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400">
              No audio data
            </div>
          )}
        </div>
      </div>

      {/* AI Costs by Model Table */}
      {data?.aiByModel && data.aiByModel.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-600" />
              Cost by Model
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Model</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Requests</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Tokens</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Total Cost</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">$/1K Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.aiByModel.map((model) => (
                  <tr key={model.model} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{model.model}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNumber(model.requests)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNumber(model.tokens)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCost(model.cost)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCost(model.costPer1kTokens)}</td>
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

