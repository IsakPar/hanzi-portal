/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, CheckCircle2, Archive } from 'lucide-react';
import {
  getPromptVersions,
  createPrompt,
  clonePrompt,
  promotePrompt,
  rollbackPrompt,
  testPrompt,
  getAIModels,
  type PromptTemplate,
  type AIModel,
} from '@/services/promptsAPI';
import { useGlobalConfirm } from '@/hooks/useConfirm';
import {
  PromptTestPanel,
  ActiveVersionCard,
  DraftVersionsList,
  PromptDraftEditor,
} from '@/components/prompt-editor';

export function PromptEditor() {
  const { slug, versionParam } = useParams<{ slug: string; versionParam?: string }>();
  const navigate = useNavigate();
  const confirm = useGlobalConfirm();
  const isNewPrompt = versionParam === 'new';

  const [versions, setVersions] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');

  // Test panel state
  const [models, setModels] = useState<AIModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadVersions();
    }
  }, [slug]);

  useEffect(() => {
    if (versions.length > 0 && !isNewPrompt) {
      const version = versions[0];
      setBody(version.body || '');
      setNotes(version.notes || '');
    }
  }, [versions, isNewPrompt]);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const response = await getAIModels();
      setModels(response.models);
      setActiveModelId(response.active_model_id);
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  }

  async function loadVersions() {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getPromptVersions(slug);
      setVersions(data);
    } catch (err) {
      if (isNewPrompt) {
        setVersions([]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load versions');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!slug || !body.trim()) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await createPrompt({
        slug,
        body: body.trim(),
        notes: notes.trim() || undefined,
      });

      setSuccess('Draft version created successfully!');
      await loadVersions();
      
      setBody('');
      setNotes('');
      
      setTimeout(() => {
        navigate(`/prompts/${slug}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  }

  async function handleClone(version: number) {
    if (!slug) return;

    try {
      setSaving(true);
      setError(null);
      const cloned = await clonePrompt(slug, { version });
      setSuccess(`Cloned v${version} to v${cloned.version}`);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone prompt');
    } finally {
      setSaving(false);
    }
  }

  async function handlePromote(version: number, reason: string) {
    if (!slug || !reason.trim()) {
      setError('Please provide a reason for promoting this version');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await promotePrompt(slug, { version, reason });
      setSuccess(`Version ${version} promoted to active!`);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote prompt');
    } finally {
      setSaving(false);
    }
  }

  async function handleRollback() {
    if (!slug) return;

    const confirmed = await confirm({
      title: 'Rollback Prompt?',
      description: 'Are you sure you want to rollback to the previous version? This will demote the current active version.',
      confirmLabel: 'Rollback',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);
      await rollbackPrompt(slug, { reason: 'Manual rollback from portal' });
      setSuccess('Rolled back to previous version!');
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(params: {
    versionToTest?: number;
    modelId?: string;
    targets: string[];
    grammar?: string[];
  }) {
    if (!slug) throw new Error('No slug');
    
    const result = await testPrompt({
      prompt_slug: slug,
      prompt_version: params.versionToTest,
      model_id: params.modelId,
      test_input: {
        targets: params.targets,
        grammar: params.grammar,
      },
    });

    if (result.success) {
      setSuccess('Test completed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    }

    return result;
  }

  const activeVersion = versions.find(v => v.status === 'active');
  const draftVersions = versions.filter(v => v.status === 'draft');
  const archivedCount = versions.filter(v => v.status === 'archived').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading prompt versions...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => navigate('/prompts')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompts
        </Button>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </h1>
        <p className="text-gray-600 mt-2 font-mono text-sm">{slug}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2">
          <PromptDraftEditor
            body={body}
            setBody={setBody}
            notes={notes}
            setNotes={setNotes}
            saving={saving}
            onSave={handleSave}
          />

          {/* Test Prompt Panel */}
          <div className="mt-6">
            <PromptTestPanel
              versions={versions}
              models={models}
              activeModelId={activeModelId}
              onTest={handleTest}
            />
          </div>
        </div>

        {/* Sidebar - Version Management */}
        <div className="space-y-6">
          {activeVersion && (
            <ActiveVersionCard
              version={activeVersion}
              saving={saving}
              onRollback={handleRollback}
            />
          )}

          <DraftVersionsList
            versions={draftVersions}
            saving={saving}
            onClone={handleClone}
            onPromote={handlePromote}
          />

          {/* Archived Count */}
          {archivedCount > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Archive className="w-5 h-5 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {archivedCount} archived version(s)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
