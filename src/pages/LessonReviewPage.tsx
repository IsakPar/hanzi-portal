/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * LessonReviewPage - Review connected words before publishing
 * 
 * Shows:
 * 1. Words used in the lesson
 * 2. Alternative words (already approved)
 * 3. Connected words from RAG (select/deselect)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Check, Sparkles, Link2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

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

  // Load lesson and word data
  useEffect(() => {
    if (lessonId) {
      loadData();
    }
  }, [lessonId]);

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

