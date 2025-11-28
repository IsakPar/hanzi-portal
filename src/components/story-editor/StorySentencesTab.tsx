/**
 * StorySentencesTab
 * Orchestrator component for story segment management
 * 
 * Refactored from 1100+ LOC to ~200 LOC by extracting:
 * - types/segment.ts - Domain and UI state types
 * - hooks/useVoices.ts - Voice loading
 * - hooks/useAudioPlayer.ts - Audio playback
 * - hooks/useSegmentAudio.ts - Audio generation/save
 * - context/SegmentsContext.tsx - State management
 * - SegmentAudioControls.tsx - Audio controls UI
 * - SegmentEditForm.tsx - Edit form UI
 * - SortableSegmentItem.tsx - Segment card
 * - StoryPreviewPlayer.tsx - Story preview
 */

import { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, Volume2, Loader2, Check } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';
import type { StoryWithDetails } from '@/services/storiesAPI';
import { getSpeechStatus, getVoices } from '@/services/speechAPI';
import { logger } from '@/utils/logger';

import { SegmentsProvider, useSegments } from './context/SegmentsContext';
import { SortableSegmentItem } from './SortableSegmentItem';
import { StoryPreviewPlayer } from './StoryPreviewPlayer';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface StorySentencesTabProps {
  story: StoryWithDetails;
  onUpdate: () => void;
}

export function StorySentencesTab({ story, onUpdate }: StorySentencesTabProps) {
  const { confirm, ConfirmDialogComponent } = useConfirm();

  return (
    <>
      {ConfirmDialogComponent}
      <SegmentsProvider
        storyId={story.id}
        initialSentences={story.sentences || []}
        onUpdate={onUpdate}
        onConfirm={confirm}
      >
        <StorySentencesContent story={story} />
      </SegmentsProvider>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTENT (uses context)
// ═══════════════════════════════════════════════════════════

function StorySentencesContent({ story }: { story: StoryWithDetails }) {
  const {
    segments,
    hasChanges,
    isSaving,
    isGeneratingAll,
    defaultVoice,
    setDefaultVoice,
    defaultSpeed,
    setDefaultSpeed,
    setVoices,
    voices,
    addSegment,
    handleDragEnd,
    applyVoiceToAll,
    generateAllAudio,
    saveAllChanges,
    stats,
  } = useSegments();

  const [speechConfigured, setSpeechConfigured] = useState<boolean | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number | null>(null);

  // Load voices and check ElevenLabs status
  useEffect(() => {
    getSpeechStatus()
      .then(status => setSpeechConfigured(status.configured))
      .catch(() => setSpeechConfigured(false));
    
    getVoices()
      .then(data => setVoices(data.voices))
      .catch(err => logger.error('Failed to load voices:', err));
  }, [setVoices]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pauseMs = (story as any).pauseBetweenSegmentsMs || 500;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 shadow-lg border border-purple-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Story Segments
            </h2>
            <p className="text-gray-600">
              Each segment will be highlighted during playback. Generate or upload audio for each one.
            </p>
          </div>
          <div className="flex gap-2">
            <StoryPreviewPlayer
              segments={segments}
              pauseBetweenSegmentsMs={pauseMs}
              onSegmentHighlight={setCurrentPreviewIndex}
            />
            <Button
              onClick={addSegment}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Segment
            </Button>
          </div>
        </div>

        {/* Stats & Controls */}
        {segments.length > 0 && (
          <StatsAndControls
            stats={stats}
            speechConfigured={speechConfigured}
            voices={voices}
            defaultVoice={defaultVoice}
            defaultSpeed={defaultSpeed}
            isGeneratingAll={isGeneratingAll}
            onVoiceChange={setDefaultVoice}
            onSpeedChange={setDefaultSpeed}
            onApplyVoiceToAll={applyVoiceToAll}
            onGenerateAll={generateAllAudio}
          />
        )}

        {/* Segments List */}
        {segments.length > 0 ? (
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={segments.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {segments.map((segment, index) => (
                  <div
                    key={segment.id}
                    className={`transition-all duration-300 ${
                      currentPreviewIndex === index 
                        ? 'ring-4 ring-purple-400 ring-offset-2 scale-[1.01]' 
                        : ''
                    }`}
                  >
                    <SortableSegmentItem
                      segment={segment}
                      index={index}
                      storyId={story.id}
                      isHighlighted={currentPreviewIndex === index}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>

            {/* Save All Button */}
            {hasChanges && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={saveAllChanges}
                  disabled={isSaving}
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Save All Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState onAddSegment={addSegment} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

interface StatsAndControlsProps {
  stats: { withAudio: number; withPreview: number; withoutAudio: number };
  speechConfigured: boolean | null;
  voices: { id: string; name: string; gender: string }[];
  defaultVoice: string;
  defaultSpeed: number;
  isGeneratingAll: boolean;
  onVoiceChange: (voice: string) => void;
  onSpeedChange: (speed: number) => void;
  onApplyVoiceToAll: (voice: string) => void;
  onGenerateAll: () => void;
}

function StatsAndControls({
  stats,
  speechConfigured,
  voices,
  defaultVoice,
  defaultSpeed,
  isGeneratingAll,
  onVoiceChange,
  onSpeedChange,
  onApplyVoiceToAll,
  onGenerateAll,
}: StatsAndControlsProps) {
  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>{stats.withAudio} with audio</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>{stats.withPreview} pending approval</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span>{stats.withoutAudio} without audio</span>
        </div>
        <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
          💰 ~5,500 segments / $1
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {speechConfigured === false && (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠️ ElevenLabs not configured
          </div>
        )}
        
        {/* Voice Selector */}
        <div className="flex items-center gap-1">
          <select
            value={defaultVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={!speechConfigured}
          >
            {voices.length > 0 ? (
              voices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.gender === 'female' ? '👩' : '🧑'} {voice.name}
                </option>
              ))
            ) : (
              <>
                <option value="chinese-female-1">👩 Mei Lin</option>
                <option value="chinese-male-1">🧑 Wei Chen</option>
              </>
            )}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApplyVoiceToAll(defaultVoice)}
            className="text-xs px-2"
            title="Apply this voice to all segments"
          >
            All
          </Button>
        </div>

        {/* Speed Selector */}
        <select
          value={defaultSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          disabled={!speechConfigured}
        >
          <option value="0.6">0.6x (Slow)</option>
          <option value="0.7">0.7x (Default)</option>
          <option value="0.85">0.85x</option>
          <option value="1.0">1.0x (Normal)</option>
        </select>
        
        <Button
          onClick={onGenerateAll}
          disabled={isGeneratingAll || stats.withoutAudio === 0 || !speechConfigured}
          variant="outline"
          className="gap-2"
        >
          {isGeneratingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              Generate All Audio
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onAddSegment }: { onAddSegment: () => void }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
      <div className="text-gray-400 mb-4">
        <Plus className="w-16 h-16 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-2">
        No segments yet
      </h3>
      <p className="text-gray-500 mb-4">
        Add segments manually or use "Quick Story Input" in the Info tab
      </p>
      <Button
        onClick={onAddSegment}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add First Segment
      </Button>
    </div>
  );
}
 