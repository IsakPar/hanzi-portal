/**
 * PracticeGenerator
 * AI-powered practice block generation for stories (OpenRouter)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { logger } from '@/utils/logger';
import {
  generatePractice,
  formatCostDisplay,
  OPENROUTER_MODELS,
  type GeneratableBlockType,
  type AIModel,
  type UsageInfo,
} from '@/services/practiceGeneratorAPI';
import type { ContentBlock } from '@/types/lesson';

interface PracticeGeneratorProps {
  storyId: string;
  onBlocksGenerated: (blocks: ContentBlock[]) => void;
  disabled?: boolean;
}

const BLOCK_OPTIONS: { type: GeneratableBlockType; label: string; emoji: string }[] = [
  { type: 'exercise_multiple_choice', label: 'Multiple Choice', emoji: '🔘' },
  { type: 'reading_comprehension', label: 'Quiz', emoji: '📝' },
  { type: 'exercise_build_sentence', label: 'Build Sentence', emoji: '🧱' },
  { type: 'exercise_drag_sentence', label: 'Drag Sentence', emoji: '↔️' },
  { type: 'exercise_spot_error', label: 'Spot Error', emoji: '🔍' },
];

export function PracticeGenerator({
  storyId,
  onBlocksGenerated,
  disabled = false,
}: PracticeGeneratorProps) {
  const [selectedTypes, setSelectedTypes] = useState<GeneratableBlockType[]>([
    'exercise_multiple_choice',
    'reading_comprehension',
  ]);
  const [model] = useState<AIModel>(OPENROUTER_MODELS.QWEN_CODER_32B);
  const [count, setCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<ContentBlock[]>([]);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  const toggleType = (type: GeneratableBlockType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Select block types', 'Choose at least one block type to generate');
      return;
    }

    setIsGenerating(true);
    setGeneratedBlocks([]);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());

    try {
      const result = await generatePractice(storyId, {
        blockTypes: selectedTypes,
        model,
        count,
      });

      if (result.success && result.blocks.length > 0) {
        setGeneratedBlocks(result.blocks);
        setLastUsage(result.usage);
        toast.success(
          `Generated ${result.blocks.length} blocks`,
          formatCostDisplay(result.usage)
        );
      } else {
        toast.error('Generation failed', 'No blocks were generated. Try again.');
      }
    } catch (error) {
      logger.error('Practice generation failed:', error);
      toast.error('Generation failed', 'Could not generate practice blocks');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = (blockId: string) => {
    setAcceptedIds(prev => new Set([...prev, blockId]));
    setRejectedIds(prev => {
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });
  };

  const handleReject = (blockId: string) => {
    setRejectedIds(prev => new Set([...prev, blockId]));
    setAcceptedIds(prev => {
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });
  };

  const handleAcceptAll = () => {
    const accepted = generatedBlocks
      .filter(b => !rejectedIds.has(b.id))
      .map(b => b.id);
    setAcceptedIds(new Set(accepted));
    
    const blocksToAdd = generatedBlocks.filter(b => accepted.includes(b.id));
    onBlocksGenerated(blocksToAdd);
    
    toast.success(`Added ${blocksToAdd.length} blocks`);
    setGeneratedBlocks([]);
    setLastUsage(null);
  };

  const handleAcceptSelected = () => {
    const blocksToAdd = generatedBlocks.filter(b => acceptedIds.has(b.id));
    if (blocksToAdd.length === 0) {
      toast.error('No blocks selected', 'Accept at least one block first');
      return;
    }
    onBlocksGenerated(blocksToAdd);
    toast.success(`Added ${blocksToAdd.length} blocks`);
    setGeneratedBlocks([]);
    setLastUsage(null);
  };

  const handleDiscard = () => {
    setGeneratedBlocks([]);
    setLastUsage(null);
    setAcceptedIds(new Set());
    setRejectedIds(new Set());
  };

  const getBlockPreview = (block: ContentBlock): string => {
    const content = block.content as Record<string, unknown>;
    if (content.question) return String(content.question);
    if (content.instruction) return String(content.instruction);
    return block.type;
  };

  if (disabled || storyId === 'new') {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-lg text-gray-800">AI Practice Generator</h3>
        <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded">OpenRouter</span>
      </div>

      {/* Block Type Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Block types to generate:
        </label>
        <div className="flex flex-wrap gap-2">
          {BLOCK_OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => toggleType(opt.type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedTypes.includes(opt.type)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-indigo-300'
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center gap-4 mb-4">
        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Model:</label>
          <div className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700">
            ⚡ Qwen Coder 32B
          </div>
        </div>

        {/* Count Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Blocks:</label>
          <select
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {[2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedTypes.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* Generated Blocks Preview */}
      {generatedBlocks.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Generated {generatedBlocks.length} blocks
            </span>
            {lastUsage && (
              <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                {formatCostDisplay(lastUsage)}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {generatedBlocks.map((block) => {
              const isAccepted = acceptedIds.has(block.id);
              const isRejected = rejectedIds.has(block.id);
              
              return (
                <div
                  key={block.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isAccepted
                      ? 'bg-green-50 border-green-300'
                      : isRejected
                      ? 'bg-red-50 border-red-300 opacity-50'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-indigo-600 uppercase">
                        {block.type.replace('exercise_', '').replace('_', ' ')}
                      </span>
                      <p className="text-sm text-gray-700 truncate">
                        {getBlockPreview(block)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAccept(block.id)}
                        className={`p-1.5 rounded ${
                          isAccepted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                        }`}
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(block.id)}
                        className={`p-1.5 rounded ${
                          isRejected
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                        }`}
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleAcceptAll}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Accept All ({generatedBlocks.length - rejectedIds.size})
            </Button>
            {acceptedIds.size > 0 && (
              <Button
                onClick={handleAcceptSelected}
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700"
              >
                Accept Selected ({acceptedIds.size})
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
            <Button
              onClick={handleDiscard}
              size="sm"
              variant="outline"
              className="text-red-600"
            >
              Discard All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
