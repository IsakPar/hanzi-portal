/**
 * AI Studio - Enhance Page
 * 
 * Take an existing lesson and enhance it with AI.
 * Shows before/after comparison for approval.
 */

import { useState, useEffect } from 'react';
import { Wand2, Loader2, Check, X, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import { AIStudioLayout } from '@/layouts/AIStudioLayout';
import { enhanceLesson, getVocabulary, type EnhanceLessonResponse, type VocabularyItem } from '@/services/aiStudioAPI';
import { lessonAPI } from '@/services/lessonAPI';
import type { Lesson } from '@/types/lesson';

// JSON diff viewer component
function JsonDiff({ 
  original, 
  enhanced,
  path = ''
}: { 
  original: unknown; 
  enhanced: unknown;
  path?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  if (typeof original !== typeof enhanced) {
    return (
      <div className="flex gap-2 text-sm">
        <span className="bg-red-100 text-red-700 px-1 rounded line-through">
          {JSON.stringify(original)}
        </span>
        <span className="text-gray-400">→</span>
        <span className="bg-green-100 text-green-700 px-1 rounded">
          {JSON.stringify(enhanced)}
        </span>
      </div>
    );
  }

  if (Array.isArray(original) && Array.isArray(enhanced)) {
    const maxLen = Math.max(original.length, enhanced.length);
    const hasChanges = JSON.stringify(original) !== JSON.stringify(enhanced);
    
    return (
      <div className="ml-4">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="font-mono">[{original.length} items]</span>
          {hasChanges && enhanced.length !== original.length && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1 rounded">
              +{enhanced.length - original.length} new
            </span>
          )}
        </button>
        {expanded && (
          <div className="space-y-1 mt-1">
            {Array.from({ length: maxLen }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-400 text-xs w-4">{i}</span>
                <JsonDiff 
                  original={original[i]} 
                  enhanced={enhanced[i]} 
                  path={`${path}[${i}]`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof original === 'object' && original !== null) {
    const origObj = original as Record<string, unknown>;
    const enhObj = enhanced as Record<string, unknown>;
    const allKeys = [...new Set([...Object.keys(origObj), ...Object.keys(enhObj)])];
    
    return (
      <div className="ml-4 space-y-1">
        {allKeys.map(key => {
          const hasChange = JSON.stringify(origObj[key]) !== JSON.stringify(enhObj[key]);
          const isNew = !(key in origObj);
          
          return (
            <div key={key}>
              <span className={`font-mono text-sm ${hasChange ? 'text-violet-600 font-medium' : 'text-gray-600'}`}>
                {key}:
              </span>
              {isNew && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">new</span>}
              <JsonDiff 
                original={origObj[key]} 
                enhanced={enhObj[key]}
                path={`${path}.${key}`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Primitives
  if (original !== enhanced) {
    return (
      <span className="text-sm">
        <span className="bg-red-100 text-red-700 px-1 rounded line-through mr-1">
          {String(original)}
        </span>
        <span className="text-gray-400 mx-1">→</span>
        <span className="bg-green-100 text-green-700 px-1 rounded">
          {String(enhanced)}
        </span>
      </span>
    );
  }

  return <span className="text-sm text-gray-600">{String(original)}</span>;
}

// Block comparison component
function BlockComparison({ 
  original, 
  enhanced 
}: { 
  original: unknown[]; 
  enhanced: unknown[];
}) {
  return (
    <div className="space-y-3">
      {enhanced.map((block: any, i: number) => {
        const origBlock = original[i] as any;
        const isNew = !origBlock;
        const hasChanges = origBlock && JSON.stringify(origBlock) !== JSON.stringify(block);
        
        return (
          <div 
            key={i} 
            className={`p-3 rounded-lg border ${
              isNew ? 'bg-green-50 border-green-200' :
              hasChanges ? 'bg-amber-50 border-amber-200' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-gray-500">#{i + 1}</span>
              <span className="text-sm font-medium text-gray-700">{block.type}</span>
              {isNew && <span className="text-xs bg-green-500 text-white px-1.5 rounded">NEW</span>}
              {hasChanges && <span className="text-xs bg-amber-500 text-white px-1.5 rounded">MODIFIED</span>}
            </div>
            
            {(isNew || hasChanges) && (
              <div className="text-xs bg-white rounded p-2 overflow-auto max-h-40">
                <pre className="text-gray-600">
                  {JSON.stringify(block.content, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EnhancePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [customJson, setCustomJson] = useState('');
  const [useCustomJson, setUseCustomJson] = useState(false);
  
  const [instructions, setInstructions] = useState('');
  const [useVocabDb, setUseVocabDb] = useState(true);
  const [hskLevel, setHskLevel] = useState(1);
  
  const [enhancing, setEnhancing] = useState(false);
  const [result, setResult] = useState<EnhanceLessonResponse | null>(null);
  
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loadingVocab, setLoadingVocab] = useState(false);

  // Load lessons
  useEffect(() => {
    lessonAPI.getAll().then(res => setLessons(res.lessons || []));
  }, []);

  // Load vocabulary when HSK level changes
  useEffect(() => {
    if (useVocabDb) {
      setLoadingVocab(true);
      getVocabulary(hskLevel)
        .then(res => setVocabulary(res.vocabulary))
        .finally(() => setLoadingVocab(false));
    }
  }, [hskLevel, useVocabDb]);

  const handleEnhance = async () => {
    if (!instructions.trim()) {
      toast.error('Missing instructions', 'Tell the AI what to enhance');
      return;
    }

    if (!selectedLesson && !customJson.trim()) {
      toast.error('No lesson selected', 'Select a lesson or paste JSON');
      return;
    }

    setEnhancing(true);
    setResult(null);

    try {
      const response = await enhanceLesson({
        lessonId: useCustomJson ? undefined : selectedLesson?.id,
        lessonJson: useCustomJson ? JSON.parse(customJson) : undefined,
        instructions,
        useVocabDb,
        hskLevel,
      });

      setResult(response);
      toast.success('Enhancement complete!', `Used ${response.generation.tokensUsed} tokens`);
    } catch (err) {
      toast.error('Enhancement failed', (err as Error).message);
    } finally {
      setEnhancing(false);
    }
  };

  const handleApply = async () => {
    if (!result || !selectedLesson) return;
    
    try {
      await lessonAPI.update(selectedLesson.id, result.enhanced as any);
      toast.success('Lesson updated!', 'Changes have been applied');
      setResult(null);
    } catch (err) {
      toast.error('Update failed', (err as Error).message);
    }
  };

  return (
    <AIStudioLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-500" />
            Enhance Lesson
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Select a lesson and tell AI how to improve it
          </p>
        </div>

        {!result ? (
          /* Input Form */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Lesson Selection */}
            <div className="lg:col-span-2 space-y-4">
              {/* Select Lesson or Paste JSON */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setUseCustomJson(false)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${!useCustomJson ? 'bg-violet-100 text-violet-700' : 'text-gray-500'}`}
                  >
                    Select Lesson
                  </button>
                  <button
                    onClick={() => setUseCustomJson(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${useCustomJson ? 'bg-violet-100 text-violet-700' : 'text-gray-500'}`}
                  >
                    Paste JSON
                  </button>
                </div>

                {!useCustomJson ? (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {lessons.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">No lessons found</p>
                    ) : (
                      lessons.map(lesson => (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            setSelectedLesson(lesson);
                            setHskLevel(lesson.hskLevel);
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedLesson?.id === lesson.id 
                              ? 'border-violet-300 bg-violet-50' 
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 text-sm">{lesson.title}</span>
                            <span className="text-xs text-gray-400">HSK {lesson.hskLevel}</span>
                          </div>
                          {lesson.subtitle && (
                            <p className="text-xs text-gray-500 mt-0.5">{lesson.subtitle}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={customJson}
                    onChange={(e) => setCustomJson(e.target.value)}
                    placeholder='Paste lesson JSON here...'
                    rows={10}
                    className="font-mono text-xs"
                  />
                )}
              </div>

              {/* Instructions */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <Label className="text-gray-700 mb-2 block text-sm font-medium">
                  What should AI do?
                </Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={`Examples:

• "Add 2 more distractor options to each multiple choice question"
• "Add speaking practice blocks after each new word"
• "Make the exercises progressively harder"
• "Add a pattern block explaining 是 sentences"`}
                  rows={5}
                  className="text-sm"
                />
              </div>

              {/* Enhance Button */}
              <Button
                onClick={handleEnhance}
                disabled={enhancing || (!selectedLesson && !customJson.trim()) || !instructions.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-5"
              >
                {enhancing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Enhance Lesson
                  </>
                )}
              </Button>
            </div>

            {/* Right: Vocabulary Preview */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-700 text-sm font-medium">Vocabulary Database</Label>
                  <select
                    value={hskLevel}
                    onChange={(e) => setHskLevel(Number(e.target.value))}
                    className="text-xs px-2 py-1 border border-gray-200 rounded"
                  >
                    {[1, 2, 3, 4, 5, 6].map(l => (
                      <option key={l} value={l}>HSK {l}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={useVocabDb}
                    onChange={(e) => setUseVocabDb(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Use for distractors</span>
                </label>

                {loadingVocab ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto space-y-1">
                    {vocabulary.slice(0, 30).map(v => (
                      <div key={v.id} className="text-xs p-1.5 bg-gray-50 rounded flex items-center gap-2">
                        <span className="font-medium text-gray-900">{v.hanzi}</span>
                        <span className="text-gray-400">{v.pinyin}</span>
                        <span className="text-gray-500 truncate flex-1">{v.english}</span>
                      </div>
                    ))}
                    {vocabulary.length > 30 && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        +{vocabulary.length - 30} more words
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  {vocabulary.length} words available
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Result View */
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div>
                <h2 className="font-medium text-gray-900">Review Changes</h2>
                <p className="text-sm text-gray-500">
                  {result.generation.tokensUsed} tokens • {(result.generation.durationMs / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResult(null)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Discard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEnhance}
                  disabled={enhancing}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApply}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Apply Changes
                </Button>
              </div>
            </div>

            {/* Block Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="font-medium text-gray-700 mb-3 text-sm">Original Blocks</h3>
                <div className="space-y-2 max-h-[500px] overflow-auto">
                  {((result.original as any).blocks || []).map((block: any, i: number) => (
                    <div key={i} className="p-2 bg-gray-50 rounded text-xs">
                      <span className="font-mono text-gray-500">#{i + 1}</span>
                      <span className="ml-2 font-medium">{block.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="font-medium text-gray-700 mb-3 text-sm">Enhanced Blocks</h3>
                <BlockComparison 
                  original={(result.original as any).blocks || []}
                  enhanced={(result.enhanced as any).blocks || []}
                />
              </div>
            </div>

            {/* Full JSON Diff */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-gray-700 mb-3 text-sm">Full Comparison</h3>
              <div className="max-h-96 overflow-auto text-sm">
                <JsonDiff original={result.original} enhanced={result.enhanced} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AIStudioLayout>
  );
}

export default EnhancePage;

