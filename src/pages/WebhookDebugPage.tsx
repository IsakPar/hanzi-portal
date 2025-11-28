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
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface TestResult {
  success: boolean;
  status: number;
  data?: unknown;
  error?: string;
  duration: number;
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
          Webhook Debugger
        </h1>
        <p className="text-gray-600 mt-1">
          Test and debug RevenueCat webhook integration
        </p>
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

