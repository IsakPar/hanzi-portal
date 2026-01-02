/**
 * SortableSegmentItem
 * Drag-and-drop segment card with voice/speed controls
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit2, Trash2 } from 'lucide-react';
import { SegmentAudioControls } from './SegmentAudioControls';
import { SegmentEditForm } from './SegmentEditForm';
import { useSegments } from './context/SegmentsContext';
import { extractFormData, type EditableSegment } from './types/segment';
import type { Voice } from '@/services/speechAPI';

interface SortableSegmentItemProps {
  segment: EditableSegment;
  index: number;
  storyId: string;
  isHighlighted?: boolean;
}

export function SortableSegmentItem({
  segment,
  index,
  storyId,
  isHighlighted = false,
}: SortableSegmentItemProps) {
  const {
    defaultVoice,
    defaultSpeed,
    voices,
    editSegment,
    saveSegment,
    cancelEdit,
    deleteSegment,
    updateAudioState,
    updateVoice,
    updatePlaybackSpeed,
  } = useSegments();

  const effectiveVoice = segment.selectedVoice || defaultVoice;
  const effectivePlaybackSpeed = segment.playbackSpeed ?? 1.0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: segment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Edit mode
  if (segment.isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <SegmentEditForm
          initialData={extractFormData(segment)}
          onSave={(data) => saveSegment(segment.id, data)}
          onCancel={() => cancelEdit(segment.id)}
        />
      </div>
    );
  }

  // View mode
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group ${
        isHighlighted ? 'ring-4 ring-purple-400 ring-offset-2 scale-[1.01]' : ''
      }`}
    >
      <div className="flex">
        {/* Left: Drag Handle + Content */}
        <div className="flex-1 p-6 flex items-start gap-4">
          {/* Drag Handle */}
          <button
            className="mt-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="flex-1">
            {/* Segment Number */}
            <div className="text-sm font-medium text-purple-600 mb-2">
              Segment {index + 1}
            </div>

            {/* Speaker (for dialogues) */}
            {segment.speaker && (
              <div className="text-sm font-medium text-purple-600 mb-1">
                💬 {segment.speaker}
              </div>
            )}

            {/* Chinese */}
            <div className="text-2xl font-medium text-gray-900 leading-relaxed mb-1">
              {segment.chinese}
            </div>

            {/* Pinyin */}
            {segment.pinyin && (
              <div className="text-gray-600 mb-1">{segment.pinyin}</div>
            )}

            {/* English */}
            {segment.english ? (
              <div className="text-gray-700 italic">{segment.english}</div>
            ) : (
              <div className="text-amber-600 text-sm">⚠️ Missing translation</div>
            )}

            {/* Audio Controls */}
            <div className="mt-4">
              <SegmentAudioControls
                segment={segment}
                storyId={storyId}
                voice={effectiveVoice}
                speed={defaultSpeed}
                playbackSpeed={effectivePlaybackSpeed}
                onAudioGenerated={(audioBase64, durationMs) => {
                  updateAudioState(segment.id, {
                    audioState: 'preview',
                    previewAudioBase64: audioBase64,
                    previewDurationMs: durationMs,
                  });
                }}
                onAudioSaved={(r2Key, durationMs) => {
                  updateAudioState(segment.id, {
                    audioState: 'saved',
                    audioR2Key: r2Key,
                    audioDurationMs: durationMs,
                    previewAudioBase64: undefined,
                    previewDurationMs: undefined,
                  });
                }}
                onAudioDiscarded={() => {
                  updateAudioState(segment.id, {
                    audioState: 'none',
                    previewAudioBase64: undefined,
                    previewDurationMs: undefined,
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Voice + Speed Controls */}
        <SegmentSideControls
          effectiveVoice={effectiveVoice}
          effectivePlaybackSpeed={effectivePlaybackSpeed}
          voices={voices}
          onVoiceChange={(voice) => updateVoice(segment.id, voice)}
          onSpeedChange={(speed) => updatePlaybackSpeed(segment.id, speed)}
          onEdit={() => editSegment(segment.id)}
          onDelete={() => deleteSegment(segment.id)}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Side Controls (Voice, Speed, Edit/Delete)
// ═══════════════════════════════════════════════════════════

interface SegmentSideControlsProps {
  effectiveVoice: string;
  effectivePlaybackSpeed: number;
  voices: Voice[];
  onVoiceChange: (voice: string) => void;
  onSpeedChange: (speed: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SegmentSideControls({
  effectiveVoice,
  effectivePlaybackSpeed,
  voices,
  onVoiceChange,
  onSpeedChange,
  onEdit,
  onDelete,
}: SegmentSideControlsProps) {
  return (
    <div className="w-36 border-l border-gray-100 p-4 bg-gray-50/50 rounded-r-xl flex flex-col gap-3">
      {/* Voice Selector */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Voice</label>
        <select
          value={effectiveVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          {voices.length > 0 ? (
            voices.map(v => (
              <option key={v.id} value={v.id}>
                {v.gender === 'female' ? '👩' : '🧑'} {v.name}
              </option>
            ))
          ) : (
            <option value={effectiveVoice}>Loading...</option>
          )}
        </select>
      </div>

      {/* Playback Speed */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Playback</label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSpeedChange(Math.max(0.5, effectivePlaybackSpeed - 0.1))}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-l-lg bg-white hover:bg-gray-50 text-gray-600"
            disabled={effectivePlaybackSpeed <= 0.5}
          >
            −
          </button>
          <input
            type="text"
            value={effectivePlaybackSpeed.toFixed(1)}
            readOnly
            className="w-12 h-7 text-center text-sm border-y border-gray-200 bg-white"
          />
          <button
            onClick={() => onSpeedChange(Math.min(1.5, effectivePlaybackSpeed + 0.1))}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-r-lg bg-white hover:bg-gray-50 text-gray-600"
            disabled={effectivePlaybackSpeed >= 1.5}
          >
            +
          </button>
        </div>
        {effectivePlaybackSpeed !== 1.0 && (
          <div className="text-xs text-purple-600 mt-1 text-center">
            {effectivePlaybackSpeed < 1.0 ? '🐢 Slower' : '🐇 Faster'}
          </div>
        )}
      </div>

      {/* Edit/Delete Actions */}
      <div className="flex gap-1 mt-auto pt-2 border-t border-gray-200">
        <Button
          type="button"
          onClick={onEdit}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          type="button"
          onClick={onDelete}
          variant="outline"
          size="sm"
          className="flex-1 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

