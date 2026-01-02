/**
 * AudioManager - Centralized audio management page
 * 
 * Features:
 * - Dashboard showing audio coverage across content types
 * - Filter by content type, HSK level, audio status
 * - Bulk upload for vocabulary and sentences
 * - Export workflow for ElevenLabs portal (Phase 5)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Volume2, 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Pause,
  ExternalLink,
  Search,
  Loader2,
  FileText,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { searchVocabulary, saveWordAudio, type VocabularyEntry, type VocabularySearchParams } from '@/services/vocabularyAPI';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type ContentType = 'vocabulary' | 'stories' | 'lessons';
type AudioStatus = 'all' | 'missing' | 'has';
type ExportFormat = 'text' | 'detailed' | 'json';

interface AudioStats {
  vocabulary: { total: number; withAudio: number };
  stories: { total: number; withAudio: number };
  lessons: { total: number; withAudio: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ExportModalProps {
  vocabulary: VocabularyEntry[];
  isOpen: boolean;
  onClose: () => void;
}

function ExportModal({ vocabulary, isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('text');
  const [batchSize, setBatchSize] = useState<number>(50);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [copied, setCopied] = useState(false);

  const missingAudio = vocabulary.filter(v => !v.wordAudioR2Key);
  const totalBatches = Math.ceil(missingAudio.length / batchSize);
  const currentItems = missingAudio.slice(currentBatch * batchSize, (currentBatch + 1) * batchSize);

  const generateExport = useCallback(() => {
    if (format === 'text') {
      // Simple text - one word per line (for direct paste into ElevenLabs)
      return currentItems.map(v => v.hanzi).join('\n');
    } else if (format === 'detailed') {
      // Detailed text with pinyin context (helps verify pronunciation)
      return currentItems.map(v => 
        `${v.hanzi} (${v.pinyin}) - ${v.english}`
      ).join('\n');
    } else {
      // JSON format for reference
      return JSON.stringify(currentItems.map(v => ({
        id: v.id,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        english: v.english,
        hskLevel: v.hskLevel,
      })), null, 2);
    }
  }, [format, currentItems]);

  const exportContent = generateExport();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!', `${currentItems.length} items ready to paste`);
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : 'txt';
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-export-batch${currentBatch + 1}-${new Date().toISOString().split('T')[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!', `Batch ${currentBatch + 1} of ${totalBatches}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Export for ElevenLabs</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {missingAudio.length} items need audio
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Format selector */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600">Format:</Label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {([
                  { value: 'text', label: 'Simple' },
                  { value: 'detailed', label: 'Detailed' },
                  { value: 'json', label: 'JSON' },
                ] as const).map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={cn(
                      "px-3 py-1.5 text-sm transition-colors",
                      format === f.value
                        ? "bg-purple-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch size */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600">Batch:</Label>
              <select
                value={batchSize}
                onChange={(e) => {
                  setBatchSize(Number(e.target.value));
                  setCurrentBatch(0);
                }}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                <option value={25}>25 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
                <option value={missingAudio.length}>All ({missingAudio.length})</option>
              </select>
            </div>

            {/* Batch navigation */}
            {totalBatches > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentBatch(b => Math.max(0, b - 1))}
                  disabled={currentBatch === 0}
                  className="px-2 py-1 text-sm bg-white border border-slate-200 rounded disabled:opacity-50"
                >
                  ← Prev
                </button>
                <span className="text-sm text-slate-600">
                  {currentBatch + 1} / {totalBatches}
                </span>
                <button
                  onClick={() => setCurrentBatch(b => Math.min(totalBatches - 1, b + 1))}
                  disabled={currentBatch === totalBatches - 1}
                  className="px-2 py-1 text-sm bg-white border border-slate-200 rounded disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Format descriptions */}
          <div className="mt-3 text-xs text-slate-500">
            {format === 'text' && (
              <span>📋 <strong>Simple:</strong> Just Chinese characters - paste directly into ElevenLabs text field</span>
            )}
            {format === 'detailed' && (
              <span>📖 <strong>Detailed:</strong> Characters + pinyin + meaning - for your reference when checking audio</span>
            )}
            {format === 'json' && (
              <span>🔧 <strong>JSON:</strong> Structured data with IDs - for automation scripts</span>
            )}
          </div>
        </div>

        {/* Content preview */}
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-sm font-mono overflow-x-auto whitespace-pre-wrap">
            {exportContent || 'No items to export'}
          </pre>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-600">
            Showing {currentItems.length} of {missingAudio.length} items
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button onClick={handleCopy} className="bg-purple-600 hover:bg-purple-700">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Workflow instructions */}
        <div className="px-6 py-4 bg-purple-50 border-t border-purple-100">
          <h4 className="text-sm font-medium text-purple-900 mb-2">📌 Quick Workflow</h4>
          <ol className="text-xs text-purple-800 space-y-1 list-decimal list-inside">
            <li>Copy the text above using the <strong>Copy</strong> button</li>
            <li>Go to <a href="https://elevenlabs.io/app/speech-synthesis" target="_blank" rel="noopener" className="underline">ElevenLabs Speech Synthesis</a></li>
            <li>Select <strong>Yolanda</strong> voice and <strong>eleven_multilingual_v2</strong> or <strong>v3 Alpha</strong> model</li>
            <li>Paste the text, generate audio for each word</li>
            <li>Download as MP3, naming files as <code className="bg-purple-100 px-1 rounded">你好.mp3</code></li>
            <li>Return here and upload each file to match the word</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  title: string;
  total: number;
  withAudio: number;
  icon: React.ReactNode;
  color: string;
  selected: boolean;
  onClick: () => void;
}

function StatCard({ title, total, withAudio, icon, color, selected, onClick }: StatCardProps) {
  const percentage = total > 0 ? Math.round((withAudio / total) * 100) : 0;
  const missing = total - withAudio;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-xl border-2 text-left transition-all",
        selected
          ? `border-${color}-500 bg-${color}-50`
          : "border-slate-200 hover:border-slate-300 bg-white"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-lg", `bg-${color}-100`)}>
          {icon}
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          percentage >= 80 ? "bg-green-100 text-green-700" :
          percentage >= 50 ? "bg-amber-100 text-amber-700" :
          "bg-red-100 text-red-700"
        )}>
          {percentage}%
        </span>
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="flex items-center gap-3 mt-2 text-sm">
        <span className="text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {withAudio}
        </span>
        <span className="text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {missing}
        </span>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full", `bg-${color}-500`)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARY ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface VocabRowProps {
  vocab: VocabularyEntry;
  isPlaying: boolean;
  onPlay: () => void;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

function VocabRow({ vocab, isPlaying, onPlay, onUpload, isUploading }: VocabRowProps) {
  const hasAudio = !!vocab.wordAudioR2Key;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
    }
    e.target.value = '';
  };

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors",
      isUploading && "bg-purple-50"
    )}>
      {/* Audio status */}
      <div className="w-8">
        {hasAudio ? (
          <button
            onClick={onPlay}
            className={cn(
              "p-1.5 rounded-full transition-colors",
              isPlaying ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600 hover:bg-purple-200"
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        ) : (
          <div className="p-1.5 bg-amber-100 rounded-full">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium text-slate-900">{vocab.hanzi}</span>
          <span className="text-purple-600 text-sm">{vocab.pinyin}</span>
          <span className="text-slate-500 text-sm truncate">{vocab.english}</span>
        </div>
      </div>

      {/* HSK Level */}
      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
        HSK {vocab.hskLevel}
      </span>

      {/* Upload button */}
      <label className="cursor-pointer">
        <input
          type="file"
          accept="audio/mp3,audio/mpeg,.mp3"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <span className={cn(
          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors",
          isUploading
            ? "bg-purple-100 text-purple-600"
            : hasAudio
            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
            : "bg-purple-600 text-white hover:bg-purple-700"
        )}>
          {isUploading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-3 h-3" />
              {hasAudio ? 'Replace' : 'Upload'}
            </>
          )}
        </span>
      </label>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AudioManager() {
  // State
  const [contentType, setContentType] = useState<ContentType>('vocabulary');
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('missing');
  const [hskLevel, setHskLevel] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [stats, setStats] = useState<AudioStats>({
    vocabulary: { total: 0, withAudio: 0 },
    stories: { total: 0, withAudio: 0 },
    lessons: { total: 0, withAudio: 0 },
  });

  // Audio element ref
  const audioRef = useMemo(() => new Audio(), []);

  // Load stats
  useEffect(() => {
    loadStats();
  }, []);

  // Load vocabulary when filters change
  useEffect(() => {
    if (contentType === 'vocabulary') {
      loadVocabulary();
    }
  }, [contentType, audioStatus, hskLevel, searchQuery]);

  const loadStats = async () => {
    try {
      // Load vocabulary stats
      const [allVocab, vocabWithAudio] = await Promise.all([
        searchVocabulary({ limit: 1 }),
        searchVocabulary({ has_audio: true, limit: 1 }),
      ]);
      
      setStats(prev => ({
        ...prev,
        vocabulary: {
          total: allVocab.total,
          withAudio: vocabWithAudio.total,
        },
      }));
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadVocabulary = async () => {
    setIsLoading(true);
    try {
      const params: VocabularySearchParams = {
        limit: 100,
      };
      
      if (audioStatus === 'missing') params.has_audio = false;
      if (audioStatus === 'has') params.has_audio = true;
      if (hskLevel) params.hsk_level = hskLevel;
      if (searchQuery) params.query = searchQuery;
      
      const result = await searchVocabulary(params);
      setVocabulary(result.results);
    } catch (err) {
      toast.error('Failed to load vocabulary');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = useCallback((vocab: VocabularyEntry) => {
    if (!vocab.wordAudioR2Key) return;
    
    const url = `https://content.polymasterlabs.com/${vocab.wordAudioR2Key}`;
    
    if (playingId === vocab.id) {
      audioRef.pause();
      setPlayingId(null);
    } else {
      audioRef.src = url;
      audioRef.play();
      setPlayingId(vocab.id);
      audioRef.onended = () => setPlayingId(null);
    }
  }, [playingId, audioRef]);

  const handleUpload = useCallback(async (vocab: VocabularyEntry, file: File) => {
    setUploadingId(vocab.id);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
      });
      
      const result = await saveWordAudio(vocab.id, base64);
      
      // Update local state
      setVocabulary(prev => prev.map(v => 
        v.id === vocab.id
          ? { ...v, wordAudioR2Key: result.r2Key }
          : v
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        vocabulary: {
          ...prev.vocabulary,
          withAudio: prev.vocabulary.withAudio + 1,
        },
      }));
      
      toast.success('Audio uploaded!', vocab.hanzi);
    } catch (err) {
      toast.error('Upload failed', (err as Error).message);
    } finally {
      setUploadingId(null);
    }
  }, []);

  // Open export modal
  const handleOpenExport = useCallback(() => {
    const missingAudio = vocabulary.filter(v => !v.wordAudioR2Key);
    if (missingAudio.length === 0) {
      toast.info('Nothing to export', 'All items have audio');
      return;
    }
    setShowExportModal(true);
  }, [vocabulary]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Volume2 className="w-8 h-8 text-purple-600" />
                </div>
                Audio Manager
              </h1>
              <p className="text-slate-600 mt-2">
                Upload and manage audio for vocabulary, stories, and lessons
              </p>
            </div>
            <a
              href="https://elevenlabs.io/app/speech-synthesis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open ElevenLabs
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Vocabulary"
            total={stats.vocabulary.total}
            withAudio={stats.vocabulary.withAudio}
            icon={<Volume2 className="w-5 h-5 text-purple-600" />}
            color="purple"
            selected={contentType === 'vocabulary'}
            onClick={() => setContentType('vocabulary')}
          />
          <StatCard
            title="Stories"
            total={stats.stories.total}
            withAudio={stats.stories.withAudio}
            icon={<Volume2 className="w-5 h-5 text-blue-600" />}
            color="blue"
            selected={contentType === 'stories'}
            onClick={() => setContentType('stories')}
          />
          <StatCard
            title="Lessons"
            total={stats.lessons.total}
            withAudio={stats.lessons.withAudio}
            icon={<Volume2 className="w-5 h-5 text-green-600" />}
            color="green"
            selected={contentType === 'lessons'}
            onClick={() => setContentType('lessons')}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Audio Status Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600">Status:</Label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(['all', 'missing', 'has'] as AudioStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => setAudioStatus(status)}
                    className={cn(
                      "px-3 py-1.5 text-sm transition-colors",
                      audioStatus === status
                        ? "bg-purple-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {status === 'all' ? 'All' : status === 'missing' ? 'Missing' : 'Has Audio'}
                  </button>
                ))}
              </div>
            </div>

            {/* HSK Level Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-600">HSK:</Label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setHskLevel(null)}
                  className={cn(
                    "px-3 py-1.5 text-sm transition-colors",
                    hskLevel === null
                      ? "bg-purple-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  All
                </button>
                {[1, 2, 3].map(level => (
                  <button
                    key={level}
                    onClick={() => setHskLevel(level)}
                    className={cn(
                      "px-3 py-1.5 text-sm transition-colors",
                      hskLevel === level
                        ? "bg-purple-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadVocabulary} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4 mr-1", isLoading && "animate-spin")} />
                Refresh
              </Button>
            <Button variant="outline" onClick={handleOpenExport}>
              <FileText className="w-4 h-4 mr-1" />
              Export for ElevenLabs
            </Button>
            </div>
          </div>
        </div>

        {/* Content List */}
        {contentType === 'vocabulary' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-medium text-slate-700">
                Vocabulary ({vocabulary.length} items)
              </h3>
              {audioStatus === 'missing' && vocabulary.length > 0 && (
                <span className="text-sm text-amber-600">
                  {vocabulary.length} items need audio
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                <p className="text-slate-500">Loading...</p>
              </div>
            ) : vocabulary.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium text-green-600">All caught up!</p>
                <p className="text-sm">No items match the current filters</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {vocabulary.map(vocab => (
                  <VocabRow
                    key={vocab.id}
                    vocab={vocab}
                    isPlaying={playingId === vocab.id}
                    onPlay={() => handlePlay(vocab)}
                    onUpload={(file) => handleUpload(vocab, file)}
                    isUploading={uploadingId === vocab.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {contentType === 'stories' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Volume2 className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">Story Audio</h3>
            <p className="text-slate-500 mb-4">
              Manage story sentence audio in the Story Editor
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/stories'}>
              Go to Stories
            </Button>
          </div>
        )}

        {contentType === 'lessons' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Volume2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">Lesson Audio</h3>
            <p className="text-slate-500 mb-4">
              Manage lesson block audio in the Lesson Editor
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/lessons'}>
              Go to Lessons
            </Button>
          </div>
        )}

        {/* Workflow Tips */}
        <div className="mt-8 bg-purple-50 rounded-xl border border-purple-200 p-5">
          <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
            💡 Recommended Workflow
          </h3>
          <ol className="text-sm text-purple-800 space-y-2 list-decimal list-inside">
            <li>Click <strong>Export for ElevenLabs</strong> to get words needing audio</li>
            <li>Copy the text and open <a href="https://elevenlabs.io/app/speech-synthesis" target="_blank" rel="noopener noreferrer" className="underline text-purple-700">ElevenLabs Portal</a></li>
            <li>Use <strong>Yolanda</strong> voice with <strong>v3 Alpha</strong> or <strong>eleven_multilingual_v2</strong> model</li>
            <li>Generate audio word-by-word, download as MP3</li>
            <li>Name files as the Chinese character (e.g., <code className="bg-purple-100 px-1 rounded">你.mp3</code>)</li>
            <li>Upload each file here - they'll be matched automatically</li>
          </ol>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        vocabulary={vocabulary}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}

export default AudioManager;

