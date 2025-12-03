/**
 * Batch Metadata Tagging Page
 * 
 * Allows efficient tagging of vocabulary metadata (POS, tone pattern)
 * with AI-powered suggestions and quick approval workflow.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { getMetadataStats, tagWord, type MetadataStats } from '@/services/distractorsAPI';
import { toast } from '@/hooks/useToast';
import {
  MetadataStatsSection,
  MetadataFilters,
  MetadataTableRow,
  MetadataPagination,
  type FilterMode,
  type VocabWithMeta,
} from '@/components/metadata-tagging';

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
  const [batchSecondaryProcessing, setBatchSecondaryProcessing] = useState(false);
  const [secondaryStats, setSecondaryStats] = useState<{ total: number; withSecondary: number; percent: number } | null>(null);

  // ─────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────
  
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const statsData = await getMetadataStats();
      setStats(statsData);
      
      const params = new URLSearchParams();
      params.set('limit', '500');
      if (hskFilter) params.set('hsk_level', hskFilter.toString());
      
      const response = await api.get<{ results: VocabWithMeta[]; total: number }>(
        `/v1/vocabulary?${params.toString()}`
      );
      
      let filtered = response.results || [];
      if (filterMode === 'missing-pos') {
        filtered = filtered.filter(v => !v.pos);
      } else if (filterMode === 'missing-tone') {
        filtered = filtered.filter(v => !v.tonePattern);
      } else if (filterMode === 'missing-secondary') {
        filtered = filtered.filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0);
      } else if (filterMode === 'missing-any') {
        filtered = filtered.filter(v => !v.pos || !v.tonePattern || !v.secondaryCategories || v.secondaryCategories.length === 0);
      }
      
      try {
        const secStats = await api.get<{ total: number; withSecondaryCategories: number; percent: number }>('/v1/vocabulary/admin/secondary-category-stats');
        setSecondaryStats({ total: secStats.total, withSecondary: secStats.withSecondaryCategories, percent: secStats.percent });
      } catch {
        // Silently ignore
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
      
      const posResult = await tagWord({ wordId: vocabId, field: 'pos' });
      const tonePattern = extractTonePattern(vocab.pinyin);
      
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
      
      setVocabulary(prev => prev.map(v => 
        v.id === vocabId 
          ? { ...v, pos: changes.pos || v.pos, tonePattern: changes.tonePattern || v.tonePattern }
          : v
      ));
      
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
    setLocalChanges(prev => {
      const next = { ...prev };
      delete next[vocabId];
      return next;
    });
  };

  const handleLocalChange = (vocabId: string, field: 'pos' | 'tonePattern', value: string) => {
    setLocalChanges(prev => ({
      ...prev,
      [vocabId]: { ...prev[vocabId], [field]: value },
    }));
  };

  const handleBatchComputeTones = async () => {
    setBatchProcessing(true);
    
    try {
      const currentPage = vocabulary.slice(page * pageSize, (page + 1) * pageSize);
      let updated = 0;
      
      for (const vocab of currentPage) {
        if (!vocab.tonePattern && vocab.pinyin) {
          const tonePattern = extractTonePattern(vocab.pinyin);
          
          await api.put(`/v1/vocabulary/admin/${vocab.id}`, { tonePattern });
          
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

  const handleBatchTagSecondaryCategories = async () => {
    setBatchSecondaryProcessing(true);
    
    try {
      const currentPage = vocabulary.slice(page * pageSize, (page + 1) * pageSize);
      const wordIds = currentPage
        .filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0)
        .map(v => v.id);
      
      if (wordIds.length === 0) {
        toast.info('Nothing to tag', 'All words on this page already have secondary categories');
        return;
      }

      const result = await api.post<{
        results: { wordId: string; hanzi: string; secondaryCategories: string[] | null; success: boolean }[];
        summary: { successful: number; failed: number };
      }>('/v1/vocabulary/admin/bulk-tag-secondary-categories', { wordIds });

      setVocabulary(prev => prev.map(v => {
        const tagResult = result.results.find(r => r.wordId === v.id);
        if (tagResult?.success && tagResult.secondaryCategories) {
          return { ...v, secondaryCategories: tagResult.secondaryCategories };
        }
        return v;
      }));

      toast.success('Batch complete', `Tagged ${result.summary.successful} words with secondary categories`);
    } catch (err) {
      toast.error('Batch failed', (err as Error).message);
    } finally {
      setBatchSecondaryProcessing(false);
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
        <MetadataStatsSection 
          stats={stats} 
          secondaryStats={secondaryStats}
          needsTaggingCount={vocabulary.length}
        />
      )}

      {/* Filters */}
      <MetadataFilters
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        hskFilter={hskFilter}
        setHskFilter={setHskFilter}
        batchProcessing={batchProcessing}
        batchSecondaryProcessing={batchSecondaryProcessing}
        onComputeTones={handleBatchComputeTones}
        onTagSecondary={handleBatchTagSecondaryCategories}
        onRefresh={loadData}
      />

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
              currentPageItems.map((vocab) => (
                <MetadataTableRow
                  key={vocab.id}
                  vocab={vocab}
                  localChanges={localChanges[vocab.id]}
                  taggingId={taggingId}
                  savingId={savingId}
                  onLocalChange={handleLocalChange}
                  onAiTag={handleAiTagSingle}
                  onSave={handleSaveSingle}
                  onSkip={handleSkip}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <MetadataPagination
        page={page}
        pageSize={pageSize}
        total={vocabulary.length}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

export default MetadataTaggingPage;
