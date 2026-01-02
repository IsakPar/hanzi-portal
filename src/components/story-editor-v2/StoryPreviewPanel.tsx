/**
 * StoryPreviewPanel - Live preview of the story
 * 
 * Features:
 * - Mobile-like preview
 * - Sentence highlighting
 * - Audio playback simulation
 */

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Play, 
  Pause, 
  Volume2,
  MessageCircle,
  Smartphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface StoryPreviewPanelProps {
  story: StoryWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function StoryPreviewPanel({ story, isOpen, onClose }: StoryPreviewPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sentences = story.sentences || [];
  const currentSentence = sentences[currentIndex];
  const isDialogue = story.storyType === 'dialogue';

  // ─────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Reset on story change
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [story.id]);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────
  
  const playCurrentAudio = () => {
    if (!currentSentence?.audioUrl && !currentSentence?.audioR2Key) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Construct audio URL
    const audioUrl = currentSentence.audioUrl || 
      (currentSentence.audioR2Key ? `https://content.polymasterlabs.com/${currentSentence.audioR2Key}` : null);
    
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
        // Auto-advance if playing
        if (currentIndex < sentences.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      };
    }
  };

  const goToNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  if (!isOpen) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-4 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-l-lg shadow-lg hover:bg-purple-700 transition-colors z-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-80 border-l border-slate-200 bg-slate-100 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-purple-600" />
          <span className="font-medium text-slate-900 text-sm">Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-slate-900 rounded-3xl p-1 shadow-xl">
          <div className="bg-white rounded-[20px] overflow-hidden">
            {/* Phone Notch */}
            <div className="h-6 bg-slate-900 flex items-center justify-center">
              <div className="w-20 h-4 bg-black rounded-full" />
            </div>

            {/* App Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600">
              <h3 className="text-white font-medium text-sm truncate">
                {story.title || 'Untitled Story'}
              </h3>
              <p className="text-purple-200 text-xs">
                HSK {story.hskLevel} · {sentences.length} sentences
              </p>
            </div>

            {/* Story Content */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-3">
              {sentences.map((sentence, idx) => {
                const isCurrent = idx === currentIndex;
                const isPast = idx < currentIndex;
                const hasSpeaker = isDialogue && sentence.speaker;

                return (
                  <div
                    key={sentence.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "p-3 rounded-lg transition-all cursor-pointer",
                      isCurrent 
                        ? "bg-purple-100 border-2 border-purple-300 scale-[1.02]"
                        : isPast
                        ? "bg-green-50 opacity-70"
                        : "bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    {hasSpeaker && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                        <MessageCircle className="w-3 h-3" />
                        {sentence.speaker}
                      </div>
                    )}
                    <p className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-purple-900" : "text-slate-800"
                    )}>
                      {sentence.chinese}
                    </p>
                    {sentence.pinyin && (
                      <p className="text-xs text-purple-600 mt-0.5">
                        {sentence.pinyin}
                      </p>
                    )}
                    {isCurrent && sentence.english && (
                      <p className="text-xs text-slate-600 mt-1 pt-1 border-t border-purple-200">
                        {sentence.english}
                      </p>
                    )}
                  </div>
                );
              })}

              {sentences.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No sentences yet
                </div>
              )}
            </div>

            {/* Playback Controls */}
            {sentences.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={goToPrev}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={playCurrentAudio}
                      disabled={!currentSentence?.audioUrl && !currentSentence?.audioR2Key}
                      className={cn(
                        "p-3 rounded-full transition-colors",
                        isPlaying
                          ? "bg-purple-600 text-white"
                          : "bg-slate-200 hover:bg-slate-300 text-slate-600",
                        (!currentSentence?.audioUrl && !currentSentence?.audioR2Key) && "opacity-30"
                      )}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={goToNext}
                    disabled={currentIndex >= sentences.length - 1}
                    className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Progress */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all"
                      style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {currentIndex + 1}/{sentences.length}
                  </span>
                </div>

                {/* Audio Status */}
                <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                  {currentSentence?.audioUrl || currentSentence?.audioR2Key ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Audio ready
                    </span>
                  ) : (
                    <span className="text-slate-400">No audio</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

