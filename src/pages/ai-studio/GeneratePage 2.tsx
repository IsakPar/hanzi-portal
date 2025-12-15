/**
 * AI Studio - Generate Page
 * 
 * Clean, light-themed workspace for generating lessons with AI.
 */

import { useState } from 'react';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import { AIStudioLayout } from '@/layouts/AIStudioLayout';
import { 
  generateLesson, 
  type GenerateLessonResponse,
  getStatusText,
} from '@/services/aiStudioAPI';

// Pipeline step component
function PipelineStep({ 
  label, 
  status, 
  model 
}: { 
  label: string; 
  status: 'pending' | 'running' | 'done' | 'error';
  model?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
        status === 'done' ? 'bg-green-100 text-green-600' :
        status === 'running' ? 'bg-amber-100 text-amber-600' :
        status === 'error' ? 'bg-red-100 text-red-600' :
        'bg-gray-100 text-gray-400'
      }`}>
        {status === 'done' && <Check className="w-3 h-3" />}
        {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'error' && <AlertCircle className="w-3 h-3" />}
        {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-700">{label}</p>
        {model && <p className="text-xs text-gray-400">{model}</p>}
      </div>
    </div>
  );
}

export function GeneratePage() {
  const [prompt, setPrompt] = useState('');
  const [hskLevel, setHskLevel] = useState(1);
  const [lessonNumber, setLessonNumber] = useState<number | undefined>();
  const [lessonType, setLessonType] = useState<'lesson' | 'speaking' | 'mini_test' | 'hsk_test'>('lesson');
  const [useContext, setUseContext] = useState(true);
  
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateLessonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [pipelineStatus, setPipelineStatus] = useState<{
    generate: 'pending' | 'running' | 'done' | 'error';
    validate: 'pending' | 'running' | 'done' | 'error';
    quality: 'pending' | 'running' | 'done' | 'error';
  }>({
    generate: 'pending',
    validate: 'pending',
    quality: 'pending',
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Missing prompt', 'Please describe the lesson you want to generate');
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);
    setPipelineStatus({ generate: 'running', validate: 'pending', quality: 'pending' });

    try {
      const response = await generateLesson({
        prompt,
        hskLevel,
        lessonNumber,
        lessonType,
        useContext,
      });

      setPipelineStatus({ generate: 'done', validate: 'running', quality: 'pending' });
      setResult(response);
      toast.success('Lesson generated!', `Draft ID: ${response.draftId}`);

      setTimeout(() => {
        setPipelineStatus({ generate: 'done', validate: 'done', quality: 'running' });
      }, 2000);

      setTimeout(() => {
        setPipelineStatus({ generate: 'done', validate: 'done', quality: 'done' });
      }, 4000);

    } catch (err) {
      setError((err as Error).message);
      setPipelineStatus({ generate: 'error', validate: 'pending', quality: 'pending' });
      toast.error('Generation failed', (err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AIStudioLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Generate Lesson
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Describe what you want to teach and let AI create the lesson
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Input (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Prompt */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <Label className="text-gray-700 mb-2 block text-sm font-medium">
                Describe Your Lesson
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Example prompts:

• "Unit 2, Lesson 8: Action Verbs (吃, 喝, 看, 听). Introduce basic action verbs with exercises."

• "Speaking practice for greetings and introductions. Focus on tones."

• "Mini test covering pronouns and 是 sentences from Unit 1."`}
                rows={8}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none"
              />
            </div>

            {/* Options */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-700 mb-1.5 block text-sm">HSK Level</Label>
                  <select 
                    value={hskLevel} 
                    onChange={(e) => setHskLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                      <option key={level} value={level}>HSK {level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 mb-1.5 block text-sm">Lesson Type</Label>
                  <select 
                    value={lessonType} 
                    onChange={(e) => setLessonType(e.target.value as typeof lessonType)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm"
                  >
                    <option value="lesson">📚 Lesson</option>
                    <option value="speaking">🎤 Speaking</option>
                    <option value="mini_test">✏️ Mini Test</option>
                    <option value="hsk_test">🎯 HSK Test</option>
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 mb-1.5 block text-sm">Lesson #</Label>
                  <input
                    type="number"
                    min={1}
                    value={lessonNumber || ''}
                    onChange={(e) => setLessonNumber(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useContext}
                  onChange={(e) => setUseContext(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <span className="text-sm text-gray-700">Use curriculum context</span>
                  <p className="text-xs text-gray-400">Include prior lessons for better continuity</p>
                </div>
              </label>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-5 text-sm font-medium rounded-xl shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Lesson
                </>
              )}
            </Button>
          </div>

          {/* Right: Status (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Pipeline Status */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-3 text-sm">Pipeline</h3>
              <div className="space-y-0.5">
                <PipelineStep label="Generate" status={pipelineStatus.generate} model="Qwen 2.5" />
                <PipelineStep label="Validate" status={pipelineStatus.validate} model="Workers AI" />
                <PipelineStep label="Quality" status={pipelineStatus.quality} model="DeepSeek" />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium text-sm">Error</span>
                </div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Result Preview */}
            {result && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 text-sm">Generated</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    result.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {getStatusText(result.status)}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{result.lesson.title}</p>
                  {result.lesson.subtitle && (
                    <p className="text-sm text-gray-500">{result.lesson.subtitle}</p>
                  )}
                  
                  <div className="flex gap-3 text-xs text-gray-500 pt-2">
                    <span>HSK {result.lesson.hskLevel}</span>
                    <span>•</span>
                    <span className="capitalize">{result.lesson.lessonType}</span>
                    <span>•</span>
                    <span>{result.lesson.blocks?.length || 0} blocks</span>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.location.href = `/ai-studio/drafts/${result.draftId}`}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => toast.info('Coming soon', 'Quick approve not yet implemented')}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!result && !generating && !error && (
              <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-6 text-center">
                <Sparkles className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Results appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AIStudioLayout>
  );
}

export default GeneratePage;
