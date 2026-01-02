/**
 * AudioTab - Audio management for story sentences
 * 
 * Features:
 * - Manual audio upload from ElevenLabs portal
 * - Per-sentence audio management
 * - Audio preview & playback
 * 
 * NOTE: TTS API generation has been removed in favor of manual upload
 * from ElevenLabs portal for higher quality audio.
 */

import { useState, useCallback, useRef } from "react";
import { 
  Volume2, 
  Play, 
  Pause, 
  Check, 
  Upload,
  Trash2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import { Button } from "@/components/ui/button";
import { uploadSentenceAudio, deleteSentenceAudio } from "@/services/storiesAPI";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface AudioTabProps {
  story: StoryWithDetails;
  onUpdate: () => void;
  onSentenceAudioUpdate?: (sentenceId: string, audioR2Key: string) => void;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function AudioTab({ story, onUpdate, onSentenceAudioUpdate }: AudioTabProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

  const sentences = story.sentences || [];
  const isNewStory = story.id === 'new';

  const stats = {
    total: sentences.length,
    withAudio: sentences.filter(s => s.audioUrl || s.audioR2Key).length,
  };

  // ─────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────

  const playAudio = useCallback((sentenceId: string, audioKey: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = audioKey.startsWith('http')
      ? audioKey
      : `https://content.polymasterlabs.com/${audioKey}`;

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(sentenceId);

    audio.play();
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast.error('Playback failed');
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  }, []);

  const handleUploadClick = useCallback((sentenceId: string) => {
    setPendingUploadId(sentenceId);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadId) return;

    // Validate file type
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      toast.error('Invalid file', 'Please upload an MP3 audio file');
      return;
    }

    setUploadingId(pendingUploadId);

    try {
      if (isNewStory) {
        // For new stories, store in-memory until story is saved
        // Convert to base64 for temporary storage
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          // Use a temporary key format
          const tempKey = `temp:${pendingUploadId}:${base64}`;
          onSentenceAudioUpdate?.(pendingUploadId, tempKey);
          toast.success('Audio attached', 'Will be saved when you save the story');
          setUploadingId(null);
        };
      } else {
        // For existing stories, upload immediately
        const r2Key = await uploadSentenceAudio(story.id, pendingUploadId, file);
        onSentenceAudioUpdate?.(pendingUploadId, r2Key);
        onUpdate();
        toast.success('Audio uploaded!');
        setUploadingId(null);
      }
    } catch (error) {
      toast.error('Upload failed', (error as Error).message);
      setUploadingId(null);
    }

    // Reset file input
    e.target.value = '';
    setPendingUploadId(null);
  }, [pendingUploadId, isNewStory, story.id, onSentenceAudioUpdate, onUpdate]);

  const handleDelete = useCallback(async (sentenceId: string) => {
    try {
      if (!isNewStory) {
        await deleteSentenceAudio(story.id, sentenceId);
      }
      onSentenceAudioUpdate?.(sentenceId, '');
      if (!isNewStory) onUpdate();
      toast.success('Audio deleted');
    } catch (error) {
      toast.error('Delete failed', (error as Error).message);
    }
  }, [story.id, isNewStory, onSentenceAudioUpdate, onUpdate]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/mpeg,.mp3"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Info banner for new stories */}
      {isNewStory && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">New Story - Draft Mode</p>
            <p className="text-blue-700 text-sm">
              Audio will be saved when you <strong>Save</strong> the story.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Volume2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Audio Management</h2>
              <p className="text-sm text-slate-500">
                Upload audio files generated from ElevenLabs
              </p>
            </div>
          </div>
          <a
            href="https://elevenlabs.io/app/speech-synthesis"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open ElevenLabs
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Sentences</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.withAudio}</p>
            <p className="text-xs text-green-600">With Audio</p>
          </div>
        </div>

        {/* Workflow tip */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Workflow:</strong> Copy each Chinese sentence to ElevenLabs, generate audio with v3 Alpha, 
          download the MP3, then upload it here.
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SENTENCES LIST */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="font-medium text-slate-700">Sentences</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {sentences.map((sentence, index) => {
            const hasAudio = sentence.audioUrl || sentence.audioR2Key;
            const isPlaying = playingId === sentence.id;
            const isUploading = uploadingId === sentence.id;
            const audioKey = sentence.audioR2Key || sentence.audioUrl || '';

            return (
              <div
                key={sentence.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-4",
                  isUploading && "bg-purple-50"
                )}
              >
                {/* Index */}
                <span className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg text-sm font-medium shrink-0">
                  {index + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900">{sentence.chinese}</p>
                  {sentence.pinyin && (
                    <p className="text-sm text-purple-600">{sentence.pinyin}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Has audio */}
                  {hasAudio && !audioKey.startsWith('temp:') && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isPlaying) {
                            stopPlayback();
                          } else {
                            playAudio(sentence.id, audioKey);
                          }
                        }}
                        className={cn(
                          "h-8 w-8 p-0",
                          isPlaying && "bg-green-100 text-green-700"
                        )}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Saved
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sentence.id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete audio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  {/* Temp audio (for new stories) */}
                  {audioKey.startsWith('temp:') && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      Pending save
                    </span>
                  )}

                  {/* No audio - upload button */}
                  {!hasAudio && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUploadClick(sentence.id)}
                      disabled={isUploading}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      {isUploading ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-spin">⏳</span>
                          Uploading...
                        </span>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-1" />
                          Upload
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {sentences.length === 0 && (
            <div className="px-5 py-12 text-center text-slate-500">
              No sentences to add audio to.
              <br />
              <span className="text-sm">Add sentences in the Story tab first.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
