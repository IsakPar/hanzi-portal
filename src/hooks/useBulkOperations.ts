/**
 * useBulkOperations Hook
 * 
 * Handles bulk operations for vocabulary:
 * - Generate audio (Azure TTS)
 * - Generate example sentences (AI)
 * - Auto-tag (POS, tone pattern)
 * - Complete all (staged: examples → audio → tags)
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/useToast';
import { synthesize } from '@/services/azureTtsAPI';
import { saveWordAudio, saveExampleAudio, generateExampleSentence } from '@/services/vocabularyAPI';
import api from '@/services/api';

export type BulkOperationType = 'audio' | 'example' | 'tags' | 'complete';

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
  audioCount: number;
  exampleCount: number;
  tagCount: number;
  estimatedAudioCost: number; // Azure TTS: ~$16 per 1M chars
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
  voice?: string;
  onComplete?: (results: BulkOperationResult[]) => void;
}

// Retry with exponential backoff for rate limiting
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const isRateLimit = lastError.message.toLowerCase().includes('rate') ||
                          lastError.message.includes('429') ||
                          lastError.message.toLowerCase().includes('too many');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw lastError;
      }
    }
  }
  throw lastError;
}

// Delay helper
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Cost estimation helpers
export function estimateCost(items: VocabItem[], type: BulkOperationType): CostEstimate {
  const needsAudio = items.filter(v => !v.wordAudioR2Key);
  const needsExample = items.filter(v => !v.exampleChinese);
  const needsTags = items.filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0);
  
  let audioCount = 0;
  let exampleCount = 0;
  let tagCount = 0;
  
  if (type === 'audio') {
    audioCount = needsAudio.length;
  } else if (type === 'example') {
    exampleCount = needsExample.length;
    audioCount = needsExample.length; // Example audio too
  } else if (type === 'tags') {
    tagCount = needsTags.length;
  } else if (type === 'complete') {
    audioCount = needsAudio.length + needsExample.length; // Word audio + example audio
    exampleCount = needsExample.length;
    tagCount = needsTags.length;
  }
  
  // Azure TTS: ~$16 per 1M characters, avg 3 chars per word + 15 chars per example
  const avgCharsPerWord = 3;
  const avgCharsPerExample = 15;
  const totalChars = (audioCount * avgCharsPerWord) + (exampleCount * avgCharsPerExample);
  const estimatedAudioCost = (totalChars / 1_000_000) * 16;
  
  // OpenAI: ~$0.002 per 1K tokens, ~200 tokens per example generation
  const estimatedAiCost = (exampleCount * 200 / 1000) * 0.002;
  
  return {
    audioCount,
    exampleCount,
    tagCount,
    estimatedAudioCost,
    estimatedAiCost,
    totalEstimatedCost: estimatedAudioCost + estimatedAiCost,
  };
}

export function useBulkOperations(options: UseBulkOperationsOptions = {}) {
  const { batchSize = 5, voice = 'xiaoxiao', onComplete } = options;
  
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [operationType, setOperationType] = useState<BulkOperationType>('audio');
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

  // Generate audio for a single word (with retry for rate limiting)
  const generateAudioForWord = async (vocab: VocabItem): Promise<BulkOperationResult> => {
    try {
      // Generate audio using Azure TTS with retry
      const result = await withRetry(
        () => synthesize(vocab.hanzi, voice, vocab.pinyin),
        3,
        2000
      );
      
      // Save to R2
      await saveWordAudio(vocab.id, result.audioBase64);
      
      return {
        wordId: vocab.id,
        hanzi: vocab.hanzi,
        success: true,
        operation: 'audio',
      };
    } catch (err) {
      return {
        wordId: vocab.id,
        hanzi: vocab.hanzi,
        success: false,
        error: (err as Error).message,
        operation: 'audio',
      };
    }
  };

  // Generate example sentence for a word
  const generateExampleForWord = async (vocab: VocabItem): Promise<BulkOperationResult> => {
    try {
      // Generate example using AI
      const result = await generateExampleSentence(vocab.id);
      
      // Also generate audio for the example if we got one (with retry)
      if (result.success && result.sentence?.chinese) {
        try {
          const audioResult = await withRetry(
            () => synthesize(result.sentence!.chinese, voice),
            3,
            2000
          );
          await saveExampleAudio(vocab.id, audioResult.audioBase64);
        } catch (audioErr) {
          console.warn('Failed to generate example audio:', audioErr);
          // Continue - example sentence was saved, audio failed
        }
      }
      
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

  // Complete all operations for a word
  const completeWord = async (vocab: VocabItem): Promise<BulkOperationResult> => {
    const errors: string[] = [];
    
    // Generate audio if missing
    if (!vocab.wordAudioR2Key) {
      const audioResult = await generateAudioForWord(vocab);
      if (!audioResult.success) errors.push(`Audio: ${audioResult.error}`);
    }
    
    // Generate example if missing
    if (!vocab.exampleChinese) {
      const exampleResult = await generateExampleForWord(vocab);
      if (!exampleResult.success) errors.push(`Example: ${exampleResult.error}`);
    }
    
    // Auto-tag if missing secondary categories
    if (!vocab.secondaryCategories || vocab.secondaryCategories.length === 0) {
      const tagResult = await tagWord(vocab);
      if (!tagResult.success) errors.push(`Tags: ${tagResult.error}`);
    }
    
    return {
      wordId: vocab.id,
      hanzi: vocab.hanzi,
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      operation: 'complete',
    };
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
        case 'audio':
          result = await generateAudioForWord(item);
          break;
        case 'example':
          result = await generateExampleForWord(item);
          break;
        case 'tags':
          result = await tagWord(item);
          break;
        case 'complete':
          result = await completeWord(item);
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
    let totalSteps = items.length;
    if (type === 'complete') {
      // For complete: examples (AI) + word audio + example audio + tags
      const needsExample = items.filter(v => !v.exampleChinese).length;
      const needsAudio = items.filter(v => !v.wordAudioR2Key).length;
      const needsTags = items.filter(v => !v.secondaryCategories?.length).length;
      totalSteps = needsExample + needsAudio + needsExample + needsTags; // example text + word audio + example audio + tags
    }
    
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
      
      if (type === 'complete') {
        // STAGED PROCESSING for 'complete':
        // Stage 1: Generate example sentences (AI) - just text, no audio yet
        const needsExample = items.filter(v => !v.exampleChinese);
        if (needsExample.length > 0) {
          setProgress(prev => ({ ...prev, stage: 'Generating example sentences...' }));
          for (let i = 0; i < needsExample.length; i += batchSize) {
            if (abortRef.current) break;
            const batch = needsExample.slice(i, i + batchSize);
            for (const item of batch) {
              if (abortRef.current) break;
              setProgress(prev => ({ ...prev, current: `${item.hanzi} (example)` }));
              try {
                await generateExampleSentence(item.id);
                allResults.push({ wordId: item.id, hanzi: item.hanzi, success: true, operation: 'complete', stage: 'example' });
                setProgress(prev => ({ ...prev, completed: prev.completed + 1, successful: prev.successful + 1 }));
              } catch (err) {
                allResults.push({ wordId: item.id, hanzi: item.hanzi, success: false, error: (err as Error).message, operation: 'complete', stage: 'example' });
                setProgress(prev => ({ ...prev, completed: prev.completed + 1, failed: prev.failed + 1 }));
              }
              await delay(500); // 500ms between requests to avoid rate limiting
            }
          }
        }
        
        // Stage 2: Generate word audio
        const needsAudio = items.filter(v => !v.wordAudioR2Key);
        if (needsAudio.length > 0 && !abortRef.current) {
          setProgress(prev => ({ ...prev, stage: 'Generating word audio...' }));
          for (let i = 0; i < needsAudio.length; i += batchSize) {
            if (abortRef.current) break;
            const batch = needsAudio.slice(i, i + batchSize);
            for (const item of batch) {
              if (abortRef.current) break;
              setProgress(prev => ({ ...prev, current: `${item.hanzi} (word audio)` }));
              const result = await generateAudioForWord(item);
              allResults.push({ ...result, stage: 'word_audio' });
              setProgress(prev => ({
                ...prev,
                completed: prev.completed + 1,
                successful: prev.successful + (result.success ? 1 : 0),
                failed: prev.failed + (result.success ? 0 : 1),
              }));
              await delay(500); // 500ms between requests to avoid rate limiting
            }
          }
        }
        
        // Stage 3: Generate example audio (for items that now have examples)
        // Need to refetch to get updated exampleChinese
        if (!abortRef.current) {
          setProgress(prev => ({ ...prev, stage: 'Generating example audio...' }));
          for (let i = 0; i < needsExample.length; i += batchSize) {
            if (abortRef.current) break;
            const batch = needsExample.slice(i, i + batchSize);
            for (const item of batch) {
              if (abortRef.current) break;
              setProgress(prev => ({ ...prev, current: `${item.hanzi} (example audio)` }));
              try {
                // Fetch the updated vocab to get the example sentence
                const updated = await api.get<{ exampleChinese?: string }>(`/v1/vocabulary/${item.id}`);
                if (updated.exampleChinese) {
                  const audioResult = await withRetry(
                    () => synthesize(updated.exampleChinese!, voice),
                    3,
                    2000
                  );
                  await saveExampleAudio(item.id, audioResult.audioBase64);
                  allResults.push({ wordId: item.id, hanzi: item.hanzi, success: true, operation: 'complete', stage: 'example_audio' });
                  setProgress(prev => ({ ...prev, completed: prev.completed + 1, successful: prev.successful + 1 }));
                }
              } catch (err) {
                allResults.push({ wordId: item.id, hanzi: item.hanzi, success: false, error: (err as Error).message, operation: 'complete', stage: 'example_audio' });
                setProgress(prev => ({ ...prev, completed: prev.completed + 1, failed: prev.failed + 1 }));
              }
              await delay(500); // 500ms between requests to avoid rate limiting
            }
          }
        }
        
        // Stage 4: Auto-tag
        const needsTags = items.filter(v => !v.secondaryCategories?.length);
        if (needsTags.length > 0 && !abortRef.current) {
          setProgress(prev => ({ ...prev, stage: 'Auto-tagging...' }));
          for (let i = 0; i < needsTags.length; i += batchSize) {
            if (abortRef.current) break;
            const batch = needsTags.slice(i, i + batchSize);
            for (const item of batch) {
              if (abortRef.current) break;
              setProgress(prev => ({ ...prev, current: `${item.hanzi} (tags)` }));
              const result = await tagWord(item);
              allResults.push({ ...result, stage: 'tags' });
              setProgress(prev => ({
                ...prev,
                completed: prev.completed + 1,
                successful: prev.successful + (result.success ? 1 : 0),
                failed: prev.failed + (result.success ? 0 : 1),
              }));
              await delay(500); // 500ms between requests to avoid rate limiting
            }
          }
        }
      } else {
        // Simple processing for single operation types
        for (let i = 0; i < items.length; i += batchSize) {
          if (abortRef.current) break;
          
          const batch = items.slice(i, i + batchSize);
          const batchResults = await processBatch(batch, type);
          allResults.push(...batchResults);
        }
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
  }, [itemsToProcess, operationType, batchSize, onComplete, voice]);

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

