/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings as SettingsIcon,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  AlertCircle,
  Shield,
} from "lucide-react";
import {
  getModels,
  getActiveModel,
  createModel,
  activateModel,
  deactivateModel,
  setFallbackModel,
  deleteModel,
  MODEL_PRESETS,
  getTierLimits,
  updateTierLimits,
  resetTierLimits,
  type AIModel,
  type UpdateTierLimitsInput,
} from "@/services/settingsAPI";
import { useGlobalConfirm } from "@/hooks/useConfirm";

// Type for editable tier limits state
type EditableTierLimits = Record<string, UpdateTierLimitsInput>;

export function SettingsPage() {
  const confirm = useGlobalConfirm();
  const [models, setModels] = useState<AIModel[]>([]);
  const [activeModel, setActiveModelState] = useState<AIModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'tiers'>('models');

  // New model form
  const [showNewModelForm, setShowNewModelForm] = useState(false);
  const [newModel, setNewModel] = useState({
    id: '',
    name: '',
    provider: 'openai',
    cost: 0,
  });

  // Tier limits state
  const [tierLimitsData, setTierLimitsData] = useState<EditableTierLimits>({});
  const [tierLimitsSource, setTierLimitsSource] = useState<'database' | 'defaults'>('defaults');
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const [modelsData, activeModelData, tierLimitsResponse] = await Promise.all([
        getModels(),
        getActiveModel(),
        getTierLimits().catch(() => null), // Don't fail if tier limits endpoint doesn't exist yet
      ]);

      setModels(modelsData);
      setActiveModelState(activeModelData);
      
      // Process tier limits
      if (tierLimitsResponse) {
        setTierLimitsSource(tierLimitsResponse.source);
        const limits: EditableTierLimits = {};
        for (const [tier, data] of Object.entries(tierLimitsResponse.limits)) {
          limits[tier] = {
            requestsPerDay: data.requestsPerDay,
            tokensPerDay: data.tokensPerDay,
            maxParallelGenerations: data.maxParallelGenerations,
            contentDownloadsPerDay: data.contentDownloadsPerDay,
            offlinePackagesAllowed: data.offlinePackagesAllowed,
            canAccessPremiumContent: data.canAccessPremiumContent,
          };
        }
        setTierLimitsData(limits);
      } else {
        // Fallback to default structure
        setTierLimitsData({
          free: { requestsPerDay: 10, tokensPerDay: 5000, maxParallelGenerations: 1, contentDownloadsPerDay: 5, offlinePackagesAllowed: 0, canAccessPremiumContent: false },
          premium: { requestsPerDay: 100, tokensPerDay: 50000, maxParallelGenerations: 3, contentDownloadsPerDay: 50, offlinePackagesAllowed: 3, canAccessPremiumContent: true },
          pro: { requestsPerDay: 1000, tokensPerDay: 500000, maxParallelGenerations: 10, contentDownloadsPerDay: 999999, offlinePackagesAllowed: 999999, canAccessPremiumContent: true },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateModel(modelId: string) {
    try {
      setError(null);
      await activateModel(modelId);
      setSuccess(`Model activated successfully!`);
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate model");
    }
  }

  async function handleDeactivateModel(modelId: string) {
    try {
      setError(null);
      await deactivateModel(modelId);
      setSuccess(`Model deactivated successfully!`);
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate model");
    }
  }

  async function handleSetFallback(modelId: string) {
    try {
      setError(null);
      await setFallbackModel(modelId);
      setSuccess(`Fallback model set successfully!`);
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set fallback");
    }
  }

  async function handleDeleteModel(modelId: string) {
    const confirmed = await confirm({
      title: "Delete Model?",
      description: "Are you sure you want to delete this model? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      setError(null);
      await deleteModel(modelId);
      setSuccess(`Model deleted successfully!`);
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
    }
  }

  async function handleCreateModel() {
    if (!newModel.id || !newModel.name) {
      setError("Model ID and name are required");
      return;
    }

    try {
      setError(null);
      await createModel({
        id: newModel.id,
        name: newModel.name,
        provider: newModel.provider,
        costPer1kTokens: newModel.cost,
      });
      setSuccess(`Model created successfully!`);
      setShowNewModelForm(false);
      setNewModel({ id: '', name: '', provider: 'openai', cost: 0 });
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create model");
    }
  }

  function applyPreset(preset: typeof MODEL_PRESETS[number]) {
    setNewModel({
      id: preset.id,
      name: preset.name,
      provider: preset.provider,
      cost: preset.cost,
    });
  }

  // Tier limits handlers
  function handleTierLimitChange(tier: string, field: keyof UpdateTierLimitsInput, value: number | boolean) {
    setTierLimitsData(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
  }

  async function handleSaveTierLimits(tier: string) {
    try {
      setSavingTier(tier);
      setError(null);
      
      await updateTierLimits(tier as 'free' | 'premium' | 'pro', tierLimitsData[tier]);
      
      setSuccess(`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier limits saved successfully!`);
      setEditingTier(null);
      setTierLimitsSource('database');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tier limits");
    } finally {
      setSavingTier(null);
    }
  }

  async function handleResetTierLimits() {
    const confirmed = await confirm({
      title: "Reset Tier Limits?",
      description: "Are you sure you want to reset all tier limits to defaults? This will affect all user tiers.",
      confirmLabel: "Reset",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      setError(null);
      await resetTierLimits();
      setSuccess("Tier limits reset to defaults!");
      await loadSettings();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset tier limits");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-gray-700" />
              Portal Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Configure AI models and system settings
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('models')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'models'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cpu className="w-4 h-4 inline mr-2" />
            AI Models
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'tiers'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Tier Limits
          </button>
        </div>
      </div>

      {/* AI Models Tab */}
      {activeTab === 'models' && (
        <div>
          {/* Active Model Card */}
          {activeModel && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">
                  Active Production Model
                </h3>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {activeModel.name}
                </p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>
                    <strong>ID:</strong> {activeModel.id}
                  </span>
                  <span>
                    <strong>Provider:</strong> {activeModel.provider}
                  </span>
                  <span>
                    <strong>Cost:</strong> ${activeModel.costPer1kTokens}/1k tokens
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Add Model Button */}
          <div className="mb-6">
            <Button
              onClick={() => setShowNewModelForm(!showNewModelForm)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Model
            </Button>
          </div>

          {/* New Model Form */}
          {showNewModelForm && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Add New AI Model</h3>

              {/* Presets */}
              <div className="mb-4">
                <Label>Quick Presets:</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {MODEL_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset(preset)}
                      className="text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="modelId">Model ID *</Label>
                  <Input
                    id="modelId"
                    value={newModel.id}
                    onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                    placeholder="gpt-4o"
                  />
                </div>
                <div>
                  <Label htmlFor="modelName">Display Name *</Label>
                  <Input
                    id="modelName"
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    placeholder="GPT-4o"
                  />
                </div>
                <div>
                  <Label htmlFor="provider">Provider *</Label>
                  <select
                    id="provider"
                    value={newModel.provider}
                    onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="cost">Cost per 1k Tokens ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={newModel.cost}
                    onChange={(e) => setNewModel({ ...newModel, cost: parseFloat(e.target.value) })}
                    placeholder="2.50"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateModel}>
                  Create Model
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewModelForm(false);
                    setNewModel({ id: '', name: '', provider: 'openai', cost: 0 });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Models List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {models.map((model) => (
              <div
                key={model.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {model.name}
                    </h3>
                    <p className="text-sm text-gray-600 font-mono">{model.id}</p>
                  </div>
                  <div className="flex gap-2">
                    {model.status === 'active' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    {model.isFallback && (
                      <Shield className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium">{model.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-medium">${model.costPer1kTokens}/1k tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${model.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                      {model.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {model.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivateModel(model.id)}
                      className="text-xs text-orange-600 border-orange-300"
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleActivateModel(model.id)}
                      className="text-xs bg-green-600 hover:bg-green-700"
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetFallback(model.id)}
                    className="text-xs text-blue-600 border-blue-300"
                  >
                    Set as Fallback
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteModel(model.id)}
                    className="text-xs text-red-600 border-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Limits Tab */}
      {activeTab === 'tiers' && (
        <div>
          {/* Source indicator */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                tierLimitsSource === 'database' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {tierLimitsSource === 'database' ? 'Custom (Database)' : 'Using Defaults'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetTierLimits}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              Reset to Defaults
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['free', 'premium', 'pro'].map((tier) => {
              const limits = tierLimitsData[tier];
              const isEditing = editingTier === tier;
              const isSaving = savingTier === tier;
              
              if (!limits) return null;

              return (
                <div
                  key={tier}
                  className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${
                    isEditing ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {tier} Tier
                    </h3>
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTier(tier)}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleSaveTierLimits(tier)}
                          disabled={isSaving}
                          className="text-xs bg-green-600 hover:bg-green-700"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTier(null);
                            loadSettings(); // Reload to discard changes
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 text-sm">
                    {/* Requests per Day */}
                    <div>
                      <Label className="text-gray-600 text-xs">Requests/Day</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={limits.requestsPerDay}
                          onChange={(e) => handleTierLimitChange(tier, 'requestsPerDay', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-medium">{limits.requestsPerDay.toLocaleString()}</p>
                      )}
                    </div>

                    {/* Tokens per Day */}
                    <div>
                      <Label className="text-gray-600 text-xs">Tokens/Day</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={limits.tokensPerDay}
                          onChange={(e) => handleTierLimitChange(tier, 'tokensPerDay', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-medium">{limits.tokensPerDay.toLocaleString()}</p>
                      )}
                    </div>

                    {/* Parallel Generations */}
                    <div>
                      <Label className="text-gray-600 text-xs">Parallel Generations</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={limits.maxParallelGenerations}
                          onChange={(e) => handleTierLimitChange(tier, 'maxParallelGenerations', parseInt(e.target.value) || 1)}
                          className="mt-1"
                          min={1}
                        />
                      ) : (
                        <p className="font-medium">{limits.maxParallelGenerations}</p>
                      )}
                    </div>

                    {/* Downloads per Day */}
                    <div>
                      <Label className="text-gray-600 text-xs">Downloads/Day</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={limits.contentDownloadsPerDay}
                          onChange={(e) => handleTierLimitChange(tier, 'contentDownloadsPerDay', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-medium">
                          {limits.contentDownloadsPerDay >= 999999 ? 'Unlimited' : limits.contentDownloadsPerDay.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Offline Packages */}
                    <div>
                      <Label className="text-gray-600 text-xs">Offline Packages</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={limits.offlinePackagesAllowed}
                          onChange={(e) => handleTierLimitChange(tier, 'offlinePackagesAllowed', parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="font-medium">
                          {limits.offlinePackagesAllowed >= 999999 ? 'Unlimited' : limits.offlinePackagesAllowed}
                        </p>
                      )}
                    </div>

                    {/* Premium Content Access */}
                    <div>
                      <Label className="text-gray-600 text-xs">Premium Content</Label>
                      {isEditing ? (
                        <div className="mt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={limits.canAccessPremiumContent}
                              onChange={(e) => handleTierLimitChange(tier, 'canAccessPremiumContent', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm">Can access premium content</span>
                          </label>
                        </div>
                      ) : (
                        <p className="font-medium">
                          {limits.canAccessPremiumContent ? (
                            <span className="text-green-600">Yes ✓</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Use 999999 for "unlimited" values. Changes take effect immediately
              for all users on that tier. Rate limits reset daily at midnight UTC.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

