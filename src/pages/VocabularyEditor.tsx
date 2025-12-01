import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, Save, AlertCircle, CheckCircle2, Music, Loader2,
  Sparkles, Play, Pause, RotateCcw, Check, X, Volume2, Bot, RefreshCw
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
  HSK_LEVELS,
  COMMON_CATEGORIES,
  POS_OPTIONS,
  type VocabularyEntry,
} from "@/services/vocabularyAPI";
import { tagWord } from "@/services/distractorsAPI";
import { toast } from "@/hooks/useToast";
import { processAudioAtSpeed } from "@/utils/audioProcessor";
import { CDN_BASE_URL } from "@/services/api";

// Voice options for ElevenLabs
const VOICES = [
  { id: 'chinese-female-1', name: 'Mei Lin (Female)', description: 'Clear, natural' },
  { id: 'chinese-female-2', name: 'Xiao Mei (Female)', description: 'Younger, friendly' },
  { id: 'chinese-male-1', name: 'Wei Chen (Male)', description: 'Clear, natural' },
  { id: 'chinese-male-2', name: 'Zhang Wei (Male)', description: 'Deeper voice' },
];

export function VocabularyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [entry, setEntry] = useState<Partial<VocabularyEntry>>({
    hanzi: "",
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
  const [aiTagging, setAiTagging] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    pos?: { value: string; suggested: boolean };
    tonePattern?: { value: string; computed: boolean };
    category?: { value: string; suggested: boolean };
  } | null>(null);
  
  // AI generation state
  const [generatingExample, setGeneratingExample] = useState(false);
  
  // Audio states
  const [selectedVoice, setSelectedVoice] = useState('chinese-female-1');
  
  // Word audio - store original base64 and control playback speed separately
  const [wordAudioBase64, setWordAudioBase64] = useState<string | null>(null); // Original from ElevenLabs
  const [wordPlaybackSpeed, setWordPlaybackSpeed] = useState(0.7); // Playback speed (0.5-1.0)
  const [generatingWordAudio, setGeneratingWordAudio] = useState(false);
  const [savingWordAudio, setSavingWordAudio] = useState(false);
  const [playingWordAudio, setPlayingWordAudio] = useState(false);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Example audio - store original base64 and control playback speed separately
  const [exampleAudioBase64, setExampleAudioBase64] = useState<string | null>(null); // Original from ElevenLabs
  const [examplePlaybackSpeed, setExamplePlaybackSpeed] = useState(0.7); // Playback speed (0.5-1.0)
  const [generatingExampleAudio, setGeneratingExampleAudio] = useState(false);
  const [savingExampleAudio, setSavingExampleAudio] = useState(false);
  const [playingExampleAudio, setPlayingExampleAudio] = useState(false);
  const exampleAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // === WORD AUDIO PREVIEW/SAVE ===
  async function handleGenerateWordAudio() {
    if (isNew || !id) {
      toast.error("Save first", "Please save the entry before generating audio");
      return;
    }
    
    try {
      setGeneratingWordAudio(true);
      // Always generate at normal speed (1.0x) - we'll adjust playback after
      const result = await previewWordAudio(id, selectedVoice, 1.0);
      setWordAudioBase64(result.audioBase64);
      toast.success("Audio generated!", "Adjust speed slider and listen, then approve");
    } catch (err) {
      toast.error("Audio generation failed", (err as Error).message);
    } finally {
      setGeneratingWordAudio(false);
    }
  }

  async function handleSaveWordAudio() {
    if (!wordAudioBase64 || !id) return;
    
    try {
      setSavingWordAudio(true);
      
      // If speed is not 1.0, process the audio to actually slow it down
      let finalBase64 = wordAudioBase64;
      if (wordPlaybackSpeed !== 1.0) {
        toast.info("Processing audio...", `Applying ${wordPlaybackSpeed}x speed`);
        finalBase64 = await processAudioAtSpeed(wordAudioBase64, wordPlaybackSpeed);
      }
      
      const result = await saveWordAudio(id, finalBase64);
      setEntry(prev => ({ ...prev, wordAudioR2Key: result.r2Key }));
      setWordAudioBase64(null);
      toast.success("Audio saved!", `Word audio saved at ${wordPlaybackSpeed}x speed`);
    } catch (err) {
      toast.error("Save failed", (err as Error).message);
    } finally {
      setSavingWordAudio(false);
    }
  }

  function playWordAudio() {
    if (wordAudioRef.current) {
      if (playingWordAudio) {
        wordAudioRef.current.pause();
        setPlayingWordAudio(false);
      } else {
        // Apply playback speed before playing
        wordAudioRef.current.playbackRate = wordPlaybackSpeed;
        wordAudioRef.current.play();
        setPlayingWordAudio(true);
      }
    }
  }
  
  // Update playback speed in real-time if audio is playing
  useEffect(() => {
    if (wordAudioRef.current) {
      wordAudioRef.current.playbackRate = wordPlaybackSpeed;
    }
  }, [wordPlaybackSpeed]);

  // === EXAMPLE AUDIO PREVIEW/SAVE ===
  async function handleGenerateExampleAudio() {
    if (isNew || !id) {
      toast.error("Save first", "Please save the entry before generating audio");
      return;
    }
    if (!entry.exampleChinese) {
      toast.error("No example", "Generate an example sentence first");
      return;
    }
    
    try {
      setGeneratingExampleAudio(true);
      // Always generate at normal speed (1.0x) - we'll adjust playback after
      const result = await previewExampleAudio(id, selectedVoice, 1.0);
      setExampleAudioBase64(result.audioBase64);
      toast.success("Audio generated!", "Adjust speed slider and listen, then approve");
    } catch (err) {
      toast.error("Audio generation failed", (err as Error).message);
    } finally {
      setGeneratingExampleAudio(false);
    }
  }

  async function handleSaveExampleAudio() {
    if (!exampleAudioBase64 || !id) return;
    
    try {
      setSavingExampleAudio(true);
      
      // If speed is not 1.0, process the audio to actually slow it down
      let finalBase64 = exampleAudioBase64;
      if (examplePlaybackSpeed !== 1.0) {
        toast.info("Processing audio...", `Applying ${examplePlaybackSpeed}x speed`);
        finalBase64 = await processAudioAtSpeed(exampleAudioBase64, examplePlaybackSpeed);
      }
      
      const result = await saveExampleAudio(id, finalBase64);
      setEntry(prev => ({ ...prev, exampleAudioR2Key: result.r2Key }));
      setExampleAudioBase64(null);
      toast.success("Audio saved!", `Example audio saved at ${examplePlaybackSpeed}x speed`);
    } catch (err) {
      toast.error("Save failed", (err as Error).message);
    } finally {
      setSavingExampleAudio(false);
    }
  }

  function playExampleAudio() {
    if (exampleAudioRef.current) {
      if (playingExampleAudio) {
        exampleAudioRef.current.pause();
        setPlayingExampleAudio(false);
      } else {
        // Apply playback speed before playing
        exampleAudioRef.current.playbackRate = examplePlaybackSpeed;
        exampleAudioRef.current.play();
        setPlayingExampleAudio(true);
      }
    }
  }
  
  // Update playback speed in real-time if audio is playing
  useEffect(() => {
    if (exampleAudioRef.current) {
      exampleAudioRef.current.playbackRate = examplePlaybackSpeed;
    }
  }, [examplePlaybackSpeed]);

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
        navigate(`/vocabulary/${created.id}/edit`);
      } else {
        await updateVocabulary(id!, data);
        toast.success("Saved!", "Vocabulary entry updated");
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
      {/* Hidden audio elements for preview playback */}
      {wordAudioBase64 && (
        <audio 
          ref={wordAudioRef} 
          src={`data:audio/mpeg;base64,${wordAudioBase64}`}
          onEnded={() => setPlayingWordAudio(false)} 
        />
      )}
      {exampleAudioBase64 && (
        <audio 
          ref={exampleAudioRef} 
          src={`data:audio/mpeg;base64,${exampleAudioBase64}`}
          onEnded={() => setPlayingExampleAudio(false)} 
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate("/vocabulary")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vocabulary
        </Button>

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
                onChange={(e) => setSelectedVoice(e.target.value)}
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
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
              <Label className="text-purple-900 flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4" />
                Word Audio
              </Label>
              
              {/* Existing audio */}
              {entry.wordAudioR2Key && !wordAudioBase64 && (
                <div className="flex items-center gap-3 mb-3 p-2 bg-white rounded-lg border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Audio saved</span>
                  <audio controls className="h-8 flex-1">
                    <source src={`${CDN_BASE_URL}/${entry.wordAudioR2Key}`} />
                  </audio>
                </div>
              )}
              
              {/* Audio preview with speed control */}
              {wordAudioBase64 ? (
                <div className="space-y-3 p-3 bg-white rounded-lg border border-purple-300">
                  {/* Playback controls */}
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="outline" onClick={playWordAudio} className="border-purple-300">
                      {playingWordAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <div className="flex-1 text-sm text-purple-700">
                      {playingWordAudio ? "Playing..." : "Ready to play"}
                    </div>
                    <Button size="sm" variant="outline" onClick={handleGenerateWordAudio} disabled={generatingWordAudio} title="Regenerate">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setWordAudioBase64(null)} title="Discard">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Speed slider - adjust AFTER generating */}
                  <div className="flex items-center gap-3 pt-2 border-t border-purple-100">
                    <Label className="text-xs text-purple-700 whitespace-nowrap">
                      Playback: <span className="font-bold">{wordPlaybackSpeed.toFixed(2)}x</span>
                    </Label>
                      <Slider
                        value={[wordPlaybackSpeed]}
                        onValueChange={(values: number[]) => setWordPlaybackSpeed(values[0])}
                        min={0.5}
                        max={1.0}
                        step={0.05}
                        className="flex-1"
                      />
                    <span className="text-xs text-gray-500">{wordPlaybackSpeed < 0.7 ? "Slow" : wordPlaybackSpeed < 0.9 ? "Learning" : "Normal"}</span>
                  </div>
                  
                  {/* Save button */}
                  <Button 
                    onClick={handleSaveWordAudio} 
                    disabled={savingWordAudio} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {savingWordAudio ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {wordPlaybackSpeed !== 1.0 ? "Processing & Saving..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save at {wordPlaybackSpeed}x Speed
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleGenerateWordAudio} disabled={generatingWordAudio || isNew} variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-100">
                  {generatingWordAudio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Volume2 className="w-4 h-4 mr-2" />}
                  {generatingWordAudio ? "Generating..." : "Generate Word Audio"}
                </Button>
              )}
              
              {isNew && <p className="text-xs text-purple-600 mt-2">💡 Save the entry first to generate audio</p>}
            </div>
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
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <Label className="text-blue-900 flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4" />
                  Sentence Audio
                </Label>
                
                {/* Existing audio */}
                {entry.exampleAudioR2Key && !exampleAudioBase64 && (
                  <div className="flex items-center gap-3 mb-3 p-2 bg-white rounded-lg border border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Audio saved</span>
                    <audio controls className="h-8 flex-1">
                      <source src={`${CDN_BASE_URL}/${entry.exampleAudioR2Key}`} />
                    </audio>
                  </div>
                )}
                
                {/* Audio preview with speed control */}
                {exampleAudioBase64 ? (
                  <div className="space-y-3 p-3 bg-white rounded-lg border border-blue-300">
                    {/* Playback controls */}
                    <div className="flex items-center gap-3">
                      <Button size="sm" variant="outline" onClick={playExampleAudio} className="border-blue-300">
                        {playingExampleAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <div className="flex-1 text-sm text-blue-700">
                        {playingExampleAudio ? "Playing..." : "Ready to play"}
                      </div>
                      <Button size="sm" variant="outline" onClick={handleGenerateExampleAudio} disabled={generatingExampleAudio} title="Regenerate">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExampleAudioBase64(null)} title="Discard">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Speed slider - adjust AFTER generating */}
                    <div className="flex items-center gap-3 pt-2 border-t border-blue-100">
                      <Label className="text-xs text-blue-700 whitespace-nowrap">
                        Playback: <span className="font-bold">{examplePlaybackSpeed.toFixed(2)}x</span>
                      </Label>
                      <Slider
                        value={[examplePlaybackSpeed]}
                        onValueChange={(values: number[]) => setExamplePlaybackSpeed(values[0])}
                        min={0.5}
                        max={1.0}
                        step={0.05}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500">{examplePlaybackSpeed < 0.7 ? "Slow" : examplePlaybackSpeed < 0.9 ? "Learning" : "Normal"}</span>
                    </div>
                    
                    {/* Save button */}
                    <Button 
                      onClick={handleSaveExampleAudio} 
                      disabled={savingExampleAudio} 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {savingExampleAudio ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {examplePlaybackSpeed !== 1.0 ? "Processing & Saving..." : "Saving..."}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save at {examplePlaybackSpeed}x Speed
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleGenerateExampleAudio} disabled={generatingExampleAudio || isNew || !entry.exampleChinese} variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                    {generatingExampleAudio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Music className="w-4 h-4 mr-2" />}
                    {generatingExampleAudio ? "Generating..." : "Generate Sentence Audio"}
                  </Button>
                )}
              </div>
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
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Entry</>}
          </Button>
          <Button onClick={() => navigate("/vocabulary")} variant="outline" disabled={saving}>Cancel</Button>
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
