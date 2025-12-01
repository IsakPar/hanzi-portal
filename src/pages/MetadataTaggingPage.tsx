/**
 * Batch Metadata Tagging Page
 * 
 * Allows efficient tagging of vocabulary metadata (POS, tone pattern)
 * with AI-powered suggestions and quick approval workflow.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, CheckCircle2, X, Loader2, RefreshCw, 
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Filter, Zap, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { POS_OPTIONS, type VocabularyEntry } from '@/services/vocabularyAPI';
import { getMetadataStats, tagWord, type MetadataStats } from '@/services/distractorsAPI';
import { toast } from '@/hooks/useToast';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VocabWithMeta extends VocabularyEntry {
  pos?: string | null;
  tonePattern?: string | null;
}

type FilterMode = 'missing-pos' | 'missing-tone' | 'missing-any' | 'all';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function extractTonePattern(pinyin: string): string {
  const toneMap: Record<string, string> = {
    'ā': '1', 'á': '2', 'ǎ': '3', 'à': '4',
    'ē': '1', 'é': '2', 'ě': '3', 'è': '4',
    'ī': '1', 'í': '2', 'ǐ': '3', 'ì': '4',
    'ō': '1', 'ó': '2', 'ǒ': '3', 'ò': '4',
    'ū': '1', 'ú': '2', 'ǔ': '3', 'ù': '4',
    'ǖ': '1', 'ǘ': '2', 'ǚ': '3', 'ǜ': '4',
  };
  
  const tones: string[] = [];
  const syllables = pinyin.toLowerCase().split(/\s+/);
  
  for (const syllable of syllables) {
    let foundTone = '5';
    for (const char of syllable) {
      if (toneMap[char]) {
        foundTone = toneMap[char];
        break;
      }
    }
    tones.push(foundTone);
  }
  
  return tones.join('-');
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function MetadataTaggingPage() {
  const navigate = useNavigate();
  
  // Data state
  const [vocabulary, setVocabulary] = useState<VocabWithMeta[]>([]);
  const [stats, setStats] = useState<MetadataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter & pagination
  const [filterMode, setFilterMode] = useState<FilterMode>('missing-any');
  const [hskFilter, setHskFilter] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  
  // Tagging state
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localChanges, setLocalChanges] = useState<Record<string, { pos?: string; tonePattern?: string }>>({});
  
  // Batch operations
  const [batchProcessing, setBatchProcessing] = useState(false);

  // ─────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────
  
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load stats
      const statsData = await getMetadataStats();
      setStats(statsData);
      
      // Load vocabulary (filtered)
      const params = new URLSearchParams();
      params.set('limit', '500'); // Get more for filtering
      if (hskFilter) params.set('hsk_level', hskFilter.toString());
      
      const response = await api.get<{ entries: VocabWithMeta[]; total: number }>(
        `/v1/vocabulary?${params.toString()}`
      );
      
      // Apply filter
      let filtered = response.entries;
      if (filterMode === 'missing-pos') {
        filtered = filtered.filter(v => !v.pos);
      } else if (filterMode === 'missing-tone') {
        filtered = filtered.filter(v => !v.tonePattern);
      } else if (filterMode === 'missing-any') {
        filtered = filtered.filter(v => !v.pos || !v.tonePattern);
      }
      
      setVocabulary(filtered);
      setPage(0);
    } catch (err) {
      setError((err as Error).message);
      toast.error('Failed to load vocabulary', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterMode, hskFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─────────────────────────────────────────────────────────
  // TAGGING ACTIONS
  // ─────────────────────────────────────────────────────────

  const handleAiTagSingle = async (vocabId: string) => {
    setTaggingId(vocabId);
    
    try {
      const vocab = vocabulary.find(v => v.id === vocabId);
      if (!vocab) return;
      
      // Get POS from AI
      const posResult = await tagWord({ wordId: vocabId, field: 'pos' });
      
      // Compute tone pattern locally
      const tonePattern = extractTonePattern(vocab.pinyin);
      
      // Store local changes
      setLocalChanges(prev => ({
        ...prev,
        [vocabId]: {
          pos: posResult.success ? posResult.value : prev[vocabId]?.pos,
          tonePattern,
        },
      }));
      
      toast.success('AI suggestion ready', 'Review and save');
    } catch (err) {
      toast.error('AI tagging failed', (err as Error).message);
    } finally {
      setTaggingId(null);
    }
  };

  const handleSaveSingle = async (vocabId: string) => {
    const changes = localChanges[vocabId];
    if (!changes) return;
    
    setSavingId(vocabId);
    
    try {
      await api.put(`/v1/vocabulary/admin/${vocabId}`, {
        pos: changes.pos || undefined,
        tonePattern: changes.tonePattern || undefined,
      });
      
      // Update local state
      setVocabulary(prev => prev.map(v => 
        v.id === vocabId 
          ? { ...v, pos: changes.pos || v.pos, tonePattern: changes.tonePattern || v.tonePattern }
          : v
      ));
      
      // Clear local changes
      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[vocabId];
        return next;
      });
      
      toast.success('Saved!', 'Metadata updated');
    } catch (err) {
      toast.error('Save failed', (err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const handleSkip = (vocabId: string) => {
    // Remove from local changes and move to next
    setLocalChanges(prev => {
      const next = { ...prev };
      delete next[vocabId];
      return next;
    });
  };

  const handleBatchComputeTones = async () => {
    setBatchProcessing(true);
    
    try {
      const currentPage = vocabulary.slice(page * pageSize, (page + 1) * pageSize);
      let updated = 0;
      
      for (const vocab of currentPage) {
        if (!vocab.tonePattern && vocab.pinyin) {
          const tonePattern = extractTonePattern(vocab.pinyin);
          
          await api.put(`/v1/vocabulary/admin/${vocab.id}`, {
            tonePattern,
          });
          
          setVocabulary(prev => prev.map(v => 
            v.id === vocab.id ? { ...v, tonePattern } : v
          ));
          
          updated++;
        }
      }
      
      toast.success('Batch complete', `Updated ${updated} tone patterns`);
    } catch (err) {
      toast.error('Batch failed', (err as Error).message);
    } finally {
      setBatchProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────────────────
  
  const totalPages = Math.ceil(vocabulary.length / pageSize);
  const currentPageItems = vocabulary.slice(page * pageSize, (page + 1) * pageSize);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <p className="text-gray-600 ml-3">Loading vocabulary...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate('/vocabulary')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vocabulary
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Batch Metadata Tagging
            </h1>
            <p className="text-gray-600 mt-1">
              AI-powered vocabulary tagging for smart distractor generation
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Words</div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <div className="text-3xl font-bold text-green-600">{stats.coverage.pos.count}</div>
            <div className="text-sm text-gray-500">
              With POS ({stats.coverage.pos.percent}%)
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${stats.coverage.pos.percent}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="text-3xl font-bold text-blue-600">{stats.coverage.tonePattern.count}</div>
            <div className="text-sm text-gray-500">
              With Tone ({stats.coverage.tonePattern.percent}%)
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${stats.coverage.tonePattern.percent}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <div className="text-3xl font-bold text-amber-600">{vocabulary.length}</div>
            <div className="text-sm text-gray-500">
              Need Tagging
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Label className="text-sm font-medium">Filter:</Label>
        </div>
        
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          <option value="missing-any">Missing Any Metadata</option>
          <option value="missing-pos">Missing POS</option>
          <option value="missing-tone">Missing Tone Pattern</option>
          <option value="all">All Vocabulary</option>
        </select>

        <select
          value={hskFilter || ''}
          onChange={(e) => setHskFilter(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All HSK Levels</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
            <option key={level} value={level}>HSK {level}</option>
          ))}
        </select>

        <div className="flex-1" />

        <Button
          variant="outline"
          onClick={handleBatchComputeTones}
          disabled={batchProcessing}
          className="border-blue-300 text-blue-700"
        >
          {batchProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          Compute All Tones (This Page)
        </Button>

        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Word</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Pinyin</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">POS</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tone</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentPageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No vocabulary matching this filter needs tagging.</p>
                </td>
              </tr>
            ) : (
              currentPageItems.map((vocab) => {
                const hasLocalChanges = localChanges[vocab.id];
                const displayPos = hasLocalChanges?.pos ?? vocab.pos;
                const displayTone = hasLocalChanges?.tonePattern ?? vocab.tonePattern;
                
                return (
                  <tr key={vocab.id} className="hover:bg-gray-50">
                    {/* Word */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900">{vocab.hanzi}</span>
                        <a
                          href={`/vocabulary/${vocab.id}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-xs text-gray-500">{vocab.english}</div>
                    </td>
                    
                    {/* Pinyin */}
                    <td className="px-4 py-3 text-gray-600">{vocab.pinyin}</td>
                    
                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {vocab.category}
                      </span>
                    </td>
                    
                    {/* POS */}
                    <td className="px-4 py-3">
                      {hasLocalChanges ? (
                        <select
                          value={displayPos || ''}
                          onChange={(e) => setLocalChanges(prev => ({
                            ...prev,
                            [vocab.id]: { ...prev[vocab.id], pos: e.target.value },
                          }))}
                          className="text-sm px-2 py-1 border border-green-300 rounded bg-green-50"
                        >
                          <option value="">Select...</option>
                          {POS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : displayPos ? (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                          {displayPos}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    
                    {/* Tone */}
                    <td className="px-4 py-3">
                      {hasLocalChanges ? (
                        <input
                          value={displayTone || ''}
                          onChange={(e) => setLocalChanges(prev => ({
                            ...prev,
                            [vocab.id]: { ...prev[vocab.id], tonePattern: e.target.value },
                          }))}
                          className="text-sm px-2 py-1 border border-blue-300 rounded bg-blue-50 font-mono w-20"
                          placeholder="1-1"
                        />
                      ) : displayTone ? (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-mono">
                          {displayTone}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasLocalChanges ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSaveSingle(vocab.id)}
                              disabled={savingId === vocab.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {savingId === vocab.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSkip(vocab.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAiTagSingle(vocab.id)}
                            disabled={taggingId === vocab.id}
                            className="border-green-300 text-green-700"
                          >
                            {taggingId === vocab.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Bot className="w-3 h-3" />
                            )}
                            <span className="ml-1">AI Tag</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, vocabulary.length)} of {vocabulary.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              <ChevronLeft className="w-4 h-4 -ml-2" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4 -ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetadataTaggingPage;

