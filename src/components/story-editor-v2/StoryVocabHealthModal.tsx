/**
 * StoryVocabHealthModal
 * 
 * Scans all words in a story's sentences and shows vocabulary health status.
 * Allows quick-fixing: add to vocab, generate audio, AI tag, etc.
 * 
 * Based on LessonVocabHealthModal but adapted for story sentences.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Volume2, Tag, FileText, Plus, AlertTriangle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { extractAndSegmentStoryWords } from '@/utils/storyWordExtractor';
import { checkVocabularyHealth, type WordHealth, type HealthCheckResponse } from '@/services/vocabularyAPI';
import type { StoryWithDetails } from '@/services/storiesAPI';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { VocabularyEditorSlideOver } from '@/components/lesson-editor/VocabularyEditorSlideOver';

interface StoryVocabHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: StoryWithDetails;
}

type IssueType = 'missing' | 'noAudio' | 'noCategory' | 'noExample' | 'noTags';

interface GroupedIssues {
  missing: WordHealth[];
  noAudio: WordHealth[];
  noCategory: WordHealth[];
  noExample: WordHealth[];
  noTags: WordHealth[];
  complete: WordHealth[];
}

export function StoryVocabHealthModal({
  isOpen,
  onClose,
  story,
}: StoryVocabHealthModalProps) {
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<IssueType | 'complete' | null>('missing');
  
  // Vocabulary editor slide-over state
  const [editingWord, setEditingWord] = useState<{ id?: string; hanzi: string } | null>(null);

  // Extract, segment, and check words from story
  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use vocab-validator to properly segment sentences into words
      const { segmentedWords } = await extractAndSegmentStoryWords(story);
      
      if (segmentedWords.length === 0) {
        setHealthData({
          results: [],
          summary: {
            total: 0,
            existing: 0,
            missing: 0,
            missingAudio: 0,
            missingCategory: 0,
            missingExample: 0,
            missingTags: 0,
            missingSecondaryCategories: 0,
          },
          totalIssues: 0,
        });
        return;
      }

      // Check segmented words against vocab database
      const response = await checkVocabularyHealth(segmentedWords);
      setHealthData(response);
    } catch (err) {
      console.error('Health check failed:', err);
      setError('Failed to check vocabulary health. Make sure the validator service is running.');
    } finally {
      setLoading(false);
    }
  }, [story]);

  // Run check when modal opens
  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen, checkHealth]);

  // Group issues by type
  const groupedIssues: GroupedIssues = {
    missing: [],
    noAudio: [],
    noCategory: [],
    noExample: [],
    noTags: [],
    complete: [],
  };

  if (healthData) {
    for (const word of healthData.results) {
      if (!word.exists) {
        groupedIssues.missing.push(word);
      } else {
        let hasIssue = false;
        if (!word.hasAudio) {
          groupedIssues.noAudio.push(word);
          hasIssue = true;
        }
        if (!word.hasCategory) {
          groupedIssues.noCategory.push(word);
          hasIssue = true;
        }
        if (!word.hasExample) {
          groupedIssues.noExample.push(word);
          hasIssue = true;
        }
        if (!word.hasTags) {
          groupedIssues.noTags.push(word);
          hasIssue = true;
        }
        if (!hasIssue) {
          groupedIssues.complete.push(word);
        }
      }
    }
  }

  // Handle fix actions - open vocabulary editor slide-over
  const handleAddToVocab = (word: WordHealth) => {
    setEditingWord({ hanzi: word.hanzi });
  };

  const handleEditVocab = (word: WordHealth) => {
    if (word.id) {
      setEditingWord({ id: word.id, hanzi: word.hanzi });
    }
  };

  // Called when vocab editor saves successfully
  const handleVocabSaved = () => {
    setEditingWord(null);
    // Refresh health data
    checkHealth();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Story Vocabulary Health</h2>
            <p className="text-sm text-gray-500">
              {healthData?.summary.total || 0} unique words found in "{story.title}"
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={checkHealth}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-500">Scanning story words...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={checkHealth}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Try Again
              </button>
            </div>
          ) : healthData?.summary.total === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No Chinese words found in this story</p>
            </div>
          ) : (
            <>
              {/* Summary Bar */}
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg">
                <SummaryItem
                  label="Not in Vocab"
                  count={groupedIssues.missing.length}
                  color="red"
                  icon={<Plus size={14} />}
                />
                <SummaryItem
                  label="No Audio"
                  count={groupedIssues.noAudio.length}
                  color="orange"
                  icon={<Volume2 size={14} />}
                />
                <SummaryItem
                  label="No Category"
                  count={groupedIssues.noCategory.length}
                  color="yellow"
                  icon={<Tag size={14} />}
                />
                <SummaryItem
                  label="No Example"
                  count={groupedIssues.noExample.length}
                  color="blue"
                  icon={<FileText size={14} />}
                />
                <SummaryItem
                  label="Complete"
                  count={groupedIssues.complete.length}
                  color="green"
                  icon={<CheckCircle size={14} />}
                />
              </div>

              {/* Issue Sections */}
              <IssueSection
                title="Not in Vocabulary"
                subtitle="These words need to be added to the vocabulary database"
                icon={<Plus size={16} />}
                color="red"
                words={groupedIssues.missing}
                isExpanded={expandedSection === 'missing'}
                onToggle={() => setExpandedSection(expandedSection === 'missing' ? null : 'missing')}
                actionLabel="Add"
                onAction={handleAddToVocab}
                bulkActionLabel="Add All"
                onBulkAction={() => toast.info('Coming soon', 'Bulk add will be available soon')}
              />

              <IssueSection
                title="Missing Audio"
                subtitle="Generate audio using ElevenLabs"
                icon={<Volume2 size={16} />}
                color="orange"
                words={groupedIssues.noAudio}
                isExpanded={expandedSection === 'noAudio'}
                onToggle={() => setExpandedSection(expandedSection === 'noAudio' ? null : 'noAudio')}
                actionLabel="Edit"
                onAction={handleEditVocab}
                bulkActionLabel="Edit All"
                onBulkAction={() => toast.info('Coming soon', 'Bulk editing will be available soon')}
              />

              <IssueSection
                title="Missing Category"
                subtitle="Assign categories for better organization"
                icon={<Tag size={16} />}
                color="yellow"
                words={groupedIssues.noCategory}
                isExpanded={expandedSection === 'noCategory'}
                onToggle={() => setExpandedSection(expandedSection === 'noCategory' ? null : 'noCategory')}
                actionLabel="Edit"
                onAction={handleEditVocab}
                bulkActionLabel="AI Tag All"
                onBulkAction={() => toast.info('Coming soon', 'AI tagging will be available soon')}
              />

              <IssueSection
                title="Missing Example Sentence"
                subtitle="Add example sentences for context"
                icon={<FileText size={16} />}
                color="blue"
                words={groupedIssues.noExample}
                isExpanded={expandedSection === 'noExample'}
                onToggle={() => setExpandedSection(expandedSection === 'noExample' ? null : 'noExample')}
                actionLabel="Edit"
                onAction={handleEditVocab}
                bulkActionLabel="AI Generate All"
                onBulkAction={() => toast.info('Coming soon', 'Bulk generation will be available soon')}
              />

              <IssueSection
                title="Missing Tags (POS/Tone)"
                subtitle="Add part of speech and tone pattern"
                icon={<Sparkles size={16} />}
                color="purple"
                words={groupedIssues.noTags}
                isExpanded={expandedSection === 'noTags'}
                onToggle={() => setExpandedSection(expandedSection === 'noTags' ? null : 'noTags')}
                actionLabel="Edit"
                onAction={handleEditVocab}
                bulkActionLabel="AI Tag All"
                onBulkAction={() => toast.info('Coming soon', 'AI tagging will be available soon')}
              />

              <IssueSection
                title="Complete"
                subtitle="These words have all required data"
                icon={<CheckCircle size={16} />}
                color="green"
                words={groupedIssues.complete}
                isExpanded={expandedSection === 'complete'}
                onToggle={() => setExpandedSection(expandedSection === 'complete' ? null : 'complete')}
                actionLabel="View"
                onAction={handleEditVocab}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {healthData && healthData.totalIssues > 0 && (
          <div className="border-t px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {healthData.totalIssues} issue{healthData.totalIssues !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={() => toast.info('Coming soon', 'Fix All will be available soon')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Sparkles size={16} />
                Fix All Issues
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vocabulary Editor Slide-Over */}
      <VocabularyEditorSlideOver
        isOpen={!!editingWord}
        onClose={() => setEditingWord(null)}
        wordId={editingWord?.id}
        initialHanzi={editingWord?.hanzi || ''}
        onSaved={handleVocabSaved}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

interface SummaryItemProps {
  label: string;
  count: number;
  color: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'purple';
  icon: React.ReactNode;
}

function SummaryItem({ label, count, color, icon }: SummaryItemProps) {
  const colorClasses = {
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <div className={cn('flex flex-col items-center p-2 rounded-lg', colorClasses[color])}>
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-lg font-bold">{count}</span>
      </div>
      <span className="text-xs">{label}</span>
    </div>
  );
}

interface IssueSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'purple';
  words: WordHealth[];
  isExpanded: boolean;
  onToggle: () => void;
  actionLabel: string;
  onAction: (word: WordHealth) => void;
  secondaryAction?: (word: WordHealth) => void;
  secondaryLabel?: string;
  bulkActionLabel?: string;
  onBulkAction?: () => void;
}

function IssueSection({
  title,
  subtitle,
  icon,
  color,
  words,
  isExpanded,
  onToggle,
  actionLabel,
  onAction,
  secondaryAction,
  secondaryLabel,
  bulkActionLabel,
  onBulkAction,
}: IssueSectionProps) {
  if (words.length === 0) return null;

  const colorClasses = {
    red: {
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: 'text-red-500',
      button: 'bg-red-100 text-red-700 hover:bg-red-200',
    },
    orange: {
      border: 'border-orange-200',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      icon: 'text-orange-500',
      button: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    },
    yellow: {
      border: 'border-yellow-200',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      icon: 'text-yellow-500',
      button: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    },
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: 'text-blue-500',
      button: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    },
    green: {
      border: 'border-green-200',
      bg: 'bg-green-50',
      text: 'text-green-700',
      icon: 'text-green-500',
      button: 'bg-green-100 text-green-700 hover:bg-green-200',
    },
    purple: {
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      icon: 'text-purple-500',
      button: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={cn('border rounded-lg overflow-hidden', colors.border)}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn('w-full flex items-center justify-between px-4 py-3', colors.bg)}
      >
        <div className="flex items-center gap-3">
          <span className={colors.icon}>{icon}</span>
          <div className="text-left">
            <div className={cn('font-medium', colors.text)}>{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-sm font-medium', colors.button)}>
            {words.length}
          </span>
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-3">
          {/* Bulk action */}
          {bulkActionLabel && onBulkAction && (
            <div className="flex justify-end">
              <button
                onClick={onBulkAction}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', colors.button)}
              >
                {bulkActionLabel}
              </button>
            </div>
          )}

          {/* Word list */}
          <div className="grid gap-2">
            {words.map((word) => (
              <div
                key={word.hanzi}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-medium">{word.hanzi}</span>
                  {word.pinyin && (
                    <span className="text-sm text-gray-500">{word.pinyin}</span>
                  )}
                  {word.english && (
                    <span className="text-sm text-gray-400">• {word.english}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {secondaryAction && secondaryLabel && (
                    <button
                      onClick={() => secondaryAction(word)}
                      className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {secondaryLabel}
                    </button>
                  )}
                  <button
                    onClick={() => onAction(word)}
                    className={cn('px-3 py-1 text-sm rounded-lg transition-colors', colors.button)}
                  >
                    {actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StoryVocabHealthModal;

