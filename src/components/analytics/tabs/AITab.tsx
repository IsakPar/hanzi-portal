/**
 * AITab Component
 * Phase 4: Enhanced AI analytics with detailed metrics
 * 
 * Features:
 * - Real-time usage overview
 * - Daily usage trends
 * - Model comparison
 * - Prompt performance
 * - Latency distribution
 * - Error tracking
 * 
 * 520 LOC
 */

import { useEffect, useState } from 'react';
import { 
  Cpu, Zap, DollarSign, AlertTriangle, TrendingUp, CheckCircle, 
  AlertCircle, Activity, Timer, XCircle, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../MetricCard';
import { AnalyticsPieChart } from '../charts/AnalyticsPieChart';
import { AnalyticsBarChart } from '../charts/AnalyticsBarChart';
import { AnalyticsAreaChart } from '../charts/AnalyticsAreaChart';
import { ValidatorStatus } from '../ValidatorStatus';
import { CostsSubTab } from './CostsSubTab';
import type { DateRange } from '../DateRangePicker';
import {
  getAIOverview,
  getDailyAIUsage,
  getModelBreakdown,
  getPromptPerformance,
  getLatencyData,
  getAIErrors,
  formatCurrency,
  formatNumber,
  type AIOverview,
  type DailyAIUsage,
  type ModelBreakdown,
  type PromptPerformance,
  type LatencyDistribution,
  type AIError,
} from '@/services/analyticsAPI';
import { logger } from '@/utils/logger';

interface AITabProps {
  dateRange: DateRange;
}

type AISubTab = 'overview' | 'models' | 'prompts' | 'errors' | 'validator' | 'costs';

export function AITab({ dateRange }: AITabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<AISubTab>('overview');
  
  // Data states
  const [overview, setOverview] = useState<AIOverview | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyAIUsage[]>([]);
  const [models, setModels] = useState<ModelBreakdown[]>([]);
  const [prompts, setPrompts] = useState<PromptPerformance[]>([]);
  const [latencyData, setLatencyData] = useState<{ distribution: LatencyDistribution[]; percentiles: { p50: number; p90: number; p99: number } } | null>(null);
  const [errors, setErrors] = useState<AIError[]>([]);

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

      const [overviewData, daily, modelsData, promptsData, latency, errorsData] = await Promise.all([
        getAIOverview(dateRange.from, dateRange.to),
        getDailyAIUsage(daysDiff),
        getModelBreakdown(dateRange.from, dateRange.to),
        getPromptPerformance(dateRange.from, dateRange.to),
        getLatencyData(dateRange.from, dateRange.to),
        getAIErrors(20),
      ]);

      setOverview(overviewData);
      setDailyUsage(daily);
      setModels(modelsData);
      setPrompts(promptsData);
      setLatencyData(latency);
      setErrors(errorsData);
    } catch (err) {
      logger.error('Failed to load AI analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
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
  const subTabs: { id: AISubTab; label: string; icon: typeof Cpu; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'models', label: 'Models', icon: Cpu, count: models.length },
    { id: 'prompts', label: 'Prompts', icon: Zap, count: prompts.length },
    { id: 'errors', label: 'Errors', icon: AlertCircle, count: errors.length },
    { id: 'validator', label: 'Validator', icon: CheckCircle },
    { id: 'costs', label: '💰 Costs', icon: DollarSign },
  ];

  // Prepare chart data
  const modelPieData = models.map(m => ({
    name: m.model.length > 20 ? m.model.substring(0, 20) + '...' : m.model,
    value: m.requests,
  }));

  const costByModelData = models
    .filter(m => m.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 6)
    .map(m => ({
      name: m.model.length > 15 ? m.model.substring(0, 15) + '...' : m.model,
      cost: Number(m.cost.toFixed(4)),
      tokens: Math.round(m.tokens / 1000),
    }));

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
                ? 'bg-purple-600 text-white'
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
              title="Total Requests"
              value={formatNumber(overview?.totalRequests || 0)}
              subtitle={`${overview?.uniqueUsers || 0} unique users`}
              icon={Cpu}
              iconColor="text-purple-600"
              loading={loading}
            />
            <MetricCard
              title="Total Tokens"
              value={formatNumber(overview?.totalTokens || 0)}
              subtitle={`${formatNumber(overview?.inputTokens || 0)} in / ${formatNumber(overview?.outputTokens || 0)} out`}
              icon={Zap}
              iconColor="text-amber-600"
              loading={loading}
            />
            <MetricCard
              title="Total Cost"
              value={formatCurrency(overview?.totalCost || 0)}
              subtitle={overview?.totalRequests ? `${formatCurrency((overview.totalCost / overview.totalRequests))} avg/req` : '—'}
              icon={DollarSign}
              iconColor="text-green-600"
              loading={loading}
            />
            <MetricCard
              title="Success Rate"
              value={`${(overview?.successRate || 0).toFixed(1)}%`}
              subtitle={`${Math.round(overview?.avgLatencyMs || 0)}ms avg latency`}
              icon={overview?.successRate && overview.successRate > 95 ? CheckCircle : AlertTriangle}
              iconColor={overview?.successRate && overview.successRate > 95 ? "text-green-600" : "text-amber-600"}
              loading={loading}
            />
          </div>

          {/* Usage Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Daily Usage Trend</h3>
                <p className="text-sm text-gray-500">Requests and tokens over time</p>
              </div>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            {loading ? (
              <div className="h-[280px] bg-gray-100 animate-pulse rounded-lg" />
            ) : dailyUsage.length > 0 ? (
              <AnalyticsAreaChart
                data={dailyUsage}
                xAxisKey="date"
                areas={[
                  { dataKey: 'requests', name: 'Requests', color: '#8b5cf6', fillOpacity: 0.3 },
                ]}
                height={280}
                formatXAxis={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                No usage data yet
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests by Model</h3>
              {loading ? (
                <div className="h-[260px] bg-gray-100 animate-pulse rounded-lg" />
              ) : modelPieData.length > 0 ? (
                <AnalyticsPieChart
                  data={modelPieData}
                  height={260}
                  innerRadius={50}
                  outerRadius={80}
                  colors={['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']}
                />
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-400">
                  No model data
                </div>
              )}
            </div>

            {/* Cost by Model */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Model</h3>
              {loading ? (
                <div className="h-[260px] bg-gray-100 animate-pulse rounded-lg" />
              ) : costByModelData.length > 0 ? (
                <AnalyticsBarChart
                  data={costByModelData}
                  xAxisKey="name"
                  bars={[{ dataKey: 'cost', name: 'Cost ($)', color: '#10b981' }]}
                  height={260}
                />
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-400">
                  No cost data
                </div>
              )}
            </div>
          </div>

          {/* Latency Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Timer className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Latency Performance</h3>
                <p className="text-sm text-gray-500">Response time distribution and percentiles</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Percentiles */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">
                    {latencyData?.percentiles.p50 || 0}ms
                  </p>
                  <p className="text-sm text-blue-600/80 mt-1">P50 (Median)</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">
                    {latencyData?.percentiles.p90 || 0}ms
                  </p>
                  <p className="text-sm text-amber-600/80 mt-1">P90</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-2xl font-bold text-red-600">
                    {latencyData?.percentiles.p99 || 0}ms
                  </p>
                  <p className="text-sm text-red-600/80 mt-1">P99</p>
                </div>
              </div>

              {/* Distribution Chart */}
              {latencyData?.distribution && latencyData.distribution.length > 0 && (
                <AnalyticsBarChart
                  data={latencyData.distribution}
                  xAxisKey="bucket"
                  bars={[{ dataKey: 'percentage', name: '% of Requests', color: '#3b82f6' }]}
                  height={140}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Models Tab */}
      {activeSubTab === 'models' && (
        <ModelComparisonTable models={models} loading={loading} />
      )}

      {/* Prompts Tab */}
      {activeSubTab === 'prompts' && (
        <PromptPerformanceTable prompts={prompts} loading={loading} />
      )}

      {/* Errors Tab */}
      {activeSubTab === 'errors' && (
        <ErrorsTable errors={errors} loading={loading} />
      )}

      {/* Validator Tab */}
      {activeSubTab === 'validator' && (
        <ValidatorStatus />
      )}

      {/* Costs Tab */}
      {activeSubTab === 'costs' && (
        <CostsSubTab dateRange={dateRange} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function ModelComparisonTable({ models, loading }: { models: ModelBreakdown[]; loading: boolean }) {
  const [sortKey, setSortKey] = useState<keyof ModelBreakdown>('requests');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedModels = [...models].sort((a, b) => {
    const aVal = a[sortKey] as number;
    const bVal = b[sortKey] as number;
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (key: keyof ModelBreakdown) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ column }: { column: keyof ModelBreakdown }) => (
    sortKey === column ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null
  );

  if (loading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-600" />
          Model Comparison
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Model</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('requests')}>
                <span className="flex items-center justify-end gap-1">Requests <SortIcon column="requests" /></span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tokens')}>
                <span className="flex items-center justify-end gap-1">Tokens <SortIcon column="tokens" /></span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cost')}>
                <span className="flex items-center justify-end gap-1">Cost <SortIcon column="cost" /></span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('avgLatencyMs')}>
                <span className="flex items-center justify-end gap-1">Avg Latency <SortIcon column="avgLatencyMs" /></span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('successRate')}>
                <span className="flex items-center justify-end gap-1">Success <SortIcon column="successRate" /></span>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">$/1k tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedModels.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No model usage data
                </td>
              </tr>
            ) : (
              sortedModels.map((model) => (
                <tr key={model.model} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{model.model}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatNumber(model.requests)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatNumber(model.tokens)}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(model.cost)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{model.avgLatencyMs.toFixed(0)}ms</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${model.successRate >= 95 ? 'text-green-600' : model.successRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      {model.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(model.costPer1kTokens)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromptPerformanceTable({ prompts, loading }: { prompts: PromptPerformance[]; loading: boolean }) {
  if (loading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          Prompt Performance
        </h3>
        <Link 
          to="/prompts" 
          className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Manage Prompts
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Prompt</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Version</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Requests</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Tokens</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Avg Latency</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Success</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Avg Cost</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prompts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  <div>No prompt usage data</div>
                  <Link to="/prompts" className="text-purple-600 hover:text-purple-700 text-sm mt-2 inline-block">
                    Go to AI Prompts →
                  </Link>
                </td>
              </tr>
            ) : (
              prompts.map((prompt) => (
                <tr key={prompt.promptSlug} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{prompt.promptSlug}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {prompt.activeVersion ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">
                        v{prompt.activeVersion}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatNumber(prompt.requests)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatNumber(prompt.tokens)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{prompt.avgLatencyMs.toFixed(0)}ms</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${prompt.successRate >= 95 ? 'text-green-600' : prompt.successRate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                      {prompt.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(prompt.avgCost)}</td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/prompts/${prompt.promptSlug}`}
                      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      Edit
                      <ExternalLink className="w-3 h-3" />
                    </Link>
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

function ErrorsTable({ errors, loading }: { errors: AIError[]; loading: boolean }) {
  if (loading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-red-50">
        <h3 className="font-semibold text-red-900 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          Recent Errors
        </h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {errors.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No recent errors! 🎉</p>
          </div>
        ) : (
          errors.map((error) => (
            <div key={error.id} className="px-4 py-3 hover:bg-red-50/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800 truncate">{error.errorMessage}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{error.model}</span>
                    {error.promptSlug && (
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded">{error.promptSlug}</span>
                    )}
                    {error.latencyMs && <span>{error.latencyMs}ms</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
