/**
 * Performance Dashboard - k6 Load Test Results
 * 
 * Displays load test metrics, trends, and recent runs.
 */

import { useEffect, useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Zap, 
  BarChart3,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { 
  getK6Summary, 
  listK6Results, 
} from '@/services/k6API';
import type { K6DashboardSummary, K6ResultListItem } from '@/services/k6API';

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function HealthBadge({ health }: { health: K6DashboardSummary['health'] }) {
  const config = {
    healthy: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Healthy' },
    degraded: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Degraded' },
    unhealthy: { icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200', label: 'Unhealthy' },
    unknown: { icon: HelpCircle, color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Unknown' },
  };

  const { icon: Icon, color, label } = config[health];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${color}`}>
      <Icon size={16} />
      {label}
    </span>
  );
}

function MetricCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend: _trend,
  color = 'slate'
}: { 
  title: string; 
  value: string | number | null; 
  unit?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  color?: 'slate' | 'emerald' | 'amber' | 'red';
}) {
  const colorClasses = {
    slate: 'bg-slate-50 border-slate-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
  };

  const iconColors = {
    slate: 'text-slate-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <Icon size={20} className={iconColors[color]} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">
          {value ?? '—'}
        </span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

function TestRunRow({ result }: { result: K6ResultListItem }) {
  const statusConfig = {
    success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    failure: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  };

  const { icon: StatusIcon, color, bg } = statusConfig[result.status];
  
  const typeColors = {
    smoke: 'bg-blue-100 text-blue-700',
    load: 'bg-purple-100 text-purple-700',
    soak: 'bg-amber-100 text-amber-700',
    stress: 'bg-red-100 text-red-700',
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeColors[result.test_type]}`}>
          {result.test_type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {formatDate(result.timestamp)}
      </td>
      <td className="px-4 py-3 text-sm font-mono">
        {result.p95_ms !== null ? `${result.p95_ms.toFixed(0)}ms` : '—'}
      </td>
      <td className="px-4 py-3 text-sm font-mono">
        {result.error_rate !== null ? `${(result.error_rate * 100).toFixed(2)}%` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {result.total_requests?.toLocaleString() ?? '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${bg}`}>
          <StatusIcon size={14} className={color} />
          <span className={`text-xs font-medium ${color}`}>
            {result.status === 'success' ? 'Pass' : 'Fail'}
          </span>
        </span>
      </td>
    </tr>
  );
}

function TrendChart({ 
  dates, 
  values, 
  label,
  unit,
  threshold
}: { 
  dates: string[]; 
  values: (number | null)[]; 
  label: string;
  unit: string;
  threshold?: number;
}) {
  if (dates.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400">
        No data available
      </div>
    );
  }

  // Simple SVG line chart
  const width = 100;
  const height = 40;
  const padding = 2;
  
  const validValues = values.filter((v): v is number => v !== null);
  const maxValue = Math.max(...validValues, threshold || 0) * 1.1;
  const minValue = 0;
  
  const points = values.map((v, i) => {
    if (v === null) return null;
    const x = padding + ((width - padding * 2) * i) / (values.length - 1 || 1);
    const y = height - padding - ((v - minValue) / (maxValue - minValue)) * (height - padding * 2);
    return { x, y, value: v };
  }).filter((p): p is { x: number; y: number; value: number } => p !== null);

  const pathD = points.length > 0 
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` 
    : '';

  const thresholdY = threshold 
    ? height - padding - ((threshold - minValue) / (maxValue - minValue)) * (height - padding * 2)
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          Latest: {validValues[validValues.length - 1]?.toFixed(1) ?? '—'}{unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
        {/* Grid lines */}
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#e2e8f0" strokeWidth="0.5" />
        
        {/* Threshold line */}
        {thresholdY !== null && (
          <line 
            x1={padding} 
            y1={thresholdY} 
            x2={width-padding} 
            y2={thresholdY} 
            stroke="#f59e0b" 
            strokeWidth="0.5" 
            strokeDasharray="2,2" 
          />
        )}
        
        {/* Data line */}
        {pathD && (
          <path 
            d={pathD} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        )}
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x} 
            cy={p.y} 
            r="1.5" 
            fill="#3b82f6" 
          />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{dates[0]}</span>
        <span>{dates[dates.length - 1]}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export function PerformancePage() {
  const [summary, setSummary] = useState<K6DashboardSummary | null>(null);
  const [results, setResults] = useState<K6ResultListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [summaryData, resultsData] = await Promise.all([
        getK6Summary(),
        listK6Results({ limit: 20 }),
      ]);
      
      setSummary(summaryData);
      setResults(resultsData.results);
    } catch (err) {
      console.error('Failed to fetch k6 data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="mx-auto mb-3 text-red-500" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const latestSmoke = summary?.latest_smoke;
  
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="text-blue-600" />
            Performance Dashboard
          </h1>
          <p className="text-slate-500 mt-1">k6 load test results and API performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {summary && <HealthBadge health={summary.health} />}
          <button 
            onClick={fetchData}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="p95 Latency"
          value={latestSmoke?.p95_ms?.toFixed(0) ?? null}
          unit="ms"
          icon={Clock}
          color={latestSmoke?.p95_ms && latestSmoke.p95_ms > 500 ? 'amber' : 'emerald'}
        />
        <MetricCard
          title="Error Rate"
          value={latestSmoke?.error_rate != null ? (latestSmoke.error_rate * 100).toFixed(2) : null}
          unit="%"
          icon={AlertTriangle}
          color={latestSmoke?.error_rate != null && latestSmoke.error_rate > 0.01 ? 'red' : 'emerald'}
        />
        <MetricCard
          title="Total Requests"
          value={latestSmoke?.total_requests?.toLocaleString() ?? null}
          icon={Zap}
          color="slate"
        />
        <MetricCard
          title="Last Test"
          value={latestSmoke ? new Date(latestSmoke.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null}
          icon={BarChart3}
          color="slate"
        />
      </div>

      {/* Trends */}
      {summary && summary.trends.dates.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <TrendChart
              dates={summary.trends.dates}
              values={summary.trends.p95_values}
              label="p95 Latency Trend"
              unit="ms"
              threshold={500}
            />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <TrendChart
              dates={summary.trends.dates}
              values={summary.trends.error_rates.map(r => r !== null ? r * 100 : null)}
              label="Error Rate Trend"
              unit="%"
              threshold={1}
            />
          </div>
        </div>
      )}

      {/* Recent Test Runs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Test Runs</h2>
        </div>
        
        {results.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="mx-auto mb-4 text-slate-300" size={48} />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No test results yet</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              k6 load tests will appear here once they run. Tests are triggered on pushes to main and nightly schedules.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">p95</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Error Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Requests</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map(result => (
                  <TestRunRow key={result.id} result={result} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <HelpCircle size={18} />
          About Performance Tests
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Smoke tests</strong> run on every push to main (~30s, 5 VUs) - quick sanity check.
          </p>
          <p>
            <strong>Load tests</strong> run nightly at 2 AM UTC (~5 min, 50 VUs) - normal traffic simulation.
          </p>
          <p>
            <strong>Soak tests</strong> run weekly on Sundays (~30 min, 20 VUs) - stability and leak detection.
          </p>
          <p className="pt-2">
            Thresholds: p95 latency &lt; 500ms, error rate &lt; 1%. Tests target staging API.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PerformancePage;

