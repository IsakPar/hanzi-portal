/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * LessonReviewPage - Review connected words before publishing
 * 
 * Shows:
 * 1. Words used in the lesson
 * 2. Alternative words (already approved)
 * 3. Connected words from RAG (select/deselect)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Check, Sparkles, Link2, BookOpen, Zap, RefreshCw, CloudDownload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';
import { getHealth, segmentText, triggerSync, type HealthResponse, type SegmentResponse } from '@/services/validatorAPI';

interface VocabWord {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category?: string;
}

interface LessonData {
  id: string;
  title: string;
  subtitle?: string;
  hskLevel: number;
}

export function LessonReviewPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  
  // Words data
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [usedVocab, setUsedVocab] = useState<VocabWord[]>([]);
  const [alternativeWords, setAlternativeWords] = useState<VocabWord[]>([]);
  const [, setRelatedWords] = useState<VocabWord[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, VocabWord[]>>({});
  
  // Selected connected words
  const [selectedConnected, setSelectedConnected] = useState<Set<string>>(new Set());
  
  // Vocab Scanner state
  const [validatorHealth, setValidatorHealth] = useState<HealthResponse | null>(null);
  const [validatorLoading, setValidatorLoading] = useState(false);
  const [segmentResult, setSegmentResult] = useState<SegmentResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Check validator health
  const checkValidatorHealth = useCallback(async () => {
    setValidatorLoading(true);
    try {
      const health = await getHealth();
      console.log('[LessonReview] Validator health:', health);
      setValidatorHealth(health);
      return health;
    } catch (err) {
      console.error('[LessonReview] Health check failed:', err);
      setValidatorHealth(null);
      return null;
    } finally {
      setValidatorLoading(false);
    }
  }, []);

  // Sync validator curriculum
  const syncValidator = useCallback(async () => {
    setSyncing(true);
    try {
      console.log('[LessonReview] Triggering sync...');
      const result = await triggerSync();
      if (result.success) {
        toast.success('Validator synced', `${result.word_count} words loaded`);
        await checkValidatorHealth();
        return true;
      } else {
        toast.error('Sync failed', 'Could not sync validator');
        return false;
      }
    } catch (err) {
      console.error('[LessonReview] Sync failed:', err);
      toast.error('Sync failed', err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [checkValidatorHealth]);

  // Scan/Recheck - segment all used words
  const handleRecheck = useCallback(async () => {
    if (usedWords.length === 0) {
      toast.error('No words to scan', 'Add content to the lesson first');
      return;
    }

    setScanning(true);
    try {
      // Check if we need to sync first
      let health = validatorHealth;
      if (!health) {
        health = await checkValidatorHealth();
      }

      // Auto-sync if validator is empty
      if (health && health.word_count === 0) {
        console.log('[LessonReview] Validator empty, auto-syncing...');
        const synced = await syncValidator();
        if (!synced) {
          setScanning(false);
          return;
        }
      }

      // Segment all used words/characters
      console.log('[LessonReview] Segmenting', usedWords.length, 'items...');
      const result = await segmentText(usedWords);
      console.log('[LessonReview] Segment result:', result);
      setSegmentResult(result);
      
      toast.success('Scan complete', `Found ${result.all_words.length} unique words`);
    } catch (err) {
      console.error('[LessonReview] Scan failed:', err);
      toast.error('Scan failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  }, [usedWords, validatorHealth, checkValidatorHealth, syncValidator]);

  // Load lesson and word data
  useEffect(() => {
    if (lessonId) {
      loadData();
      checkValidatorHealth();
    }
  }, [lessonId, checkValidatorHealth]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load lesson details
      const lessonRes = await api.get(`/v1/lessons/${lessonId}`) as LessonData;
      setLesson(lessonRes);
      
      // Load connected words data
      const connectedRes = await api.get(`/v1/lesson-alternatives/lessons/${lessonId}/connected-words`) as {
        usedWords?: string[];
        usedVocab?: VocabWord[];
        relatedWords?: VocabWord[];
        byCategory?: Record<string, VocabWord[]>;
      };
      
      setUsedWords(connectedRes.usedWords || []);
      setUsedVocab(connectedRes.usedVocab || []);
      setRelatedWords(connectedRes.relatedWords || []);
      setByCategory(connectedRes.byCategory || {});
      
      // Extract alternative words from lesson blocks
      // This would need the actual block data - for now showing empty
      setAlternativeWords([]);
      
    } catch (err: any) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load lesson data');
    } finally {
      setLoading(false);
    }
  };

  const toggleConnected = (wordId: string) => {
    const newSelected = new Set(selectedConnected);
    if (newSelected.has(wordId)) {
      newSelected.delete(wordId);
    } else {
      newSelected.add(wordId);
    }
    setSelectedConnected(newSelected);
  };

  const selectAllInCategory = (category: string) => {
    const newSelected = new Set(selectedConnected);
    byCategory[category]?.forEach(word => newSelected.add(word.id));
    setSelectedConnected(newSelected);
  };

  const deselectAllInCategory = (category: string) => {
    const newSelected = new Set(selectedConnected);
    byCategory[category]?.forEach(word => newSelected.delete(word.id));
    setSelectedConnected(newSelected);
  };

  const handleSaveAndPublish = async () => {
    try {
      setSaving(true);
      
      // Save connected words
      await api.post(`/v1/lesson-alternatives/lessons/${lessonId}/connected-words`, {
        wordIds: Array.from(selectedConnected)
      });
      
      toast.success('Lesson saved with connected words!');
      navigate('/lessons');
      
    } catch (err: any) {
      console.error('Failed to save:', err);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/lessons/${lessonId}`)}>
                <ArrowLeft size={16} className="mr-1" />
                Back to Editor
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{lesson?.title || 'Review Lesson'}</h1>
                <p className="text-sm text-muted-foreground">Review words and connected vocabulary</p>
              </div>
            </div>
            <Button onClick={handleSaveAndPublish} disabled={saving}>
              {saving ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Save & Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        
        {/* Section 1: Words Used in Lesson */}
        <section className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">Words Used in Lesson</h2>
            <span className="text-sm text-muted-foreground">({usedVocab.length} words)</span>
          </div>
          
          {usedVocab.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {usedVocab.map((word) => (
                <div
                  key={word.id}
                  className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                  title={`${word.pinyin} - ${word.english}`}
                >
                  <div className="font-medium">{word.hanzi}</div>
                  <div className="text-xs text-blue-600">{word.pinyin}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center bg-gray-50 rounded-lg">
              No vocabulary words detected in lesson blocks
            </div>
          )}
          
          {/* Also show raw used characters */}
          {usedWords.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">All characters used:</div>
              <div className="flex flex-wrap gap-1">
                {usedWords.map((char, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-sm">
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Vocab Scanner Section */}
        <section className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-purple-500" />
              <h2 className="text-lg font-semibold">Vocab Scanner</h2>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Validator Status */}
              {syncing ? (
                <span className="text-xs text-purple-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Syncing...
                </span>
              ) : validatorLoading ? (
                <span className="text-xs text-gray-400">Checking...</span>
              ) : validatorHealth ? (
                validatorHealth.word_count === 0 ? (
                  <button
                    onClick={syncValidator}
                    disabled={syncing}
                    className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1"
                  >
                    <CloudDownload className="w-3 h-3" />
                    Needs sync
                  </button>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {validatorHealth.word_count} words
                  </span>
                )
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  Unavailable
                </span>
              )}
              
              {/* Sync button */}
              {validatorHealth && validatorHealth.word_count > 0 && (
                <button
                  onClick={syncValidator}
                  disabled={syncing}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Sync vocabulary"
                >
                  <CloudDownload className={`w-4 h-4 text-gray-500 ${syncing ? 'animate-pulse' : ''}`} />
                </button>
              )}
              
              {/* Refresh status */}
              <button
                onClick={checkValidatorHealth}
                disabled={validatorLoading || syncing}
                className="p-1 hover:bg-gray-200 rounded"
                title="Refresh status"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${validatorLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Segment lesson content into individual words and check which ones are in your vocabulary database.
          </p>
          
          {/* Recheck Button */}
          <Button
            onClick={handleRecheck}
            disabled={scanning || syncing || usedWords.length === 0}
            variant="outline"
            className="mb-4"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Recheck Words
              </>
            )}
          </Button>
          
          {/* Scan Results */}
          {segmentResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-2">
                {segmentResult.unknown_words.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
                <span className="font-medium">
                  {segmentResult.unknown_words.length === 0 
                    ? 'All words in curriculum!' 
                    : `${segmentResult.unknown_words.length} unknown words found`}
                </span>
              </div>
              
              {/* Segmented Words */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Segmented Words ({segmentResult.all_words.length} unique)
                </div>
                <div className="flex flex-wrap gap-2">
                  {segmentResult.all_words.map((word, i) => {
                    const isUnknown = segmentResult.unknown_words.includes(word);
                    const isSafe = segmentResult.always_safe_removed.includes(word);
                    const inCurriculum = segmentResult.curriculum_words.includes(word);
                    
                    return (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded text-sm ${
                          isUnknown
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isSafe
                            ? 'bg-gray-100 text-gray-500'
                            : inCurriculum
                            ? 'bg-green-100 text-green-800'
                            : 'bg-white border border-gray-200'
                        }`}
                        title={
                          isUnknown ? 'Not in vocabulary DB' 
                            : isSafe ? 'Common word (always safe)' 
                            : inCurriculum ? 'In curriculum'
                            : 'Unknown'
                        }
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>
              
              {/* Unknown Words (if any) */}
              {segmentResult.unknown_words.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm font-medium text-amber-800 mb-2">
                    Words not in vocabulary database:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {segmentResult.unknown_words.map((word, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white rounded border border-amber-300 text-sm"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Tip: Add these words to the vocabulary database, or they may be common words not needing explicit teaching.
                  </p>
                </div>
              )}
              
              {/* Stats */}
              <div className="text-xs text-gray-500">
                {segmentResult.curriculum_words.length} in curriculum • 
                {segmentResult.always_safe_removed.length} common words skipped • 
                {segmentResult.unknown_words.length} unknown
              </div>
            </div>
          )}
          
          {!segmentResult && usedWords.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center bg-gray-50 rounded-lg">
              No content to scan. Add vocabulary to your lesson blocks first.
            </div>
          )}
        </section>

        {/* Section 2: Alternative Words */}
        <section className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-purple-500" />
            <h2 className="text-lg font-semibold">Alternative Words</h2>
            <span className="text-sm text-muted-foreground">(approved in block editors)</span>
          </div>
          
          {alternativeWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {alternativeWords.map((word) => (
                <div
                  key={word.id}
                  className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg"
                  title={`${word.pinyin} - ${word.english}`}
                >
                  <div className="font-medium">{word.hanzi}</div>
                  <div className="text-xs text-purple-600">{word.pinyin}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center bg-gray-50 rounded-lg">
              No alternatives added yet. Add them in the block editors using the [+] button.
            </div>
          )}
        </section>

        {/* Section 3: Connected Words (RAG Suggestions) */}
        <section className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={20} className="text-green-500" />
            <h2 className="text-lg font-semibold">Connected Words</h2>
            <span className="text-sm text-muted-foreground">
              ({selectedConnected.size} selected for Vocab Track)
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select related words to push to the Vocab Track. These help users expand their vocabulary in related categories.
          </p>
          
          {Object.keys(byCategory).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(byCategory).map(([category, words]) => (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{category}</span>
                      <span className="text-xs text-muted-foreground">
                        ({words.filter(w => selectedConnected.has(w.id)).length}/{words.length} selected)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => selectAllInCategory(category)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Select all
                      </button>
                      <button
                        onClick={() => deselectAllInCategory(category)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {words.map((word) => {
                      const isSelected = selectedConnected.has(word.id);
                      return (
                        <button
                          key={word.id}
                          onClick={() => toggleConnected(word.id)}
                          className={`px-3 py-2 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                          }`}
                          title={`${word.pinyin} - ${word.english}`}
                        >
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-left">{word.hanzi}</div>
                              <div className="text-xs opacity-70">{word.pinyin}</div>
                            </div>
                            {isSelected ? (
                              <Check size={14} className="text-green-600" />
                            ) : (
                              <div className="w-3.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center bg-gray-50 rounded-lg">
              <Link2 size={24} className="mx-auto mb-2 opacity-50" />
              No related words found. Add vocabulary words to your lesson blocks first.
            </div>
          )}
        </section>

        {/* Summary Footer */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{usedVocab.length}</div>
              <div className="text-sm text-blue-700">Lesson Words</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{alternativeWords.length}</div>
              <div className="text-sm text-purple-700">Alternatives</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{selectedConnected.size}</div>
              <div className="text-sm text-green-700">Connected Words</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

