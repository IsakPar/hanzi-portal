/**
 * useBulkOperations Hook
 * 
 * Handles bulk operations for vocabulary:
 * - Generate example sentences (AI)
 * - Auto-tag (POS, tone pattern)
 * 
 * NOTE: Audio generation has been removed in favor of manual upload from ElevenLabs portal.
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/useToast';
import { generateExampleSentence } from '@/services/vocabularyAPI';
import api from '@/services/api'; // Used for tagging API

export type BulkOperationType = 'example' | 'tags';

export interface BulkOperationResult {
  wordId: string;
  hanzi: string;
  success: boolean;
  error?: string;
  operation: BulkOperationType;
  stage?: string;
}

export interface BulkOperationProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  current?: string;
  stage?: string; // Current stage for 'complete' operation
  results: BulkOperationResult[];
}

export interface CostEstimate {
  exampleCount: number;
  tagCount: number;
  estimatedAiCost: number; // OpenAI for examples
  totalEstimatedCost: number;
}

export interface VocabItem {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  wordAudioR2Key?: string | null;
  exampleChinese?: string | null;
  exampleAudioR2Key?: string | null;
  secondaryCategories?: string[] | null;
}

interface UseBulkOperationsOptions {
  batchSize?: number;
  onComplete?: (results: BulkOperationResult[]) => void;
}

// Delay helper
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Cost estimation helpers
export function estimateCost(items: VocabItem[], type: BulkOperationType): CostEstimate {
  const needsExample = items.filter(v => !v.exampleChinese);
  const needsTags = items.filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0);
  
  let exampleCount = 0;
  let tagCount = 0;
  
  if (type === 'example') {
    exampleCount = needsExample.length;
  } else if (type === 'tags') {
    tagCount = needsTags.length;
  }
  
  // OpenAI: ~$0.002 per 1K tokens, ~200 tokens per example generation
  const estimatedAiCost = (exampleCount * 200 / 1000) * 0.002;
  
  return {
    exampleCount,
    tagCount,
    estimatedAiCost,
    totalEstimatedCost: estimatedAiCost,
  };
}

export function useBulkOperations(options: UseBulkOperationsOptions = {}) {
  const { batchSize = 5, onComplete } = options;
  
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [operationType, setOperationType] = useState<BulkOperationType>('example');
  const [itemsToProcess, setItemsToProcess] = useState<VocabItem[]>([]);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [progress, setProgress] = useState<BulkOperationProgress>({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    results: [],
  });
  
  const abortRef = useRef(false);

  // Generate example sentence for a word
  const generateExampleForWord = async (vocab: VocabItem): Promise<BulkOperationResult> => {
    try {
      // Generate example using AI (audio must be uploaded manually)
      const result = await generateExampleSentence(vocab.id);
      
      return {
        wordId: vocab.id,
        hanzi: vocab.hanzi,
        success: result.success,
        operation: 'example',
      };
    } catch (err) {
      return {
        wordId: vocab.id,
        hanzi: vocab.hanzi,
        success: false,
        error: (err as Error).message,
        operation: 'example',
      };
    }
  };

  // Auto-tag a word
  // Auto-tag a word using bulk endpoint (single word)
  const tagWord = async (vocab: VocabItem): Promise<BulkOperationResult> => {
    try {
      // Use the bulk endpoint with a single word
      const response = await api.post<{ 
        results: { wordId: string; success: boolean; error?: string; secondaryCategories?: string[] }[];
      }>('/v1/vocabulary/admin/bulk-tag-secondary-categories', {
        wordIds: [vocab.id],
      });
      
      const result = response.results?.[0];
      if (!result || !result.success) {
        throw new Error(result?.error || 'Tagging failed');
      }
      
      return {
        wordId: vocab.id,
        hanzi: vocab.hanzi,
        success: true,
        operation: 'tags',
      };
    } catch (err) {
      return {
        wordId: vocab.id,
        hanzi: vocab.hanzi,
        success: false,
        error: (err as Error).message,
        operation: 'tags',
      };
    }
  };

  // Process a batch of items
  const processBatch = async (
    items: VocabItem[],
    type: BulkOperationType
  ): Promise<BulkOperationResult[]> => {
    const results: BulkOperationResult[] = [];
    
    for (const item of items) {
      if (abortRef.current) break;
      
      setProgress(prev => ({ ...prev, current: item.hanzi }));
      
      let result: BulkOperationResult;
      
      switch (type) {
        case 'example':
          result = await generateExampleForWord(item);
          break;
        case 'tags':
          result = await tagWord(item);
          break;
      }
      
      results.push(result);
      
      setProgress(prev => ({
        ...prev,
        completed: prev.completed + 1,
        successful: prev.successful + (result.success ? 1 : 0),
        failed: prev.failed + (result.success ? 0 : 1),
        results: [...prev.results, result],
      }));
      
      // 500ms delay to prevent rate limiting
      await delay(500);
    }
    
    return results;
  };

  // Request bulk operation - shows confirmation first
  const requestBulkOperation = useCallback((
    items: VocabItem[],
    type: BulkOperationType
  ) => {
    if (items.length === 0) {
      toast.info('Nothing to process', 'No items match the criteria');
      return;
    }
    
    // Calculate cost estimate
    const estimate = estimateCost(items, type);
    setCostEstimate(estimate);
    setItemsToProcess(items);
    setOperationType(type);
    setShowConfirmation(true);
  }, []);

  // Actually run the operation after confirmation
  const confirmAndRun = useCallback(() => {
    const items = itemsToProcess;
    const type = operationType;
    
    setShowConfirmation(false);
    abortRef.current = false;
    
    // Calculate total steps based on operation type
    const totalSteps = items.length;
    
    setProgress({
      total: totalSteps,
      completed: 0,
      successful: 0,
      failed: 0,
      results: [],
    });
    setShowModal(true);
    setIsRunning(true);
    
    // Process in background
    (async () => {
      const allResults: BulkOperationResult[] = [];
      
      // Simple processing for operation types
      for (let i = 0; i < items.length; i += batchSize) {
        if (abortRef.current) break;
        
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processBatch(batch, type);
        allResults.push(...batchResults);
      }
      
      setIsRunning(false);
      setProgress(prev => ({ ...prev, stage: 'Complete!' }));
      
      const successCount = allResults.filter(r => r.success).length;
      toast.success(
        'Bulk operation complete',
        `Processed ${successCount}/${allResults.length} operations successfully`
      );
      
      onComplete?.(allResults);
    })();
  }, [itemsToProcess, operationType, batchSize, onComplete]);

  // Cancel confirmation
  const cancelConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setItemsToProcess([]);
    setCostEstimate(null);
  }, []);

  // Abort operation
  const abort = useCallback(() => {
    abortRef.current = true;
    toast.info('Stopping...', 'Current item will complete');
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    if (isRunning) {
      abort();
    }
    setShowModal(false);
  }, [isRunning, abort]);

  // Retry failed items
  const retryFailed = useCallback(() => {
    const failedItems = progress.results.filter(r => !r.success);
    if (failedItems.length === 0) {
      toast.info('Nothing to retry', 'No failed items');
      return;
    }
    
    // Get the vocab items that failed
    const failedVocab = itemsToProcess.filter(v => 
      failedItems.some(f => f.wordId === v.id)
    );
    
    if (failedVocab.length === 0) {
      toast.error('Cannot retry', 'Failed items not found in original list');
      return;
    }
    
    // Reset progress and restart
    setProgress({
      total: failedVocab.length,
      completed: 0,
      successful: 0,
      failed: 0,
      results: [],
    });
    setItemsToProcess(failedVocab);
    
    // Trigger confirmation again
    const estimate = estimateCost(failedVocab, operationType);
    setCostEstimate(estimate);
    setShowConfirmation(true);
    setShowModal(false);
  }, [progress.results, itemsToProcess, operationType]);

  return {
    isRunning,
    showModal,
    showConfirmation,
    operationType,
    progress,
    costEstimate,
    itemsToProcess,
    startBulkOperation: requestBulkOperation,
    confirmAndRun,
    cancelConfirmation,
    abort,
    closeModal,
    retryFailed,
  };
}

