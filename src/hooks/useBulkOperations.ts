/**
 * useBulkOperations Hook
 * 
 * Handles bulk operations for vocabulary:
 * - Generate audio (Azure TTS)
 * - Generate example sentences (AI)
 * - Auto-tag (POS, tone pattern)
 * - Complete all (audio + example + tags)
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
}

export interface BulkOperationProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  current?: string;
  results: BulkOperationResult[];
}

interface VocabItem {
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

export function useBulkOperations(options: UseBulkOperationsOptions = {}) {
  const { batchSize = 5, voice = 'xiaoxiao', onComplete } = options;
  
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [operationType, setOperationType] = useState<BulkOperationType>('audio');
  const [progress, setProgress] = useState<BulkOperationProgress>({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    results: [],
  });
  
  const abortRef = useRef(false);

  // Generate audio for a single word
  const generateAudioForWord = async (vocab: VocabItem): Promise<BulkOperationResult> => {
    try {
      // Generate audio using Azure TTS
      const result = await synthesize(vocab.hanzi, voice, vocab.pinyin);
      
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
      
      // Also generate audio for the example if we got one
      if (result.success && result.sentence?.chinese) {
        try {
          const audioResult = await synthesize(result.sentence.chinese, voice);
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
  const tagWord = async (vocab: VocabItem): Promise<BulkOperationResult> => {
    try {
      await api.post(`/v1/vocabulary/${vocab.id}/auto-tag`, {});
      
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
      
      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  };

  // Start bulk operation
  const startBulkOperation = useCallback((
    items: VocabItem[],
    type: BulkOperationType
  ) => {
    if (items.length === 0) {
      toast.info('Nothing to process', 'No items match the criteria');
      return;
    }
    
    abortRef.current = false;
    setOperationType(type);
    setProgress({
      total: items.length,
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
      
      // Process in batches
      for (let i = 0; i < items.length; i += batchSize) {
        if (abortRef.current) break;
        
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processBatch(batch, type);
        allResults.push(...batchResults);
      }
      
      setIsRunning(false);
      
      const successCount = allResults.filter(r => r.success).length;
      const typeLabel = type === 'audio' ? 'audio' : 
                        type === 'example' ? 'example sentences' :
                        type === 'tags' ? 'tags' : 'items';
      
      toast.success(
        'Bulk operation complete',
        `Generated ${typeLabel} for ${successCount}/${allResults.length} words`
      );
      
      onComplete?.(allResults);
    })();
  }, [batchSize, onComplete]);

  // Abort operation
  const abort = useCallback(() => {
    abortRef.current = true;
    toast.info('Stopping...', 'Current batch will complete');
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    if (isRunning) {
      abort();
    }
    setShowModal(false);
  }, [isRunning, abort]);

  return {
    isRunning,
    showModal,
    operationType,
    progress,
    startBulkOperation,
    abort,
    closeModal,
  };
}

