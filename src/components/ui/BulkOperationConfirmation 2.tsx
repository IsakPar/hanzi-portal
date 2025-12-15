/**
 * BulkOperationConfirmation
 * 
 * Shows cost estimate and confirmation before starting bulk operations
 */

import { Volume2, MessageSquare, Tag, Zap, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BulkOperationType, CostEstimate, VocabItem } from '@/hooks/useBulkOperations';

interface BulkOperationConfirmationProps {
  isOpen: boolean;
  operationType: BulkOperationType;
  items: VocabItem[];
  costEstimate: CostEstimate | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const operationInfo: Record<BulkOperationType, { 
  title: string; 
  description: string;
  icon: React.ReactNode;
  color: string;
}> = {
  audio: { 
    title: 'Generate Audio', 
    description: 'Azure TTS at 1.0x speed for word pronunciation',
    icon: <Volume2 className="w-6 h-6" />,
    color: 'purple',
  },
  example: { 
    title: 'Generate Examples', 
    description: 'AI-powered example sentences with audio',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'blue',
  },
  tags: { 
    title: 'Auto-Tag', 
    description: 'POS, tone patterns, and categories',
    icon: <Tag className="w-6 h-6" />,
    color: 'pink',
  },
  complete: { 
    title: 'Complete All', 
    description: 'Staged processing: Examples → Word Audio → Example Audio → Tags',
    icon: <Zap className="w-6 h-6" />,
    color: 'emerald',
  },
};

export function BulkOperationConfirmation({
  isOpen,
  operationType,
  items,
  costEstimate,
  onConfirm,
  onCancel,
}: BulkOperationConfirmationProps) {
  if (!isOpen || !costEstimate) return null;

  const info = operationInfo[operationType];

  const formatCost = (cost: number) => {
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r from-${info.color}-600 to-${info.color}-500 px-6 py-5`}>
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-xl">
              {info.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold">{info.title}</h2>
              <p className="text-white/80 text-sm">{info.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Items count */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{items.length}</div>
            <div className="text-gray-500">vocabulary items to process</div>
          </div>

          {/* What will happen */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-3">What will be generated:</div>
            
            {costEstimate.exampleCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Example sentences
                </span>
                <span className="font-medium">{costEstimate.exampleCount}</span>
              </div>
            )}
            
            {costEstimate.audioCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <Volume2 className="w-4 h-4 text-purple-500" />
                  Audio files
                </span>
                <span className="font-medium">{costEstimate.audioCount}</span>
              </div>
            )}
            
            {costEstimate.tagCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <Tag className="w-4 h-4 text-pink-500" />
                  Auto-tags
                </span>
                <span className="font-medium">{costEstimate.tagCount}</span>
              </div>
            )}
          </div>

          {/* Cost estimate */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-700 font-medium">
                <DollarSign className="w-5 h-5" />
                Estimated Cost
              </span>
              <span className="text-2xl font-bold text-emerald-600">
                {formatCost(costEstimate.totalEstimatedCost)}
              </span>
            </div>
            <div className="text-xs text-emerald-600 mt-2">
              Azure TTS: {formatCost(costEstimate.estimatedAudioCost)} • 
              AI (examples): {formatCost(costEstimate.estimatedAiCost)}
            </div>
          </div>

          {operationType === 'complete' && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <strong>Processing order:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-0.5">
                <li>Generate example sentences (AI)</li>
                <li>Generate word audio (TTS)</li>
                <li>Generate example audio (TTS)</li>
                <li>Auto-tag (AI)</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className={`bg-${info.color}-600 hover:bg-${info.color}-700`}
          >
            Start Processing
          </Button>
        </div>
      </div>
    </div>
  );
}

