/**
 * VocabularyEditor Page
 * 
 * Create/edit vocabulary entries with audio, metadata, and examples.
 * Supports embedded mode for use in slide-overs.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Save, AlertCircle, Loader2, Volume2, X
} from "lucide-react";
import {
  getVocabulary,
  createVocabulary,
  updateVocabulary,
  generateExampleSentence,
  saveWordAudio,
  saveExampleAudio,
  translateHanzi,
  type VocabularyEntry,
} from "@/services/vocabularyAPI";
import { synthesize as generateAzureSpeech } from "@/services/azureTtsAPI";
import { tagWord } from "@/services/distractorsAPI";
import { toast } from "@/hooks/useToast";
import api from "@/services/api";
import { pinyin as pinyinPro } from "pinyin-pro";

// Reusable components
import { AudioPreviewApproval } from "@/components/audio/AudioPreviewApproval";
import { AZURE_VOICES, DEFAULT_AZURE_VOICE } from "@/services/azureTtsAPI";
import {
  VocabBasicsSection,
  VocabExampleSection,
  VocabMetadataSection,
  VocabPreviewCard,
  VocabLessonsSection,
} from "@/components/vocabulary";

interface VocabLesson {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
  contentStatus: string;
}

interface VocabularyEditorProps {
  wordId?: string | null;
  initialHanzi?: string;
  embedded?: boolean;
  onSaved?: () => void;
  onClose?: () => void;
}

export function VocabularyEditor({
  wordId: propWordId,
  initialHanzi,
  embedded = false,
  onSaved,
  onClose,
}: VocabularyEditorProps = {}) {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const id = embedded ? propWordId : urlId;
  const isNew = embedded ? !propWordId : urlId === "new";

  // Form state
  const [entry, setEntry] = useState<Partial<VocabularyEntry>>({
    hanzi: initialHanzi || "",
    pinyin: "",
    english: "",
    category: "",
    hskLevel: 1,
    tags: [],
    exampleChinese: "",
    examplePinyin: "",
    exampleEnglish: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  
  // Metadata state
  const [pos, setPos] = useState("");
  const [tonePattern, setTonePattern] = useState("");
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([]);
  const [aiTagging, setAiTagging] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    pos?: { value: string; suggested: boolean };
    tonePattern?: { value: string; computed: boolean };
  } | null>(null);
  
  // Lessons
  const [usedInLessons, setUsedInLessons] = useState<VocabLesson[]>([]);
  const [firstLessonId, setFirstLessonId] = useState<string | null>(null);
  
  // AI/Audio state
  const [generatingExample, setGeneratingExample] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_AZURE_VOICE);

  // Load entry
  useEffect(() => {
    if (!isNew && id) loadEntry();
  }, [id, isNew]);

  // Auto-generate pinyin when hanzi changes (for new entries only)
  // Only triggers when hanzi is entered and pinyin is still empty
  useEffect(() => {
    if (!isNew) return;
    if (!entry.hanzi?.trim()) return;
    if (entry.pinyin?.trim()) return; // Don't overwrite existing pinyin
    
    try {
      const generated = pinyinPro(entry.hanzi, { toneType: "symbol" });
      if (generated) {
        setEntry(prev => ({ ...prev, pinyin: generated }));
      }
    } catch (err) {
      // Ignore pinyin generation errors
    }
  }, [entry.hanzi, entry.pinyin, isNew]);

  async function loadEntry() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getVocabulary(id);
      setEntry(data);
      setTagsInput(data.tags?.join(", ") || "");
      setPos(data.pos || "");
      setTonePattern(data.tonePattern || "");
      setSecondaryCategories((data as any).secondaryCategories || []);
      
      // Load lessons
      try {
        const lessonsData = await api.get<{
          lessons: VocabLesson[];
          firstLessonId: string | null;
        }>(`/v1/vocabulary/${id}/lessons`);
        setUsedInLessons(lessonsData.lessons);
        setFirstLessonId(lessonsData.firstLessonId);
      } catch { /* optional */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entry");
    } finally {
      setLoading(false);
    }
  }

  // === HANDLERS ===

  function extractTonePattern(pinyin: string): string {
    const toneMap: Record<string, string> = {
      'ā': '1', 'á': '2', 'ǎ': '3', 'à': '4',
      'ē': '1', 'é': '2', 'ě': '3', 'è': '4',
      'ī': '1', 'í': '2', 'ǐ': '3', 'ì': '4',
      'ō': '1', 'ó': '2', 'ǒ': '3', 'ò': '4',
      'ū': '1', 'ú': '2', 'ǔ': '3', 'ù': '4',
      'ǖ': '1', 'ǘ': '2', 'ǚ': '3', 'ǜ': '4',
    };
    const tones: string[] = [];
    for (const syllable of pinyin.toLowerCase().split(/\s+/)) {
      let tone = '5';
      for (const char of syllable) {
        if (toneMap[char]) { tone = toneMap[char]; break; }
      }
      tones.push(tone);
    }
    return tones.join('-');
  }

  async function handleAiSuggestMetadata() {
    setAiTagging(true);
    try {
      const wordId = await ensureSaved();
      const computedTone = extractTonePattern(entry.pinyin || "");
      setTonePattern(computedTone);
      const posResult = await tagWord({ wordId, field: 'pos' });
      if (posResult.success) setPos(posResult.value);
      setAiSuggestions({
        pos: posResult.success ? { value: posResult.value, suggested: true } : undefined,
        tonePattern: { value: computedTone, computed: true },
      });
      toast.success("AI tagging complete", "Review the suggestions and save");
    } catch (err) {
      toast.error("AI tagging failed", (err as Error).message);
    } finally {
      setAiTagging(false);
    }
  }

  function handleComputeTonePattern() {
    if (!entry.pinyin) return toast.error("No pinyin", "Enter pinyin first");
    const computed = extractTonePattern(entry.pinyin);
    setTonePattern(computed);
    toast.success("Tone pattern computed", computed);
  }

  async function handleAiSuggestSecondaryCategories(): Promise<string[]> {
    const wordId = await ensureSaved();
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.studio.polymasterlabs.com';
    const response = await fetch(`${API_BASE_URL}/v1/vocabulary/admin/bulk-tag-secondary-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('hm_access_token')}`,
      },
      body: JSON.stringify({ wordIds: [wordId] }),
    });
    const result = await response.json();
    if (result.results?.[0]?.success) return result.results[0].secondaryCategories || [];
    throw new Error(result.results?.[0]?.error || "AI tagging failed");
  }

  async function handleGenerateExample() {
    try {
      setGeneratingExample(true);
      const wordId = await ensureSaved();
      const result = await generateExampleSentence(wordId, true);
      setEntry(prev => ({
        ...prev,
        exampleChinese: result.sentence.chinese,
        examplePinyin: result.sentence.pinyin,
        exampleEnglish: result.sentence.english,
      }));
      toast.success("Example generated!", result.cached ? "Using cached example" : "AI generated new example");
    } catch (err) {
      toast.error("Generation failed", (err as Error).message);
    } finally {
      setGeneratingExample(false);
    }
  }

  // Quick save for new entries (used before audio generation)
  const [quickSavedId, setQuickSavedId] = useState<string | null>(null);
  const effectiveId = quickSavedId || id;
  const effectiveIsNew = isNew && !quickSavedId;

  const ensureSaved = async (): Promise<string> => {
    // If already saved, return the ID
    if (effectiveId) return effectiveId;
    
    // Validate minimum required fields
    if (!entry.hanzi?.trim()) throw new Error("Hanzi is required");
    if (!entry.pinyin?.trim()) throw new Error("Pinyin is required");
    if (!entry.english?.trim()) throw new Error("English is required");
    if (!entry.category?.trim()) throw new Error("Category is required");
    
    // Quick save with minimal data
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const data = {
      hanzi: entry.hanzi!,
      pinyin: entry.pinyin!,
      english: entry.english!,
      category: entry.category!,
      hskLevel: entry.hskLevel!,
      tags: tags.length > 0 ? tags : undefined,
    };
    
    const created = await createVocabulary(data);
    setQuickSavedId(created.id);
    toast.success("Entry saved!", "Now generating audio...");
    return created.id;
  };

  // Audio handlers
  // Generate preview uses text directly (no wordId needed)
  // Save requires entry to be saved first
  
  const handleGenerateWordAudio = async (): Promise<{ base64: string; needsTrim?: boolean }> => {
    if (!entry.hanzi?.trim()) throw new Error("No hanzi to speak");
    // Azure TTS - accurate tones without needing trim workarounds
    const result = await generateAzureSpeech(entry.hanzi, selectedVoice, entry.pinyin);
    return { base64: result.audioBase64, needsTrim: false };
  };
  
  const handleSaveWordAudio = async (base64: string): Promise<number> => {
    const wordId = await ensureSaved();
    const result = await saveWordAudio(wordId, base64);
    // Update state with new R2 key AND timestamp for cache busting
    setEntry(prev => ({ 
      ...prev, 
      wordAudioR2Key: result.r2Key,
      wordAudioUpdatedAt: result.audioUpdatedAt,
    }));
    return result.audioUpdatedAt; // Return timestamp for immediate use
  };
  
  const handleGenerateExampleAudio = async (): Promise<{ base64: string; needsTrim?: boolean }> => {
    if (!entry.exampleChinese?.trim()) throw new Error("No example sentence to speak");
    // Azure TTS for sentences - natural and accurate
    const result = await generateAzureSpeech(entry.exampleChinese, selectedVoice);
    return { base64: result.audioBase64, needsTrim: false };
  };
  
  const handleSaveExampleAudio = async (base64: string): Promise<number> => {
    const wordId = await ensureSaved();
    const result = await saveExampleAudio(wordId, base64);
    // Update state with new R2 key AND timestamp for cache busting
    setEntry(prev => ({ 
      ...prev, 
      exampleAudioR2Key: result.r2Key,
      exampleAudioUpdatedAt: result.audioUpdatedAt,
    }));
    return result.audioUpdatedAt; // Return timestamp for immediate use
  };

  // Save
  async function handleSave() {
    if (!entry.hanzi?.trim()) return setError("Hanzi is required");
    if (!entry.pinyin?.trim()) return setError("Pinyin is required");
    if (!entry.english?.trim()) return setError("English is required");
    if (!entry.category?.trim()) return setError("Category is required");

    try {
      setSaving(true);
      setError(null);
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const data = {
        hanzi: entry.hanzi!,
        pinyin: entry.pinyin!,
        english: entry.english!,
        category: entry.category!,
        hskLevel: entry.hskLevel!,
        tags: tags.length > 0 ? tags : undefined,
        pos: pos || undefined,
        tonePattern: tonePattern || undefined,
        secondaryCategories: secondaryCategories.length > 0 ? secondaryCategories : undefined,
        wordAudioR2Key: entry.wordAudioR2Key || undefined,
        exampleChinese: entry.exampleChinese || undefined,
        examplePinyin: entry.examplePinyin || undefined,
        exampleEnglish: entry.exampleEnglish || undefined,
        exampleAudioR2Key: entry.exampleAudioR2Key || undefined,
      };

      if (isNew) {
        const created = await createVocabulary(data);
        toast.success("Created!", "Vocabulary entry created");
        if (embedded) onSaved?.();
        else navigate(`/vocabulary/${created.id}/edit`);
      } else {
        await updateVocabulary(id!, data);
        toast.success("Saved!", "Vocabulary entry updated");
        if (embedded) onSaved?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-gray-600 ml-3">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        {embedded ? (
          <Button variant="outline" onClick={onClose} className="mb-4">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate("/vocabulary")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vocabulary
          </Button>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {isNew ? "Add New Vocabulary" : "Edit Vocabulary"}
            </h1>
            <p className="text-gray-600 mt-1">
              {isNew ? "Create a new entry" : "Update entry with audio"}
            </p>
          </div>
          {!isNew && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">Voice:</Label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-300 rounded-lg"
              >
                {AZURE_VOICES.map((v) => (
                  <option key={v.key} value={v.key}>{v.name} ({v.gender})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form (2 columns) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Basics */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-pink-100 text-pink-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Word Basics
            </h2>
            <VocabBasicsSection
              entry={entry}
              onChange={(updates) => setEntry(prev => ({ ...prev, ...updates }))}
              tagsInput={tagsInput}
              onTagsInputChange={setTagsInput}
              onAiTranslate={async () => {
                if (!entry.hanzi?.trim()) throw new Error("No hanzi to translate");
                const result = await translateHanzi(entry.hanzi);
                toast.success("AI Translated!", `${entry.hanzi} → ${result.english}`);
                return { english: result.english, pinyin: result.pinyin };
              }}
            />
            {/* Word Audio */}
            <div className="mt-4">
              <AudioPreviewApproval
                label="Word Audio"
                icon={<Volume2 className="w-4 h-4" />}
                colorTheme="purple"
                savedAudioKey={entry.wordAudioR2Key}
                audioUpdatedAt={entry.wordAudioUpdatedAt}
                canGenerate={!!entry.hanzi?.trim()}
                disabledHint="💡 Enter Hanzi first to generate audio"
                onGenerate={handleGenerateWordAudio}
                onSave={handleSaveWordAudio}
                targetWord={entry.hanzi || ''}
              />
              
              {/* Info for short words */}
              {(entry.hanzi?.length || 0) <= 2 && (
                <p className="mt-2 text-xs text-purple-600 bg-purple-50 p-2 rounded-lg border border-purple-100">
                  💡 For 1-2 character words, audio is generated with a double-take format for accurate pronunciation. Use the trim tool to select the clean word.
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Example */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Example Sentence
            </h2>
            <VocabExampleSection
              entry={entry}
              onChange={(updates) => setEntry(prev => ({ ...prev, ...updates }))}
              isNew={effectiveIsNew}
              generatingExample={generatingExample}
              onGenerateExample={handleGenerateExample}
              onGenerateAudio={handleGenerateExampleAudio}
              onSaveAudio={handleSaveExampleAudio}
            />
          </section>

          {/* Section 3: Metadata */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Pedagogic Metadata
            </h2>
            <VocabMetadataSection
              pos={pos}
              onPosChange={setPos}
              tonePattern={tonePattern}
              onTonePatternChange={setTonePattern}
              secondaryCategories={secondaryCategories}
              onSecondaryCategoriesChange={setSecondaryCategories}
              isNew={effectiveIsNew}
              aiTagging={aiTagging}
              aiSuggestions={aiSuggestions}
              onAiSuggestMetadata={handleAiSuggestMetadata}
              onComputeTonePattern={handleComputeTonePattern}
              onAiSuggestSecondaryCategories={handleAiSuggestSecondaryCategories}
            />
          </section>

          {/* Section 4: Lessons */}
          {!isNew && usedInLessons.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                Used in Lessons
              </h2>
              <VocabLessonsSection
                lessons={usedInLessons}
                firstLessonId={firstLessonId}
              />
            </section>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Entry
                </>
              )}
            </Button>
            <Button
              onClick={embedded ? onClose : () => navigate("/vocabulary")}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Preview (1 column) */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <VocabPreviewCard
              entry={entry}
              pos={pos}
              tonePattern={tonePattern}
              secondaryCategories={secondaryCategories}
            />
          </div>
        </div>
      </div>
      
    </div>
  );
}

export default VocabularyEditor;
