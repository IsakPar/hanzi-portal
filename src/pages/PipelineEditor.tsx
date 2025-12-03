/**
 * Pipeline Editor Page
 * 
 * Dedicated editor for creating and managing multi-step AI prompt pipelines.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
} from '@/services/promptsAPI';
import { PipelineTestPanel, PipelineJsonEditor } from '@/components/pipeline-editor';

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

  function switchToVisualMode() {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.steps && Array.isArray(parsed.steps)) setSteps(parsed.steps);
      if (parsed.costLimits) setCostLimits(parsed.costLimits);
      if (parsed.qualityGate) setQualityGate(parsed.qualityGate);
      if (parsed.notes !== undefined) setNotes(parsed.notes || '');
      setEditMode('visual');
      setError(null);
    } catch {
      setError('Invalid JSON - please fix before switching to visual mode');
    }
  }

  function applyJsonChanges() {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.steps && Array.isArray(parsed.steps)) setSteps(parsed.steps);
      if (parsed.costLimits) setCostLimits(parsed.costLimits);
      if (parsed.qualityGate) setQualityGate(parsed.qualityGate);
      if (parsed.notes !== undefined) setNotes(parsed.notes || '');
      setSuccess('JSON applied successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError('Invalid JSON syntax');
    }
  }

  async function handleSave() {
    if (editMode === 'json') {
      try {
        const parsed = JSON.parse(jsonInput);
        if (parsed.steps && Array.isArray(parsed.steps)) setSteps(parsed.steps);
        if (parsed.costLimits) setCostLimits(parsed.costLimits);
        if (parsed.qualityGate) setQualityGate(parsed.qualityGate);
        if (parsed.notes !== undefined) setNotes(parsed.notes || '');
      } catch {
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

  async function handleTest(params: {
    targets: string[];
    grammar?: string[];
    knownVocab?: string[];
  }) {
    if (!slug) throw new Error('No slug');

    const result = await testPrompt({
      prompt_slug: slug,
      prompt_version: currentVersion || undefined,
      test_input: {
        targets: params.targets,
        grammar: params.grammar,
        known_vocabulary: params.knownVocab,
      },
    });

    if (result.success) {
      setSuccess('Pipeline test completed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    }

    return result;
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

      {/* JSON Mode */}
      {editMode === 'json' && (
        <PipelineJsonEditor
          jsonInput={jsonInput}
          setJsonInput={setJsonInput}
          onApply={applyJsonChanges}
        />
      )}

      {/* Test Panel */}
      <PipelineTestPanel
        hasSteps={steps.length > 0}
        onTest={handleTest}
      />
    </div>
  );
}

export default PipelineEditor;
