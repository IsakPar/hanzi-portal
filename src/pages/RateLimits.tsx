import { useState, useEffect } from 'react';
import { Sliders, Save, RefreshCw, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TierLimits {
  tier: string;
  requestsPerDay: number;
  tokensPerDay: number;
  maxParallelGenerations: number;
  contentDownloadsPerDay: number;
  offlinePackagesAllowed: number;
  canAccessPremiumContent: boolean;
  updatedAt: string | null;
}

const DEFAULT_LIMITS: Record<string, TierLimits> = {
  free: {
    tier: 'free',
    requestsPerDay: 10,
    tokensPerDay: 5000,
    maxParallelGenerations: 1,
    contentDownloadsPerDay: 5,
    offlinePackagesAllowed: 0,
    canAccessPremiumContent: false,
    updatedAt: null,
  },
  premium: { // Displayed as "Master" in UI
    tier: 'premium',
    requestsPerDay: 100,
    tokensPerDay: 50000,
    maxParallelGenerations: 3,
    contentDownloadsPerDay: 999999,
    offlinePackagesAllowed: 6,
    canAccessPremiumContent: true,
    updatedAt: null,
  },
  pro: {
    tier: 'pro',
    requestsPerDay: 1000,
    tokensPerDay: 500000,
    maxParallelGenerations: 10,
    contentDownloadsPerDay: 999999,
    offlinePackagesAllowed: 999999,
    canAccessPremiumContent: true,
    updatedAt: null,
  },
};

export default function RateLimits() {
  const [limits, setLimits] = useState<Record<string, TierLimits>>(DEFAULT_LIMITS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [source, setSource] = useState<'database' | 'defaults'>('defaults');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetchLimits();
  }, []);

  async function fetchLimits() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/v1/admin/tier-limits');
      const data = await (res as Response).json();
      setLimits(data.limits || DEFAULT_LIMITS);
      setSource(data.source || 'defaults');
      setHasChanges({});
    } catch (err) {
      setError('Failed to load rate limits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function updateLimit(tier: string, field: keyof TierLimits, value: number | boolean) {
    setLimits(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
    setHasChanges(prev => ({ ...prev, [tier]: true }));
    setSuccess(null);
  }

  async function saveTier(tier: string) {
    setSaving(tier);
    setError(null);
    try {
      const tierLimits = limits[tier];
      await api.put(`/v1/admin/tier-limits/${tier}`, {
        body: JSON.stringify({
          requestsPerDay: tierLimits.requestsPerDay,
          tokensPerDay: tierLimits.tokensPerDay,
          maxParallelGenerations: tierLimits.maxParallelGenerations,
          contentDownloadsPerDay: tierLimits.contentDownloadsPerDay,
          offlinePackagesAllowed: tierLimits.offlinePackagesAllowed,
          canAccessPremiumContent: tierLimits.canAccessPremiumContent,
        }),
      });
      setHasChanges(prev => ({ ...prev, [tier]: false }));
      setSuccess(`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier limits saved!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Failed to save ${tier} tier limits`);
    } finally {
      setSaving(null);
    }
  }

  async function resetToDefaults() {
    setSaving('reset');
    setError(null);
    try {
      await api.post('/v1/admin/tier-limits/reset');
      await fetchLimits();
      setSuccess('All limits reset to defaults');
      setConfirmReset(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to reset limits');
    } finally {
      setSaving(null);
    }
  }

  function copyMasterToFree() {
    setLimits(prev => ({
      ...prev,
      free: {
        ...prev.premium,
        tier: 'free',
      },
    }));
    setHasChanges(prev => ({ ...prev, free: true }));
    setSuccess(null);
  }

  const tierConfigs = [
    { 
      tier: 'free', 
      title: 'Free Tier', 
      description: 'Default limits for free users',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200',
      headerBg: 'bg-slate-50',
    },
    { 
      tier: 'premium', // DB tier name, displayed as "Master" 
      title: 'Master Tier', 
      description: '$9.99/month - Full access to all content',
      bgColor: 'bg-amber-50/50',
      borderColor: 'border-amber-200',
      headerBg: 'bg-amber-100/50',
    },
    { 
      tier: 'pro', 
      title: 'Pro Tier (Admin)', 
      description: 'Internal/admin use only',
      bgColor: 'bg-violet-50/50',
      borderColor: 'border-violet-200',
      headerBg: 'bg-violet-100/50',
    },
  ];

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <Sliders className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rate Limits</h1>
            <p className="text-sm text-gray-500">Control usage limits by subscription tier</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLimits} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setConfirmReset(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset to Defaults?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will reset all tier limits to their default values. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button 
                onClick={resetToDefaults}
                className="bg-red-600 hover:bg-red-700"
                disabled={saving === 'reset'}
              >
                {saving === 'reset' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Reset All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
        <h3 className="font-semibold text-amber-900 mb-2">🎉 Run a Promotion</h3>
        <p className="text-sm text-amber-700 mb-4">
          Give free users premium limits temporarily. After your promotion, click "Reset All" to restore defaults.
        </p>
        <Button 
          onClick={copyMasterToFree}
          className="bg-amber-600 hover:bg-amber-700"
        >
          Copy Master Limits → Free Tier
        </Button>
      </div>

      {/* Source Indicator */}
      <div className="text-sm text-gray-500">
        Current values from: <span className="font-medium">{source === 'database' ? 'Database (custom)' : 'Defaults'}</span>
      </div>

      {/* Tier Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-6">
          {tierConfigs.map(({ tier, title, description, bgColor, borderColor, headerBg }) => (
            <div key={tier} className={`rounded-xl border-2 ${bgColor} ${borderColor} overflow-hidden`}>
              <div className={`p-4 ${headerBg} flex items-center justify-between`}>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
                <Button
                  onClick={() => saveTier(tier)}
                  disabled={saving !== null || !hasChanges[tier]}
                  className={hasChanges[tier] ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {saving === tier ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {hasChanges[tier] ? 'Save Changes' : 'Saved'}
                </Button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor={`${tier}-requests`}>AI Requests / Day</Label>
                    <Input
                      id={`${tier}-requests`}
                      type="number"
                      value={limits[tier]?.requestsPerDay || 0}
                      onChange={(e) => updateLimit(tier, 'requestsPerDay', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${tier}-tokens`}>Tokens / Day</Label>
                    <Input
                      id={`${tier}-tokens`}
                      type="number"
                      value={limits[tier]?.tokensPerDay || 0}
                      onChange={(e) => updateLimit(tier, 'tokensPerDay', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${tier}-parallel`}>Max Parallel Generations</Label>
                    <Input
                      id={`${tier}-parallel`}
                      type="number"
                      value={limits[tier]?.maxParallelGenerations || 0}
                      onChange={(e) => updateLimit(tier, 'maxParallelGenerations', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${tier}-downloads`}>Content Downloads / Day</Label>
                    <Input
                      id={`${tier}-downloads`}
                      type="number"
                      value={limits[tier]?.contentDownloadsPerDay || 0}
                      onChange={(e) => updateLimit(tier, 'contentDownloadsPerDay', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${tier}-offline`}>Offline Packages Allowed</Label>
                    <Input
                      id={`${tier}-offline`}
                      type="number"
                      value={limits[tier]?.offlinePackagesAllowed || 0}
                      onChange={(e) => updateLimit(tier, 'offlinePackagesAllowed', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Premium Content Access</Label>
                    <div className="flex items-center gap-3 h-10">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={limits[tier]?.canAccessPremiumContent || false}
                        onClick={() => updateLimit(tier, 'canAccessPremiumContent', !limits[tier]?.canAccessPremiumContent)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          limits[tier]?.canAccessPremiumContent ? 'bg-emerald-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            limits[tier]?.canAccessPremiumContent ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-sm text-gray-600">
                        {limits[tier]?.canAccessPremiumContent ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-2">How Rate Limits Work</h3>
        <div className="text-sm text-slate-600 space-y-2">
          <p>• <strong>AI Requests</strong> - Number of AI chat/generation requests per day</p>
          <p>• <strong>Tokens</strong> - Total AI tokens (input + output) per day</p>
          <p>• <strong>Parallel Generations</strong> - Concurrent AI requests allowed</p>
          <p>• <strong>Content Downloads</strong> - Lesson/story downloads for offline use</p>
          <p>• <strong>Offline Packages</strong> - Number of HSK levels downloadable offline</p>
          <p>• <strong>Premium Content</strong> - Access to premium-only lessons and stories</p>
        </div>
      </div>
    </div>
  );
}
