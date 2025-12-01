import { useState } from 'react';
import { 
  Webhook, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  Copy,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Activity,
  Zap,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import api, { API_BASE_URL } from '@/services/api';

interface TestResult {
  success: boolean;
  status: number;
  data?: unknown;
  error?: string;
  duration: number;
}

interface EndpointTestResult {
  name: string;
  path: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  responseTime?: number;
  error?: string;
  details?: string;
}

interface ComprehensiveTestResult {
  timestamp: string;
  duration: number;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  summary: { passed: number; failed: number; skipped: number; total: number };
  results: EndpointTestResult[];
}

// Sample RevenueCat webhook payloads for testing
const SAMPLE_PAYLOADS = {
  initial_purchase: {
    event: {
      type: 'INITIAL_PURCHASE',
      app_user_id: 'test_user_123',
      product_id: 'hanzi_premium_monthly',
      store: 'app_store',
      expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      presented_offering_id: 'default',
    }
  },
  renewal: {
    event: {
      type: 'RENEWAL',
      app_user_id: 'test_user_123',
      product_id: 'hanzi_premium_monthly',
      store: 'app_store',
      expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }
  },
  cancellation: {
    event: {
      type: 'CANCELLATION',
      app_user_id: 'test_user_123',
      product_id: 'hanzi_premium_monthly',
      store: 'app_store',
    }
  },
  expiration: {
    event: {
      type: 'EXPIRATION',
      app_user_id: 'test_user_123',
      product_id: 'hanzi_premium_monthly',
      store: 'app_store',
    }
  },
};

export function WebhookDebugPage() {
  const { toast } = useToast();
  const [selectedPayload, setSelectedPayload] = useState<keyof typeof SAMPLE_PAYLOADS>('initial_purchase');
  const [customPayload, setCustomPayload] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Comprehensive test state
  const [comprehensiveResult, setComprehensiveResult] = useState<ComprehensiveTestResult | null>(null);
  const [comprehensiveLoading, setComprehensiveLoading] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  const webhookUrl = `${API_BASE_URL}/v1/billing/webhooks/revenuecat`;
  const debugUrl = `${API_BASE_URL}/v1/billing/webhooks/debug`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const testEndpoint = async (url: string, options: RequestInit = {}) => {
    const start = Date.now();
    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => null);
      return {
        success: response.ok,
        status: response.status,
        data,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        status: 0,
        error: err instanceof Error ? err.message : 'Network error',
        duration: Date.now() - start,
      };
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    const result = await testEndpoint(`${API_BASE_URL}/v1/billing/health`);
    setTestResults(prev => [{
      ...result,
      data: { test: 'Health Check', ...result.data as object },
    }, ...prev.slice(0, 9)]);
    setLoading(false);
  };

  const runComprehensiveTest = async () => {
    setComprehensiveLoading(true);
    try {
      const response = await api.get<ComprehensiveTestResult>('/v1/health/test-all');
      setComprehensiveResult(response);
      
      toast({
        title: response.overall === 'healthy' ? '✅ All tests passed!' : 
               response.overall === 'degraded' ? '⚠️ Some tests failed' : '❌ Multiple failures',
        description: `${response.summary.passed}/${response.summary.total} passed in ${response.duration}ms`,
        variant: response.overall === 'healthy' ? 'success' : 'error',
      });
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err instanceof Error ? err.message : 'Failed to run comprehensive test',
        variant: 'error',
      });
    } finally {
      setComprehensiveLoading(false);
    }
  };

  const exportResults = () => {
    if (!comprehensiveResult) return;
    const text = JSON.stringify(comprehensiveResult, null, 2);
    navigator.clipboard.writeText(text);
    toast({ title: 'Results copied to clipboard' });
  };

  const runGetWebhookTest = async () => {
    setLoading(true);
    const result = await testEndpoint(webhookUrl);
    setTestResults(prev => [{
      ...result,
      data: { test: 'GET /webhooks/revenuecat', ...result.data as object },
    }, ...prev.slice(0, 9)]);
    setLoading(false);
  };

  const runDebugWebhookTest = async () => {
    setLoading(true);
    const payload = customPayload || JSON.stringify(SAMPLE_PAYLOADS[selectedPayload], null, 2);
    
    const result = await testEndpoint(debugUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });
    
    setTestResults(prev => [{
      ...result,
      data: { test: 'POST /webhooks/debug (no auth)', ...result.data as object },
    }, ...prev.slice(0, 9)]);
    setLoading(false);
  };

  const runAuthenticatedWebhookTest = async () => {
    if (!webhookSecret) {
      toast({ 
        title: 'Webhook secret required', 
        description: 'Enter your REVENUECAT_WEBHOOK_SECRET to test authenticated webhooks',
        variant: 'error' 
      });
      return;
    }
    
    setLoading(true);
    const payload = customPayload || JSON.stringify(SAMPLE_PAYLOADS[selectedPayload], null, 2);
    
    const result = await testEndpoint(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webhookSecret}`,
      },
      body: payload,
    });
    
    setTestResults(prev => [{
      ...result,
      data: { test: 'POST /webhooks/revenuecat (with auth)', ...result.data as object },
    }, ...prev.slice(0, 9)]);
    setLoading(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Webhook className="h-7 w-7" />
          API & Webhook Debugger
        </h1>
        <p className="text-gray-600 mt-1">
          Test all API endpoints and debug integrations
        </p>
      </div>

      {/* Comprehensive API Health Check */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-emerald-400" />
            <h2 className="font-semibold text-lg">API Health Check</h2>
          </div>
          <div className="flex gap-2">
            {comprehensiveResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportResults}
                className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
            <Button
              onClick={runComprehensiveTest}
              disabled={comprehensiveLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {comprehensiveLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test All Endpoints
                </>
              )}
            </Button>
          </div>
        </div>

        {comprehensiveResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${
                comprehensiveResult.overall === 'healthy' ? 'bg-emerald-900/50' :
                comprehensiveResult.overall === 'degraded' ? 'bg-amber-900/50' : 'bg-red-900/50'
              }`}>
                <div className="text-sm text-slate-400">Status</div>
                <div className="text-xl font-bold capitalize">{comprehensiveResult.overall}</div>
              </div>
              <div className="p-4 rounded-lg bg-emerald-900/30">
                <div className="text-sm text-slate-400">Passed</div>
                <div className="text-xl font-bold text-emerald-400">{comprehensiveResult.summary.passed}</div>
              </div>
              <div className="p-4 rounded-lg bg-red-900/30">
                <div className="text-sm text-slate-400">Failed</div>
                <div className="text-xl font-bold text-red-400">{comprehensiveResult.summary.failed}</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-700/50">
                <div className="text-sm text-slate-400">Duration</div>
                <div className="text-xl font-bold">{comprehensiveResult.duration}ms</div>
              </div>
            </div>

            {/* Failed Tests (always show) */}
            {comprehensiveResult.results.filter(r => r.status === 'fail').length > 0 && (
              <div className="bg-red-900/30 rounded-lg p-4">
                <h3 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Failed Tests
                </h3>
                <div className="space-y-2">
                  {comprehensiveResult.results.filter(r => r.status === 'fail').map((result, i) => (
                    <div key={i} className="flex items-center justify-between bg-red-950/50 rounded px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{result.name}</span>
                        <span className="text-slate-400 ml-2">{result.method} {result.path}</span>
                      </div>
                      <div className="text-red-300 text-xs">
                        {result.error || result.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Results (toggle) */}
            <div>
              <button
                onClick={() => setShowAllResults(!showAllResults)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {showAllResults ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAllResults ? 'Hide' : 'Show'} all {comprehensiveResult.summary.total} tests
              </button>

              {showAllResults && (
                <div className="mt-3 bg-slate-800/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-400 font-medium">Status</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-medium">Name</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-medium">Path</th>
                        <th className="text-right px-3 py-2 text-slate-400 font-medium">Time</th>
                        <th className="text-left px-3 py-2 text-slate-400 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprehensiveResult.results.map((result, i) => (
                        <tr key={i} className="border-t border-slate-700/50">
                          <td className="px-3 py-2">
                            {result.status === 'pass' && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                            {result.status === 'fail' && <XCircle className="h-4 w-4 text-red-400" />}
                            {result.status === 'skip' && <Clock className="h-4 w-4 text-slate-500" />}
                          </td>
                          <td className="px-3 py-2 font-medium">{result.name}</td>
                          <td className="px-3 py-2 text-slate-400 font-mono text-xs">{result.method} {result.path}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{result.responseTime ?? '-'}ms</td>
                          <td className="px-3 py-2 text-xs text-slate-400">{result.error || result.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className="text-xs text-slate-500 text-right">
              Last run: {new Date(comprehensiveResult.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {!comprehensiveResult && (
          <div className="text-center py-8 text-slate-400">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Test All Endpoints" to run a comprehensive health check</p>
            <p className="text-sm mt-1">Tests database, R2, CDN, AI APIs, and all routes</p>
          </div>
        )}
      </div>

      {/* Endpoint URLs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Webhook Endpoints</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Production Webhook URL</label>
            <p className="text-xs text-gray-500 mb-1">Configure this in RevenueCat Dashboard</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                {webhookUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Debug Endpoint (No Auth)</label>
            <p className="text-xs text-gray-500 mb-1">Use this to see exactly what RevenueCat sends</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">
                {debugUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(debugUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>For debugging:</strong> Set the Debug Endpoint URL in RevenueCat temporarily to see raw payloads, 
              then switch back to the Production URL once working.
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tests */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Tests</h2>
        
        <div className="flex flex-wrap gap-3">
          <Button onClick={runHealthCheck} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Health Check
          </Button>
          <Button onClick={runGetWebhookTest} disabled={loading} variant="outline">
            <Send className="h-4 w-4 mr-2" />
            GET Webhook Endpoint
          </Button>
          <Button onClick={runDebugWebhookTest} disabled={loading} variant="outline">
            <Send className="h-4 w-4 mr-2" />
            POST to Debug (No Auth)
          </Button>
        </div>
      </div>

      {/* Authenticated Test */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Authenticated Webhook Test</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Webhook Secret</label>
            <p className="text-xs text-gray-500 mb-1">Your REVENUECAT_WEBHOOK_SECRET from backend config</p>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Enter webhook secret..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Sample Payload</label>
            <div className="flex gap-2 mt-1 mb-2">
              {Object.keys(SAMPLE_PAYLOADS).map((key) => (
                <Button
                  key={key}
                  variant={selectedPayload === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedPayload(key as keyof typeof SAMPLE_PAYLOADS);
                    setCustomPayload('');
                  }}
                >
                  {key.replace('_', ' ')}
                </Button>
              ))}
            </div>
            <textarea
              value={customPayload || JSON.stringify(SAMPLE_PAYLOADS[selectedPayload], null, 2)}
              onChange={(e) => setCustomPayload(e.target.value)}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
          </div>

          <Button 
            onClick={runAuthenticatedWebhookTest} 
            disabled={loading || !webhookSecret}
          >
            <Send className="h-4 w-4 mr-2" />
            Test Authenticated Webhook
          </Button>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Test Results</h2>
          {testResults.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestResults([])}
            >
              Clear
            </Button>
          )}
        </div>
        
        {testResults.length === 0 ? (
          <p className="text-gray-500 text-sm">Run a test to see results</p>
        ) : (
          <div className="space-y-3">
            {testResults.map((result, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium text-sm">
                      Status: {result.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {result.duration}ms
                  </div>
                </div>
                <pre className="text-xs bg-white/50 rounded p-2 overflow-auto max-h-48">
                  {JSON.stringify(result.data || result.error, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RevenueCat Dashboard Link */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-2">RevenueCat Dashboard</h2>
        <p className="text-sm text-gray-600 mb-3">
          Configure your webhook URL in the RevenueCat dashboard under Project Settings → Webhooks
        </p>
        <a
          href="https://app.revenuecat.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Open RevenueCat Dashboard
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default WebhookDebugPage;

