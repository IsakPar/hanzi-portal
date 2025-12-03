import { useState, useCallback } from 'react';
import api from '@/services/api';
import { toast } from '@/hooks/useToast';

interface TagResult {
  wordId: string;
  hanzi: string;
  categories: string[] | null;
  success: boolean;
}

interface UseBulkTaggingOptions {
  maxBatch?: number;
  onComplete?: (results: TagResult[]) => void;
}

export function useBulkTagging(options: UseBulkTaggingOptions = {}) {
  const { maxBatch = 100, onComplete } = options;
  
  const [isTagging, setIsTagging] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [wordIdsToTag, setWordIdsToTag] = useState<string[]>([]);

  const startBulkTag = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      toast.info("Nothing to tag", "All visible words already have secondary categories");
      return;
    }

    // Limit to maxBatch
    const limitedIds = ids.slice(0, maxBatch);
    setWordIdsToTag(limitedIds);
    setShowProgressModal(true);
    setIsTagging(true);
  }, [maxBatch]);

  const tagBatch = useCallback(async (ids: string[]): Promise<TagResult[]> => {
    const result = await api.post<{
      results: { wordId: string; hanzi: string; secondaryCategories: string[] | null; success: boolean }[];
      summary: { successful: number; failed: number };
    }>('/v1/vocabulary/admin/bulk-tag-secondary-categories', { wordIds: ids });

    return result.results.map(r => ({
      wordId: r.wordId,
      hanzi: r.hanzi,
      categories: r.secondaryCategories,
      success: r.success,
    }));
  }, []);

  const handleComplete = useCallback((results: TagResult[]) => {
    setIsTagging(false);
    setShowProgressModal(false);
    
    const successCount = results.filter(r => r.success).length;
    toast.success("Bulk tagging complete", `Tagged ${successCount} words with secondary categories`);
    
    onComplete?.(results);
  }, [onComplete]);

  const closeModal = useCallback(() => {
    setShowProgressModal(false);
    setIsTagging(false);
  }, []);

  return {
    isTagging,
    showProgressModal,
    wordIdsToTag,
    startBulkTag,
    tagBatch,
    handleComplete,
    closeModal,
  };
}

