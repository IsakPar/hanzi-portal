/**
 * PerformanceTab Component
 * Performance analytics: API health, response times, errors, storage
 */

import { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle, Database, Wifi, Zap, RefreshCw } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { AnalyticsLineChart } from '../charts/AnalyticsLineChart';
import { AnalyticsBarChart } from '../charts/AnalyticsBarChart';
import type { DateRange } from '../DateRangePicker';
import {
  fetchPerformanceOverview,
  fetchLatencyTrend,
  fetchErrorBreakdown,
  fetchTopEndpoints,
  fetchModelPerformance,
  type PerformanceOverview,
  type LatencyDataPoint,
  type ErrorBreakdown,
  type EndpointStats,
  type ModelPerformance,
} from '@/services/performanceAPI';

interface PerformanceTabProps {
  dateRange: DateRange;
}

export function PerformanceTab({ dateRange }: PerformanceTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [latencyData, setLatencyData] = useState<LatencyDataPoint[]>([]);
  const [errorData, setErrorData] = useState<ErrorBreakdown | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointStats[]>([]);
  const [modelPerf, setModelPerf] = useState<ModelPerformance[]>([]);

  // Calculate days from date range
  const getDays = useCallback(() => {
    if (!dateRange.from || !dateRange.to) return 7;
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const diff = toDate.getTime() - fromDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 7;
  }, [dateRange]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const days = getDays();

    try {
      const [overviewRes, latencyRes, errorsRes, endpointsRes, modelsRes] = await Promise.all([
        fetchPerformanceOverview(days),
        fetchLatencyTrend(24),
        fetchErrorBreakdown(days),
        fetchTopEndpoints(days, 10),
        fetchModelPerformance(days),
      ]);

      setOverview(overviewRes);
      setLatencyData(latencyRes);
      setErrorData(errorsRes);
      setEndpoints(endpointsRes);
      setModelPerf(modelsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setIsLoading(false);
    }
  }, [getDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate health status
  const healthStatus = overview 
    ? (overview.errorRate < 1 && overview.avgLatencyMs < 500 && overview.uptime > 99.9 ? 'healthy' : 'degraded')
    : 'unknown';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Health Status Banner */}
      <div className={`rounded-xl p-4 ${
        healthStatus === 'healthy' 
          ? 'bg-green-50 border border-green-200' 
          : healthStatus === 'degraded'
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {healthStatus === 'healthy' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <p className={`font-medium ${
                healthStatus === 'healthy' ? 'text-green-900' : 'text-amber-900'
              }`}>
                System Status: {healthStatus === 'healthy' ? 'All Systems Operational' : 'Check Metrics'}
              </p>
              <p className={`text-sm ${
                healthStatus === 'healthy' ? 'text-green-700' : 'text-amber-700'
              }`}>
                Uptime: {overview?.uptime || 0}% | Error Rate: {overview?.errorRate || 0}% | Avg Response: {overview?.avgLatencyMs || 0}ms
              </p>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Avg Response Time"
          value={`${overview?.avgLatencyMs || 0}ms`}
          subtitle="P50 latency"
          icon={Clock}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Error Rate"
          value={`${overview?.errorRate || 0}%`}
          subtitle={`${overview?.totalErrors || 0} total errors`}
          icon={AlertTriangle}
          iconColor="text-amber-600"
        />
        <MetricCard
          title="Total Requests"
          value={overview?.totalRequests?.toLocaleString() || '0'}
          subtitle={overview?.period || 'Last 7 days'}
          icon={Wifi}
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Uptime"
          value={`${overview?.uptime || 0}%`}
          subtitle="Last 30 days"
          icon={CheckCircle}
          iconColor="text-green-600"
        />
      </div>

      {/* Latency Chart */}
      {latencyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Response Time Distribution</h3>
              <p className="text-sm text-gray-500">P50, P95, P99 latencies over 24 hours</p>
            </div>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <AnalyticsLineChart
            data={latencyData}
            xAxisKey="hour"
            lines={[
              { dataKey: 'p50', name: 'P50', color: '#10b981' },
              { dataKey: 'p95', name: 'P95', color: '#f59e0b' },
              { dataKey: 'p99', name: 'P99', color: '#ef4444' },
            ]}
            height={300}
            formatTooltip={(value) => `${value}ms`}
          />
        </div>
      )}

      {/* Errors & Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Error Distribution</h3>
              <p className="text-sm text-gray-500">By HTTP status code</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          {errorData?.byStatusCode && errorData.byStatusCode.length > 0 ? (
            <AnalyticsBarChart
              data={errorData.byStatusCode}
              xAxisKey="code"
              bars={[{ dataKey: 'count', name: 'Errors', color: '#ef4444' }]}
              height={250}
            />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p>No errors recorded</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Endpoints */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Endpoints</h3>
              <p className="text-sm text-gray-500">By request volume</p>
            </div>
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          {endpoints.length > 0 ? (
            <div className="space-y-3">
              {endpoints.map((ep) => (
                <div key={ep.endpoint} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-900 truncate">{ep.endpoint}</p>
                    <p className="text-xs text-gray-500">{ep.requests.toLocaleString()} requests</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{ep.avgMs}ms</p>
                    <p className="text-xs text-gray-500">avg</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              No endpoint data available
            </div>
          )}
        </div>
      </div>

      {/* Model Performance */}
      {modelPerf.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Model Performance</h3>
              <p className="text-sm text-gray-500">Response times and usage by model</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Model</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Requests</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Avg Latency</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tokens</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {modelPerf.map((model) => (
                  <tr key={model.model} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{model.model || 'Unknown'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{model.requests.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{model.avgLatencyMs}ms</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{model.totalTokens.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">${model.totalCost}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm ${parseFloat(model.errorRate) > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                        {model.errorRate}%
                      </span>
                    </td>
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
