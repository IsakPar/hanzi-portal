import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Save, AlertCircle, Loader2, CheckCircle2,
  Sparkles, X, Volume2, Music, Bot, RefreshCw
} from "lucide-react";
import { HanziInput } from "@/components/shared/HanziInput";
import {
  getVocabulary,
  createVocabulary,
  updateVocabulary,
  generateExampleSentence,
  previewWordAudio,
  previewExampleAudio,
  saveWordAudio,
  saveExampleAudio,
  POS_OPTIONS,
  type VocabularyEntry,
} from "@/services/vocabularyAPI";
import { tagWord } from "@/services/distractorsAPI";
import { toast } from "@/hooks/useToast";
import api from "@/services/api";

// Reusable components
import { AudioPreviewApproval } from "@/components/audio/AudioPreviewApproval";
import { 
  SecondaryCategoryPicker,
  COMMON_CATEGORIES,
  HSK_LEVELS,
  VOICES,
  type VoiceId,
} from "@/components/forms";

interface VocabLesson {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
  contentStatus: string;
}

interface VocabularyEditorProps {
  /** For embedded mode: word ID to edit (overrides URL param) */
  wordId?: string | null;
  /** For embedded mode: initial hanzi for new words */
  initialHanzi?: string;
  /** For embedded mode: hide the navigation header */
  embedded?: boolean;
  /** For embedded mode: callback when saved */
  onSaved?: () => void;
  /** For embedded mode: callback to close */
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
  
  // Use prop wordId if in embedded mode, otherwise use URL param
  const id = embedded ? propWordId : urlId;
  const isNew = embedded ? !propWordId : urlId === "new";

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
  const [pos, setPos] = useState<string>("");
  const [tonePattern, setTonePattern] = useState<string>("");
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([]);
  const [aiTagging, setAiTagging] = useState(false);
  
  // Lessons using this word
  const [usedInLessons, setUsedInLessons] = useState<VocabLesson[]>([]);
  const [firstLessonId, setFirstLessonId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    pos?: { value: string; suggested: boolean };
    tonePattern?: { value: string; computed: boolean };
  } | null>(null);
  
  // AI generation state
  const [generatingExample, setGeneratingExample] = useState(false);
  
  // Audio voice selection (shared between word and example)
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('chinese-female-1');

  useEffect(() => {
    if (!isNew && id) {
      loadEntry();
    }
  }, [id, isNew]);

  async function loadEntry() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getVocabulary(id);
      setEntry(data);
      setTagsInput(data.tags?.join(", ") || "");
      // Load metadata
      setPos(data.pos || "");
      setTonePattern(data.tonePattern || "");
      setSecondaryCategories((data as any).secondaryCategories || []);
      
      // Load lessons that use this word
      try {
        const lessonsData = await api.get<{
          lessons: VocabLesson[];
          firstLessonId: string | null;
        }>(`/v1/vocabulary/${id}/lessons`);
        setUsedInLessons(lessonsData.lessons);
        setFirstLessonId(lessonsData.firstLessonId);
      } catch {
        // Ignore - lessons data is optional
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entry");
    } finally {
      setLoading(false);
    }
  }

  // === METADATA AI TAGGING ===
  
  /**
   * Extract tone pattern from pinyin string
   * e.g., "māmā" → "1-1", "nǐ hǎo" → "3-3"
   */
  function extractTonePatternFromPinyin(pinyin: string): string {
    const toneMap: Record<string, string> = {
      'ā': '1', 'á': '2', 'ǎ': '3', 'à': '4',
      'ē': '1', 'é': '2', 'ě': '3', 'è': '4',
      'ī': '1', 'í': '2', 'ǐ': '3', 'ì': '4',
      'ō': '1', 'ó': '2', 'ǒ': '3', 'ò': '4',
      'ū': '1', 'ú': '2', 'ǔ': '3', 'ù': '4',
      'ǖ': '1', 'ǘ': '2', 'ǚ': '3', 'ǜ': '4',
    };
    
    const tones: string[] = [];
    const syllables = pinyin.toLowerCase().split(/\s+/);
    
    for (const syllable of syllables) {
      let foundTone = '5'; // neutral tone default
      for (const char of syllable) {
        if (toneMap[char]) {
          foundTone = toneMap[char];
          break;
        }
      }
      tones.push(foundTone);
    }
    
    return tones.join('-');
  }

  async function handleAiSuggestMetadata() {
    if (isNew || !id) {
      toast.error("Save first", "Please save the entry before AI tagging");
      return;
    }

    setAiTagging(true);
    setAiSuggestions(null);

    try {
      // 1. Compute tone pattern from pinyin (no AI needed)
      const computedTone = extractTonePatternFromPinyin(entry.pinyin || "");
      setTonePattern(computedTone);

      // 2. Get POS suggestion from AI
      const posResult = await tagWord({ wordId: id, field: 'pos' });
      if (posResult.success) {
        setPos(posResult.value);
      }

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
    if (!entry.pinyin) {
      toast.error("No pinyin", "Enter pinyin first to compute tone pattern");
      return;
    }
    const computed = extractTonePatternFromPinyin(entry.pinyin);
    setTonePattern(computed);
    toast.success("Tone pattern computed", computed);
  }

  // AI suggest secondary categories (for SecondaryCategoryPicker)
  const handleAiSuggestSecondaryCategories = async (): Promise<string[]> => {
    if (!id) throw new Error("Save first");
    
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.studio.polymasterlabs.com';
    const response = await fetch(`${API_BASE_URL}/v1/vocabulary/admin/bulk-tag-secondary-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('hm_access_token')}`,
      },
      body: JSON.stringify({ wordIds: [id] }),
    });

    const result = await response.json();
    
    if (result.results?.[0]?.success) {
      return result.results[0].secondaryCategories || [];
    } else {
      throw new Error(result.results?.[0]?.error || result.error || "AI tagging failed");
    }
  };

  // === AI EXAMPLE GENERATION ===
  async function handleGenerateExample() {
    if (isNew || !id) {
      toast.error("Save first", "Please save the entry before generating examples");
      return;
    }
    
    try {
      setGeneratingExample(true);
      const result = await generateExampleSentence(id, true);
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

  // === AUDIO HANDLERS (for AudioPreviewApproval component) ===
  
  // Generate word audio - returns base64
  const handleGenerateWordAudio = async (): Promise<string> => {
    if (!id) throw new Error("Save first");
    const result = await previewWordAudio(id, selectedVoice, 1.0);
    return result.audioBase64;
  };
  
  // Save word audio
  const handleSaveWordAudio = async (base64: string): Promise<void> => {
    if (!id) throw new Error("Save first");
    const result = await saveWordAudio(id, base64);
    setEntry(prev => ({ ...prev, wordAudioR2Key: result.r2Key }));
  };
  
  // Generate example audio - returns base64
  const handleGenerateExampleAudio = async (): Promise<string> => {
    if (!id) throw new Error("Save first");
    if (!entry.exampleChinese) throw new Error("Generate example sentence first");
    const result = await previewExampleAudio(id, selectedVoice, 1.0);
    return result.audioBase64;
  };
  
  // Save example audio
  const handleSaveExampleAudio = async (base64: string): Promise<void> => {
    if (!id) throw new Error("Save first");
    const result = await saveExampleAudio(id, base64);
    setEntry(prev => ({ ...prev, exampleAudioR2Key: result.r2Key }));
  };

  // === SAVE ENTRY ===
  async function handleSave() {
    if (!entry.hanzi?.trim()) { setError("Hanzi is required"); return; }
    if (!entry.pinyin?.trim()) { setError("Pinyin is required"); return; }
    if (!entry.english?.trim()) { setError("English translation is required"); return; }
    if (!entry.category?.trim()) { setError("Category is required"); return; }

    try {
      setSaving(true);
      setError(null);

      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      const data = {
        hanzi: entry.hanzi!,
        pinyin: entry.pinyin!,
        english: entry.english!,
        category: entry.category!,
        hskLevel: entry.hskLevel!,
        tags: tags.length > 0 ? tags : undefined,
        // Pedagogic metadata
        pos: pos || undefined,
        tonePattern: tonePattern || undefined,
        secondaryCategories: secondaryCategories.length > 0 ? secondaryCategories : undefined,
        // Audio and examples
        wordAudioR2Key: entry.wordAudioR2Key || undefined,
        exampleChinese: entry.exampleChinese || undefined,
        examplePinyin: entry.examplePinyin || undefined,
        exampleEnglish: entry.exampleEnglish || undefined,
        exampleAudioR2Key: entry.exampleAudioR2Key || undefined,
      };

      if (isNew) {
        const created = await createVocabulary(data);
        toast.success("Created!", "Vocabulary entry created");
        
        // In embedded mode, call onSaved callback; otherwise navigate
        if (embedded) {
          onSaved?.();
        } else {
          navigate(`/vocabulary/${created.id}/edit`);
        }
      } else {
        await updateVocabulary(id!, data);
        toast.success("Saved!", "Vocabulary entry updated");
        
        // In embedded mode, call onSaved callback
        if (embedded) {
          onSaved?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

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
        {/* Back button - different behavior in embedded mode */}
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
              {entry.rowNum && <span className="font-mono text-purple-600 mr-2">#{entry.rowNum}</span>}
              {isNew ? "Create a new entry" : "Update entry with audio"}
            </p>
          </div>
          {!isNew && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">Voice:</Label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value as VoiceId)}
                className="text-sm px-2 py-1 border border-gray-300 rounded-lg"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
        
        {/* SECTION 1: WORD BASICS */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-purple-100 text-purple-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Word Information
          </h2>
          
          <div className="space-y-4">
            {/* Hanzi */}
            <div>
              <Label htmlFor="hanzi">Chinese Characters (Hanzi) *</Label>
              <HanziInput
                value={entry.hanzi || ""}
                onChange={(value) => setEntry({ ...entry, hanzi: value })}
                onPinyinDetected={(pinyin) => setEntry((prev) => ({ ...prev, pinyin }))}
                onEnglishSuggested={(english) => {
                  if (!entry.english) setEntry((prev) => ({ ...prev, english }));
                }}
                onVocabularySelected={(vocab) => {
                  setEntry({ ...entry, hanzi: vocab.hanzi, pinyin: vocab.pinyin, english: vocab.english, category: vocab.category, hskLevel: vocab.hskLevel });
                  setTagsInput(vocab.tags?.join(", ") || "");
                }}
                placeholder="Paste Chinese characters (e.g., 你好)"
                className="text-2xl font-medium"
              />
            </div>

            {/* Pinyin & English */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pinyin">Pinyin *</Label>
                <Input id="pinyin" value={entry.pinyin || ""} onChange={(e) => setEntry({ ...entry, pinyin: e.target.value })} placeholder="nǐ hǎo" />
              </div>
              <div>
                <Label htmlFor="english">English *</Label>
                <Input id="english" value={entry.english || ""} onChange={(e) => setEntry({ ...entry, english: e.target.value })} placeholder="hello; hi" />
              </div>
            </div>

            {/* Category & HSK */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <select id="category" value={entry.category || ""} onChange={(e) => setEntry({ ...entry, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option value="">Select category...</option>
                  {COMMON_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="hskLevel">HSK Level *</Label>
                <select id="hskLevel" value={entry.hskLevel || 1} onChange={(e) => setEntry({ ...entry, hskLevel: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  {HSK_LEVELS.map((hsk) => <option key={hsk.value} value={hsk.value}>{hsk.label}</option>)}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="greeting, formal, common" />
            </div>

            {/* Word Audio Section */}
            <AudioPreviewApproval
              label="Word Audio"
              icon={<Volume2 className="w-4 h-4" />}
              colorTheme="purple"
              savedAudioKey={entry.wordAudioR2Key}
              canGenerate={!isNew}
              disabledHint="💡 Save the entry first to generate audio"
              onGenerate={handleGenerateWordAudio}
              onSave={handleSaveWordAudio}
            />
          </div>
        </div>

        {/* SECTION 2: EXAMPLE SENTENCE */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            Example Sentence
          </h2>
          
          <div className="space-y-4">
            {/* AI Generate Button */}
            <Button onClick={handleGenerateExample} disabled={generatingExample || isNew} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              {generatingExample ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generatingExample ? "Generating..." : "✨ Generate Example with AI"}
            </Button>
            
            {isNew && <p className="text-xs text-blue-600 text-center">💡 Save the entry first to use AI generation</p>}

            <div>
              <Label htmlFor="exampleChinese">Chinese Sentence</Label>
              <Textarea id="exampleChinese" value={entry.exampleChinese || ""} onChange={(e) => setEntry({ ...entry, exampleChinese: e.target.value })} placeholder="你好，我叫李明。" rows={2} />
            </div>

            <div>
              <Label htmlFor="examplePinyin">Pinyin</Label>
              <Input id="examplePinyin" value={entry.examplePinyin || ""} onChange={(e) => setEntry({ ...entry, examplePinyin: e.target.value })} placeholder="nǐ hǎo, wǒ jiào lǐ míng" />
            </div>

            <div>
              <Label htmlFor="exampleEnglish">English Translation</Label>
              <Input id="exampleEnglish" value={entry.exampleEnglish || ""} onChange={(e) => setEntry({ ...entry, exampleEnglish: e.target.value })} placeholder="Hello, my name is Li Ming." />
            </div>

            {/* Example Audio Section */}
            {entry.exampleChinese && (
              <AudioPreviewApproval
                label="Sentence Audio"
                icon={<Music className="w-4 h-4" />}
                colorTheme="blue"
                savedAudioKey={entry.exampleAudioR2Key}
                canGenerate={!isNew && !!entry.exampleChinese}
                disabledHint="💡 Save the entry and add example sentence first"
                onGenerate={handleGenerateExampleAudio}
                onSave={handleSaveExampleAudio}
              />
            )}
          </div>
        </div>

        {/* SECTION 3: PEDAGOGIC METADATA */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            Pedagogic Metadata
            <span className="text-xs text-gray-400 font-normal ml-2">
              For smart distractor generation
            </span>
          </h2>

          {/* AI Fill All Button */}
          <div className="mb-4">
            <Button 
              onClick={handleAiSuggestMetadata}
              disabled={aiTagging || isNew}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {aiTagging ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI Analyzing...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  AI Fill All Metadata
                </>
              )}
            </Button>
            {isNew && (
              <p className="text-xs text-amber-600 mt-1">
                Save the entry first to use AI tagging
              </p>
            )}
          </div>

          {/* Metadata Fields */}
          <div className="space-y-4">
            {/* POS & Tone Pattern */}
            <div className="grid grid-cols-2 gap-4">
              {/* Part of Speech */}
              <div>
                <Label htmlFor="pos">Part of Speech (POS)</Label>
                <select
                  id="pos"
                  value={pos}
                  onChange={(e) => setPos(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Not set</option>
                  {POS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.example})
                    </option>
                  ))}
                </select>
                {aiSuggestions?.pos && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    AI suggested: {aiSuggestions.pos.value}
                  </p>
                )}
              </div>

              {/* Tone Pattern */}
              <div>
                <Label htmlFor="tonePattern" className="flex items-center justify-between">
                  <span>Tone Pattern</span>
                  <button
                    type="button"
                    onClick={handleComputeTonePattern}
                    disabled={!entry.pinyin}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 disabled:text-gray-400"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Compute from pinyin
                  </button>
                </Label>
                <Input
                  id="tonePattern"
                  value={tonePattern}
                  onChange={(e) => setTonePattern(e.target.value)}
                  placeholder="e.g., 1-1, 3-3, 2-4"
                  className="font-mono"
                />
                {aiSuggestions?.tonePattern && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-computed: {aiSuggestions.tonePattern.value}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Format: tone numbers separated by dashes (1-4 for tones, 5 for neutral)
                </p>
              </div>
            </div>

            {/* Secondary Categories */}
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4">
              <SecondaryCategoryPicker
                value={secondaryCategories}
                onChange={setSecondaryCategories}
                label="Secondary Categories"
                showAISuggest={true}
                onAISuggest={handleAiSuggestSecondaryCategories}
                canUseAI={!isNew}
              />
              <p className="text-xs text-pink-700 mt-2">
                Select additional semantic categories for better distractor generation
              </p>
            </div>

            {/* Metadata Status Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <Label className="text-green-900 flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4" />
                Metadata Status
              </Label>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {pos ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={pos ? "text-green-700" : "text-gray-500"}>
                    POS: {pos || "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tonePattern ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={tonePattern ? "text-green-700" : "text-gray-500"}>
                    Tone: {tonePattern || "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {entry.category ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={entry.category ? "text-green-700" : "text-gray-500"}>
                    Category: {entry.category || "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {secondaryCategories.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={secondaryCategories.length > 0 ? "text-green-700" : "text-gray-500"}>
                    Secondary: {secondaryCategories.length > 0 ? `${secondaryCategories.length} tags` : "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: USED IN LESSONS */}
        {!isNew && usedInLessons.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Used in Lessons
              <span className="text-xs text-gray-400 font-normal ml-2">
                {usedInLessons.length} lesson{usedInLessons.length !== 1 ? 's' : ''}
              </span>
            </h2>
            
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
              <div className="space-y-2">
                {usedInLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      lesson.id === firstLessonId
                        ? 'bg-indigo-100 hover:bg-indigo-200 border border-indigo-300'
                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-lg">📚</div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          HSK{lesson.hskLevel} L{lesson.lessonNumber}: {lesson.title}
                        </div>
                        {lesson.id === firstLessonId && (
                          <div className="text-xs text-indigo-600">First introduction</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        lesson.contentStatus === 'live' ? 'bg-green-100 text-green-700' :
                        lesson.contentStatus === 'staging' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {lesson.contentStatus}
                      </span>
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Entry</>}
          </Button>
          <Button onClick={embedded ? onClose : () => navigate("/vocabulary")} variant="outline" disabled={saving}>Cancel</Button>
        </div>
      </div>

      {/* Preview Card */}
      {entry.hanzi && (
        <div className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <p className="text-sm font-medium text-purple-700 mb-3">Preview</p>
          <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-4xl font-bold text-gray-900">{entry.hanzi}</div>
                {entry.wordAudioR2Key && (
                  <button className="w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-purple-700" />
                  </button>
                )}
              </div>
              <div className="text-lg text-gray-700 mb-1">{entry.pinyin}</div>
              <div className="text-sm text-gray-600 mb-3">{entry.english}</div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">{entry.category}</span>
                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">HSK {entry.hskLevel}</span>
                {entry.rowNum && <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-mono">#{entry.rowNum}</span>}
                {pos && <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">{pos}</span>}
                {tonePattern && <span className="text-xs px-2 py-1 rounded bg-pink-100 text-pink-700 font-mono">{tonePattern}</span>}
                {secondaryCategories.map(cat => (
                  <span key={cat} className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700">{cat}</span>
                ))}
              </div>
            </div>

            {entry.exampleChinese && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">EXAMPLE:</p>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-lg text-gray-900 mb-1">{entry.exampleChinese}</div>
                    {entry.examplePinyin && <div className="text-sm text-gray-600 mb-1">{entry.examplePinyin}</div>}
                    {entry.exampleEnglish && <div className="text-sm text-gray-500 italic">{entry.exampleEnglish}</div>}
                  </div>
                  {entry.exampleAudioR2Key && (
                    <button className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-blue-700" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
