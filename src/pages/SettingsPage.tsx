/**
 * SettingsPage
 * System configuration: AI Models management
 * Tier limits moved to dedicated Rate Limits page
 * 
 * 280 LOC
 */

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
  RefreshCw,
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
  type AIModel,
} from "@/services/settingsAPI";
import { useGlobalConfirm } from "@/hooks/useConfirm";

export function SettingsPage() {
  const confirm = useGlobalConfirm();
  const [models, setModels] = useState<AIModel[]>([]);
  const [activeModel, setActiveModelState] = useState<AIModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New model form
  const [showNewModelForm, setShowNewModelForm] = useState(false);
  const [newModel, setNewModel] = useState({
    id: '',
    name: '',
    provider: 'openai',
    cost: 0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const [modelsData, activeModelData] = await Promise.all([
        getModels(),
        getActiveModel(),
      ]);

      setModels(modelsData);
      setActiveModelState(activeModelData);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500">
                Configure AI models for content generation
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadSettings}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
                <option value="together.ai">Together.ai</option>
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

      {models.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No AI models configured yet</p>
          <p className="text-sm text-gray-500 mt-1">Add a model to get started</p>
        </div>
      )}
    </div>
  );
}
