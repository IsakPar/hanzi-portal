/**
 * Pipeline Editor Page
 * 
 * Dedicated editor for creating and managing multi-step AI prompt pipelines.
 * Supports:
 * - Creating new pipelines
 * - Editing existing pipeline drafts
 * - Testing pipelines with sample data
 * - Promoting pipelines to production
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code,
  Layers,
} from 'lucide-react';
import { PipelineStepBuilder } from '@/components/prompts/PipelineStepBuilder';
import {
  getPromptVersions,
  createPipeline,
  testPrompt,
  getAIModels,
  type PromptTemplate,
  type PipelineStep,
  type CostLimits,
  type QualityGate,
  type AIModel,
  type TestPromptResult,
  type StepResult,
} from '@/services/promptsAPI';

// Default values
const DEFAULT_COST_LIMITS: CostLimits = {
  maxCostPerRun: 0.20,
  maxInputTokensPerStep: 4000,
  maxOutputTokensPerStep: 4000,
  abortOnExceed: true,
};

const DEFAULT_QUALITY_GATE: QualityGate = {
  minValidationScore: 70,
  returnUnavailableBelow: 50,
  requireValidation: false,
};

export function PipelineEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Data states
  const [versions, setVersions] = useState<PromptTemplate[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  // Form states
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [costLimits, setCostLimits] = useState<CostLimits>(DEFAULT_COST_LIMITS);
  const [qualityGate, setQualityGate] = useState<QualityGate>(DEFAULT_QUALITY_GATE);
  const [notes, setNotes] = useState('');
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  // Test states
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testTargets, setTestTargets] = useState('');
  const [testGrammar, setTestGrammar] = useState('');
  const [testKnownVocab, setTestKnownVocab] = useState('');
  const [testResult, setTestResult] = useState<TestPromptResult | null>(null);

  // UI states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'visual' | 'json'>('visual');
  const [jsonInput, setJsonInput] = useState('');

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [versionsData, modelsData] = await Promise.all([
        getPromptVersions(slug!).catch(() => []),
        getAIModels(),
      ]);

      setVersions(versionsData);
      setModels(modelsData.models);
      setActiveModelId(modelsData.active_model_id);

      // Load existing pipeline if available
      const latestPipeline = versionsData.find(v => v.steps && v.steps.length > 0);
      if (latestPipeline) {
        setSteps(latestPipeline.steps || []);
        setCostLimits(latestPipeline.costLimits || DEFAULT_COST_LIMITS);
        setQualityGate(latestPipeline.qualityGate || DEFAULT_QUALITY_GATE);
        setNotes(latestPipeline.notes || '');
        setCurrentVersion(latestPipeline.version);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  // Sync visual state to JSON when switching to JSON mode
  function switchToJsonMode() {
    const pipelineJson = {
      slug,
      notes: notes || undefined,
      steps,
      costLimits,
      qualityGate,
    };
    setJsonInput(JSON.stringify(pipelineJson, null, 2));
    setEditMode('json');
  }

  // Parse JSON and switch to visual mode
  function switchToVisualMode() {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.steps && Array.isArray(parsed.steps)) {
        setSteps(parsed.steps);
      }
      if (parsed.costLimits) {
        setCostLimits(parsed.costLimits);
      }
      if (parsed.qualityGate) {
        setQualityGate(parsed.qualityGate);
      }
      if (parsed.notes !== undefined) {
        setNotes(parsed.notes || '');
      }
      setEditMode('visual');
      setError(null);
    } catch (e) {
      setError('Invalid JSON - please fix before switching to visual mode');
    }
  }

  // Apply JSON changes without switching
  function applyJsonChanges() {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.steps && Array.isArray(parsed.steps)) {
        setSteps(parsed.steps);
      }
      if (parsed.costLimits) {
        setCostLimits(parsed.costLimits);
      }
      if (parsed.qualityGate) {
        setQualityGate(parsed.qualityGate);
      }
      if (parsed.notes !== undefined) {
        setNotes(parsed.notes || '');
      }
      setSuccess('JSON applied successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      setError('Invalid JSON syntax');
    }
  }

  async function handleSave() {
    // If in JSON mode, apply changes first
    if (editMode === 'json') {
      try {
        const parsed = JSON.parse(jsonInput);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          setSteps(parsed.steps);
        }
        if (parsed.costLimits) {
          setCostLimits(parsed.costLimits);
        }
        if (parsed.qualityGate) {
          setQualityGate(parsed.qualityGate);
        }
        if (parsed.notes !== undefined) {
          setNotes(parsed.notes || '');
        }
      } catch (e) {
        setError('Invalid JSON - please fix before saving');
        return;
      }
    }

    if (!slug || steps.length === 0) {
      setError('Please add at least one step to the pipeline');
      return;
    }

    // Validate steps
    for (const step of steps) {
      if (!step.modelId) {
        setError(`Step ${step.order} "${step.name}" needs a model selected`);
        return;
      }
      if (!step.promptBody.trim()) {
        setError(`Step ${step.order} "${step.name}" needs a prompt body`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const template = await createPipeline({
        slug,
        steps,
        costLimits,
        qualityGate,
        notes: notes.trim() || undefined,
      });

      setSuccess(`Pipeline v${template.version} saved successfully!`);
      setCurrentVersion(template.version);
      await loadData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pipeline');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!slug) return;

    const targets = testTargets.split(',').map(t => t.trim()).filter(t => t);
    if (targets.length === 0) {
      setError('Please enter at least one target word');
      return;
    }

    const grammar = testGrammar.split(',').map(g => g.trim()).filter(g => g);
    const knownVocab = testKnownVocab.split(',').map(v => v.trim()).filter(v => v);

    try {
      setTesting(true);
      setError(null);
      setTestResult(null);

      const result = await testPrompt({
        prompt_slug: slug,
        prompt_version: currentVersion || undefined,
        test_input: {
          targets,
          grammar: grammar.length > 0 ? grammar : undefined,
          known_vocabulary: knownVocab.length > 0 ? knownVocab : undefined,
        },
      });

      setTestResult(result);

      if (result.success) {
        setSuccess('Pipeline test completed successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  function handlePipelineChange(updates: {
    steps?: PipelineStep[];
    costLimits?: CostLimits;
    qualityGate?: QualityGate;
  }) {
    if (updates.steps) setSteps(updates.steps);
    if (updates.costLimits) setCostLimits(updates.costLimits);
    if (updates.qualityGate) setQualityGate(updates.qualityGate);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate('/prompts')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompts
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Pipeline Editor
            </h1>
            <p className="text-gray-600 mt-1 font-mono text-sm">{slug}</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || steps.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Pipeline'}
            </Button>
          </div>
        </div>

        {currentVersion && (
          <p className="text-sm text-gray-500 mt-2">
            Editing version {currentVersion} • {versions.length} total versions
          </p>
        )}

        {/* Edit Mode Toggle */}
        <div className="mt-4 flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => editMode === 'json' ? switchToVisualMode() : setEditMode('visual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              editMode === 'visual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Visual
          </button>
          <button
            onClick={() => editMode === 'visual' ? switchToJsonMode() : setEditMode('json')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              editMode === 'json'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4" />
            JSON
          </button>
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

      {/* Visual Mode: Pipeline Builder */}
      {editMode === 'visual' && (
        <>
          <PipelineStepBuilder
            steps={steps}
            costLimits={costLimits}
            qualityGate={qualityGate}
            models={models}
            activeModelId={activeModelId}
            onChange={handlePipelineChange}
          />

          {/* Notes */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what this pipeline version does..."
              rows={2}
              className="mt-1"
            />
          </div>
        </>
      )}

      {/* JSON Mode: Raw Editor */}
      {editMode === 'json' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Edit Pipeline JSON</h3>
              <p className="text-sm text-gray-500">
                Edit the raw JSON configuration. Changes apply when you save or switch to visual mode.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={applyJsonChanges}>
              Apply Changes
            </Button>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-[500px] px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
            spellCheck={false}
          />
          <p className="mt-2 text-xs text-gray-400">
            Tip: Edit steps, costLimits, qualityGate, and notes. Slug cannot be changed.
          </p>
        </div>
      )}

      {/* Test Panel */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowTestPanel(!showTestPanel)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-900">Test Pipeline</span>
          </div>
          {showTestPanel ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showTestPanel && (
          <div className="p-6 pt-0 border-t border-gray-100 space-y-4">
            <p className="text-sm text-gray-600">
              Test your pipeline with sample data. This will run all steps and show results.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="testTargets">Target Words *</Label>
                <Input
                  id="testTargets"
                  value={testTargets}
                  onChange={(e) => setTestTargets(e.target.value)}
                  placeholder="你好, 再见, 谢谢"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="testGrammar">Grammar Points</Label>
                <Input
                  id="testGrammar"
                  value={testGrammar}
                  onChange={(e) => setTestGrammar(e.target.value)}
                  placeholder="greetings, basic"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="testKnownVocab">Known Vocabulary</Label>
                <Input
                  id="testKnownVocab"
                  value={testKnownVocab}
                  onChange={(e) => setTestKnownVocab(e.target.value)}
                  placeholder="我, 是, 很"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={handleTest}
              disabled={testing || !testTargets.trim() || steps.length === 0}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>

            {/* Test Results */}
            {testResult && (
              <TestResultDisplay result={testResult} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// Test Result Display Component
// ========================================

function TestResultDisplay({ result }: { result: TestPromptResult }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showOutput, setShowOutput] = useState(false);

  return (
    <div className="mt-6 space-y-4">
      {/* Summary */}
      <div className={`p-4 rounded-lg border ${
        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`font-semibold ${
            result.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {result.success ? 'Pipeline Passed' : 'Pipeline Failed'}
          </span>
        </div>

        {result.debug && (
          <div className="grid grid-cols-3 gap-4 text-sm mt-3">
            <div>
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-medium ml-2">
                ${(result.debug.total_cost ?? result.debug.estimated_cost ?? 0).toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Tokens:</span>
              <span className="font-medium ml-2">
                {result.debug.total_tokens ?? result.debug.tokens?.total ?? 0}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Latency:</span>
              <span className="font-medium ml-2">
                {result.debug.total_latency_ms ?? result.debug.latency_ms ?? 0}ms
              </span>
            </div>
          </div>
        )}

        {result.debug?.quality_score !== undefined && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Quality Score:</span>
            <span className={`font-medium ml-2 ${
              result.debug.quality_score >= 70 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {result.debug.quality_score}/100
            </span>
          </div>
        )}

        {result.debug?.abort_reason && (
          <p className="mt-2 text-sm text-red-600">{result.debug.abort_reason}</p>
        )}
      </div>

      {/* Step-by-Step Results */}
      {result.steps && result.steps.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Step Results</h4>
          {result.steps.map((step: StepResult) => (
            <div
              key={step.order}
              className={`border rounded-lg overflow-hidden ${
                step.status === 'success' ? 'border-green-200' : 'border-red-200'
              }`}
            >
              <button
                onClick={() => setExpandedStep(expandedStep === step.order ? null : step.order)}
                className={`w-full p-3 flex items-center justify-between text-left ${
                  step.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.status === 'success' 
                      ? 'bg-green-200 text-green-700' 
                      : 'bg-red-200 text-red-700'
                  }`}>
                    {step.order}
                  </span>
                  <div>
                    <span className="font-medium">{step.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {step.model_used} • {step.latency_ms}ms • ${step.cost.toFixed(4)}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${
                  expandedStep === step.order ? 'rotate-180' : ''
                }`} />
              </button>

              {expandedStep === step.order && (
                <div className="p-4 bg-white border-t">
                  <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Input Tokens:</span>
                      <span className="ml-1 font-medium">{step.tokens.input}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Output Tokens:</span>
                      <span className="ml-1 font-medium">{step.tokens.output}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Retries:</span>
                      <span className="ml-1 font-medium">{step.retry_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className={`ml-1 font-medium ${
                        step.status === 'success' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                  </div>

                  {step.error && (
                    <div className="p-3 bg-red-50 rounded text-sm text-red-700 mb-4">
                      {step.error}
                    </div>
                  )}

                  {step.output !== undefined && step.output !== null && (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOutput(!showOutput);
                        }}
                        className="text-sm text-purple-600 hover:underline mb-2"
                      >
                        {showOutput ? 'Hide Output' : 'Show Output'}
                      </button>
                      {showOutput && (
                        <pre className="p-3 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto max-h-48">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Final Output */}
      {result.success && result.output && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="w-full p-3 bg-gray-50 flex items-center justify-between text-sm font-medium"
          >
            <span>Final Output</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showOutput ? 'rotate-180' : ''}`} />
          </button>
          {showOutput && (
            <pre className="p-4 bg-gray-900 text-xs text-green-400 overflow-x-auto max-h-64">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default PipelineEditor;

