/**
 * Pipeline Step Builder Component
 * 
 * Allows users to create and edit multi-step AI prompt pipelines
 * with model selection, variable configuration, and cost/token limits
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Settings,
  Zap,
} from 'lucide-react';
import type { PipelineStep, CostLimits, QualityGate, AIModel } from '@/services/promptsAPI';

interface PipelineStepBuilderProps {
  steps: PipelineStep[];
  costLimits: CostLimits;
  qualityGate: QualityGate;
  models: AIModel[];
  activeModelId: string | null;
  onChange: (updates: {
    steps?: PipelineStep[];
    costLimits?: CostLimits;
    qualityGate?: QualityGate;
  }) => void;
}

// Default values for new steps
const DEFAULT_STEP: Omit<PipelineStep, 'order'> = {
  name: 'New Step',
  modelId: '',
  promptBody: '',
  input: {
    includeTargets: true,
    includeGrammar: false,
    includeKnownVocab: false,
    includePreviousOutput: false,
  },
  output: {
    format: 'json',
  },
  settings: {
    temperature: 0.7,
    maxInputTokens: 4000,
    maxOutputTokens: 4000,
  },
  onFailure: {
    maxRetries: 1,
  },
};

export function PipelineStepBuilder({
  steps,
  costLimits,
  qualityGate,
  models,
  activeModelId,
  onChange,
}: PipelineStepBuilderProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(steps.length > 0 ? 1 : null);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);

  const handleAddStep = () => {
    if (steps.length >= 5) return;
    
    const newStep: PipelineStep = {
      ...DEFAULT_STEP,
      order: steps.length + 1,
      modelId: activeModelId || models[0]?.id || '',
      name: `Step ${steps.length + 1}`,
      input: {
        ...DEFAULT_STEP.input,
        includePreviousOutput: steps.length > 0, // Auto-enable for steps after first
      },
    };
    
    onChange({ steps: [...steps, newStep] });
    setExpandedStep(newStep.order);
  };

  const handleRemoveStep = (order: number) => {
    const newSteps = steps
      .filter((s) => s.order !== order)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    onChange({ steps: newSteps });
    if (expandedStep === order) {
      setExpandedStep(null);
    }
  };

  const handleMoveStep = (order: number, direction: 'up' | 'down') => {
    const idx = steps.findIndex((s) => s.order === order);
    if (idx === -1) return;
    
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= steps.length) return;
    
    const newSteps = [...steps];
    [newSteps[idx], newSteps[newIdx]] = [newSteps[newIdx], newSteps[idx]];
    
    // Renumber orders
    const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i + 1 }));
    onChange({ steps: reorderedSteps });
  };

  const handleUpdateStep = (order: number, updates: Partial<PipelineStep>) => {
    const newSteps = steps.map((s) =>
      s.order === order ? { ...s, ...updates } : s
    );
    onChange({ steps: newSteps });
  };

  const handleUpdateCostLimits = (updates: Partial<CostLimits>) => {
    onChange({ costLimits: { ...costLimits, ...updates } });
  };

  const handleUpdateQualityGate = (updates: Partial<QualityGate>) => {
    onChange({ qualityGate: { ...qualityGate, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Global Settings Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowGlobalSettings(!showGlobalSettings)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Cost & Quality Settings</span>
          </div>
          {showGlobalSettings ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showGlobalSettings && (
          <div className="p-6 pt-0 border-t border-gray-100 space-y-6">
            {/* Cost Limits */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Cost Limits</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxCostPerRun">Max Cost per Run ($)</Label>
                  <Input
                    id="maxCostPerRun"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10"
                    value={costLimits.maxCostPerRun}
                    onChange={(e) =>
                      handleUpdateCostLimits({ maxCostPerRun: parseFloat(e.target.value) || 0.20 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxInputTokens">Max Input Tokens/Step</Label>
                  <Input
                    id="maxInputTokens"
                    type="number"
                    min="100"
                    max="16000"
                    value={costLimits.maxInputTokensPerStep}
                    onChange={(e) =>
                      handleUpdateCostLimits({ maxInputTokensPerStep: parseInt(e.target.value) || 4000 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxOutputTokens">Max Output Tokens/Step</Label>
                  <Input
                    id="maxOutputTokens"
                    type="number"
                    min="100"
                    max="16000"
                    value={costLimits.maxOutputTokensPerStep}
                    onChange={(e) =>
                      handleUpdateCostLimits({ maxOutputTokensPerStep: parseInt(e.target.value) || 4000 })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="abortOnExceed"
                    checked={costLimits.abortOnExceed}
                    onChange={(e) =>
                      handleUpdateCostLimits({ abortOnExceed: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-purple-600"
                  />
                  <Label htmlFor="abortOnExceed" className="cursor-pointer">
                    Abort if cost exceeded
                  </Label>
                </div>
              </div>
            </div>

            {/* Quality Gate */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Quality Gate</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minScore">Min Validation Score</Label>
                  <Input
                    id="minScore"
                    type="number"
                    min="0"
                    max="100"
                    value={qualityGate.minValidationScore}
                    onChange={(e) =>
                      handleUpdateQualityGate({ minValidationScore: parseInt(e.target.value) || 70 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unavailableBelow">Return "Unavailable" Below</Label>
                  <Input
                    id="unavailableBelow"
                    type="number"
                    min="0"
                    max="100"
                    value={qualityGate.returnUnavailableBelow}
                    onChange={(e) =>
                      handleUpdateQualityGate({ returnUnavailableBelow: parseInt(e.target.value) || 50 })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                If a validation step returns a score below these thresholds, the pipeline will fail gracefully.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pipeline Steps ({steps.length}/5)</h3>
          <Button
            onClick={handleAddStep}
            disabled={steps.length >= 5}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No steps yet. Add your first step to start building the pipeline.</p>
            <Button onClick={handleAddStep} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add First Step
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <StepCard
                key={step.order}
                step={step}
                isFirst={idx === 0}
                isLast={idx === steps.length - 1}
                isExpanded={expandedStep === step.order}
                models={models}
                activeModelId={activeModelId}
                onToggleExpand={() =>
                  setExpandedStep(expandedStep === step.order ? null : step.order)
                }
                onUpdate={(updates) => handleUpdateStep(step.order, updates)}
                onMove={(direction) => handleMoveStep(step.order, direction)}
                onRemove={() => handleRemoveStep(step.order)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// Step Card Component
// ========================================

interface StepCardProps {
  step: PipelineStep;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  models: AIModel[];
  activeModelId: string | null;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<PipelineStep>) => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
}

function StepCard({
  step,
  isFirst,
  isLast,
  isExpanded,
  models,
  activeModelId,
  onToggleExpand,
  onUpdate,
  onMove,
  onRemove,
}: StepCardProps) {
  const selectedModel = models.find((m) => m.id === step.modelId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 bg-gray-50 border-b border-gray-100">
        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
        
        <div className="flex-1 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
            {step.order}
          </span>
          <div className="flex-1">
            <input
              type="text"
              value={step.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="font-medium text-gray-900 bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full"
              placeholder="Step Name"
            />
            <p className="text-xs text-gray-500">
              {selectedModel?.name || 'No model selected'} • {step.output.format.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove('up')}
            disabled={isFirst}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={isLast}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded hover:bg-gray-200"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded hover:bg-red-100 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Model Selection */}
          <div>
            <Label htmlFor={`model-${step.order}`}>AI Model</Label>
            <select
              id={`model-${step.order}`}
              value={step.modelId}
              onChange={(e) => onUpdate({ modelId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select a model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                  {model.id === activeModelId ? ' ★' : ''}
                  {' - '}${model.cost_per_1k_input + model.cost_per_1k_output}/1k tokens
                </option>
              ))}
            </select>
          </div>

          {/* Prompt Body */}
          <div>
            <Label htmlFor={`prompt-${step.order}`}>Prompt</Label>
            <Textarea
              id={`prompt-${step.order}`}
              value={step.promptBody}
              onChange={(e) => onUpdate({ promptBody: e.target.value })}
              rows={8}
              className="mt-1 font-mono text-sm"
              placeholder="You are an expert Chinese teacher..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{{targets}}'}, {'{{grammar}}'}, {'{{known_vocabulary}}'}, {'{{previous_output}}'}
            </p>
          </div>

          {/* Input Configuration */}
          <div>
            <Label className="mb-2 block">Input Variables</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'includeTargets', label: 'Target words ({{targets}})' },
                { key: 'includeGrammar', label: 'Grammar points ({{grammar}})' },
                { key: 'includeKnownVocab', label: 'Known vocabulary ({{known_vocabulary}})' },
                { key: 'includePreviousOutput', label: 'Previous step output ({{previous_output}})' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step.input[key as keyof typeof step.input]}
                    onChange={(e) =>
                      onUpdate({
                        input: { ...step.input, [key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Output Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`format-${step.order}`}>Output Format</Label>
              <select
                id={`format-${step.order}`}
                value={step.output.format}
                onChange={(e) =>
                  onUpdate({
                    output: { ...step.output, format: e.target.value as 'json' | 'text' },
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="json">JSON</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`temp-${step.order}`}>Temperature</Label>
              <Input
                id={`temp-${step.order}`}
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={step.settings.temperature}
                onChange={(e) =>
                  onUpdate({
                    settings: { ...step.settings, temperature: parseFloat(e.target.value) || 0.7 },
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          {/* Token Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`maxIn-${step.order}`}>Max Input Tokens</Label>
              <Input
                id={`maxIn-${step.order}`}
                type="number"
                min="100"
                max="16000"
                value={step.settings.maxInputTokens}
                onChange={(e) =>
                  onUpdate({
                    settings: { ...step.settings, maxInputTokens: parseInt(e.target.value) || 4000 },
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`maxOut-${step.order}`}>Max Output Tokens</Label>
              <Input
                id={`maxOut-${step.order}`}
                type="number"
                min="100"
                max="16000"
                value={step.settings.maxOutputTokens}
                onChange={(e) =>
                  onUpdate({
                    settings: { ...step.settings, maxOutputTokens: parseInt(e.target.value) || 4000 },
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          {/* Failure Handling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`fallback-${step.order}`}>Fallback Model (Optional)</Label>
              <select
                id={`fallback-${step.order}`}
                value={step.onFailure.fallbackModelId || ''}
                onChange={(e) =>
                  onUpdate({
                    onFailure: { ...step.onFailure, fallbackModelId: e.target.value || undefined },
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">No fallback</option>
                {models
                  .filter((m) => m.id !== step.modelId)
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor={`retries-${step.order}`}>Max Retries</Label>
              <Input
                id={`retries-${step.order}`}
                type="number"
                min="0"
                max="3"
                value={step.onFailure.maxRetries}
                onChange={(e) =>
                  onUpdate({
                    onFailure: { ...step.onFailure, maxRetries: parseInt(e.target.value) || 0 },
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


