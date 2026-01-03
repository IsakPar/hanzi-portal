/**
 * StoryTab - Combined story info and sentences editing
 * 
 * Features:
 * - Story metadata (title, HSK, description)
 * - Inline sentence editing
 * - Drag & drop reordering
 * - Quick text input
 */

import { useState } from "react";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Check,
  X,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { uploadCover } from "@/services/storiesAPI";
import type { StoryWithDetails, StorySentence } from "@/services/storiesAPI";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { splitIntoSegments, estimateSegmentCount } from "@/utils/textSplitter";
import { hanziToPinyin } from "@/services/chineseNLP";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface StoryTabProps {
  story: StoryWithDetails;
  onChange: (updates: Partial<StoryWithDetails>) => void;
  onSentencesChange: (sentences: StorySentence[]) => void;
}


// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function StoryTab({ story, onChange, onSentencesChange }: StoryTabProps) {
  // Open "Story Details" by default for new stories, otherwise open sentences
  const [expandedSection, setExpandedSection] = useState<'info' | 'sentences' | null>(
    story.id === 'new' ? 'info' : 'sentences'
  );
  const [editingSentenceId, setEditingSentenceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ chinese: '', pinyin: '', english: '', speaker: '' });
  
  // Quick input state
  const [quickText, setQuickText] = useState('');
  const [estimatedCount, setEstimatedCount] = useState(0);
  
  // Cover upload state
  const [uploadingCover, setUploadingCover] = useState(false);

  // ─────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────

  const handleMetadataChange = (field: keyof StoryWithDetails, value: unknown) => {
    onChange({ [field]: value });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5MB)');
      return;
    }

    // For new stories, we can't upload yet - store locally for preview
    if (story.id === 'new') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onChange({ coverImageR2Key: ev.target?.result as string }); // Store data URL temporarily
      };
      reader.readAsDataURL(file);
      toast.success('Cover preview set - will upload on save');
      return;
    }

    // Upload to backend
    setUploadingCover(true);
    try {
      const r2Key = await uploadCover(story.id, file);
      onChange({ coverImageR2Key: r2Key });
      toast.success('Cover image uploaded!');
    } catch (err) {
      toast.error('Failed to upload cover');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleQuickTextChange = (text: string) => {
    setQuickText(text);
    setEstimatedCount(estimateSegmentCount(text));
  };

  const handleSplitText = () => {
    if (!quickText.trim()) return;

    const rawSegments = splitIntoSegments(quickText);
    const newSentences: StorySentence[] = rawSegments.map((chinese, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      storyId: story.id,
      orderIndex: (story.sentences?.length || 0) + idx,
      chinese,
      pinyin: hanziToPinyin(chinese),
      english: '',
      speaker: null,
      audioUrl: null,
      createdAt: new Date(),
    }));

    onSentencesChange([...(story.sentences || []), ...newSentences]);
    setQuickText('');
    setEstimatedCount(0);
    toast.success(`${newSentences.length} sentences added!`);
  };

  const startEditing = (sentence: StorySentence) => {
    setEditingSentenceId(sentence.id);
    setEditForm({
      chinese: sentence.chinese,
      pinyin: sentence.pinyin,
      english: sentence.english,
      speaker: sentence.speaker || '',
    });
  };

  const cancelEditing = () => {
    setEditingSentenceId(null);
    setEditForm({ chinese: '', pinyin: '', english: '', speaker: '' });
  };

  const saveEditing = () => {
    if (!editingSentenceId) return;

    const updated = (story.sentences || []).map(s =>
      s.id === editingSentenceId
        ? { ...s, ...editForm, speaker: editForm.speaker || null }
        : s
    );
    onSentencesChange(updated);
    setEditingSentenceId(null);
  };

  const addNewSentence = () => {
    const newSentence: StorySentence = {
      id: `temp-${Date.now()}`,
      storyId: story.id,
      orderIndex: story.sentences?.length || 0,
      chinese: '',
      pinyin: '',
      english: '',
      speaker: null,
      audioUrl: null,
      createdAt: new Date(),
    };
    onSentencesChange([...(story.sentences || []), newSentence]);
    startEditing(newSentence);
  };

  const deleteSentence = (id: string) => {
    const updated = (story.sentences || []).filter(s => s.id !== id);
    onSentencesChange(updated);
    if (editingSentenceId === id) cancelEditing();
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  const isDialogue = story.storyType === 'dialogue' || story.sentences?.some(s => s.speaker);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* STORY INFO SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'info' ? null : 'info')}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSection === 'info' ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
            <h2 className="font-semibold text-slate-900">Story Details & Cover</h2>
          </div>
          <div className="flex items-center gap-3">
            {story.coverImageR2Key && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Cover ✓
              </span>
            )}
            <span className="text-sm text-slate-500">
              {story.title || 'Untitled'} · HSK {story.hskLevel}
            </span>
          </div>
        </button>

        {expandedSection === 'info' && (
          <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
            {/* Title Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={story.title}
                  onChange={(e) => handleMetadataChange('title', e.target.value)}
                  placeholder="My Chinese Story"
                  className="text-lg font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hskLevel">HSK Level *</Label>
                <select
                  id="hskLevel"
                  value={story.hskLevel}
                  onChange={(e) => handleMetadataChange('hskLevel', Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                    <option key={level} value={level}>HSK {level}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subtitle & Type */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={story.subtitle || ''}
                  onChange={(e) => handleMetadataChange('subtitle', e.target.value)}
                  placeholder="English subtitle or tagline"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Story Type</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMetadataChange('storyType', 'text')}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      story.storyType !== 'dialogue'
                        ? "bg-purple-50 border-purple-200 text-purple-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Narration
                  </button>
                  <button
                    onClick={() => handleMetadataChange('storyType', 'dialogue')}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      story.storyType === 'dialogue'
                        ? "bg-purple-50 border-purple-200 text-purple-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Dialogue
                  </button>
                </div>
              </div>
            </div>

            {/* Difficulty & Duration */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={story.difficulty}
                  onChange={(e) => handleMetadataChange('difficulty', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={story.topic || ''}
                  onChange={(e) => handleMetadataChange('topic', e.target.value)}
                  placeholder="daily_life, food..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estimatedMinutes">Duration (min)</Label>
                <Input
                  id="estimatedMinutes"
                  type="number"
                  value={story.estimatedMinutes || ''}
                  onChange={(e) => handleMetadataChange('estimatedMinutes', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="5"
                  min="1"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={story.description || ''}
                onChange={(e) => handleMetadataChange('description', e.target.value)}
                placeholder="A brief description of the story..."
                rows={2}
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-1.5">
              <Label>Cover Image</Label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {story.coverImageR2Key ? (
                    <img
                      src={story.coverImageR2Key.startsWith('data:') 
                        ? story.coverImageR2Key 
                        : `https://content.hanzimaster.com/${story.coverImageR2Key}`}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlus size={24} className="text-slate-300" />
                  )}
                </div>
                
                {/* Upload button */}
                <div className="flex-1 space-y-2">
                  <label className="relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleCoverUpload}
                      className="sr-only"
                      disabled={uploadingCover}
                    />
                    <div className={cn(
                      "px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors inline-flex items-center gap-2 text-sm font-medium",
                      uploadingCover && "opacity-50 cursor-not-allowed"
                    )}>
                      {uploadingCover ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImagePlus size={16} />
                          {story.coverImageR2Key ? 'Change Cover' : 'Upload Cover'}
                        </>
                      )}
                    </div>
                  </label>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, or WebP. Max 5MB. Recommended: 400×400px
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SENTENCES SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'sentences' ? null : 'sentences')}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSection === 'sentences' ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
            <h2 className="font-semibold text-slate-900">Sentences</h2>
            {isDialogue && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                <MessageCircle className="w-3 h-3 inline mr-1" />
                Dialogue
              </span>
            )}
          </div>
          <span className="text-sm text-slate-500">
            {story.sentences?.length || 0} sentences
          </span>
        </button>

        {expandedSection === 'sentences' && (
          <div className="border-t border-slate-100">
            {/* Quick Input */}
            <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <Textarea
                    value={quickText}
                    onChange={(e) => handleQuickTextChange(e.target.value)}
                    placeholder="Paste full story text here... It will be split into sentences automatically."
                    rows={2}
                    className="bg-white/80 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSplitText}
                    disabled={!quickText.trim()}
                    className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Split ({estimatedCount})
                  </Button>
                </div>
              </div>
            </div>

            {/* Sentences List */}
            <div className="divide-y divide-slate-100">
              {(story.sentences || []).map((sentence, index) => (
                <div
                  key={sentence.id}
                  className={cn(
                    "group flex items-start gap-3 px-5 py-3 transition-colors",
                    editingSentenceId === sentence.id ? "bg-purple-50" : "hover:bg-slate-50"
                  )}
                >
                  {/* Drag Handle & Index */}
                  <div className="flex items-center gap-2 pt-2">
                    <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                    <span className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-500 rounded text-xs font-medium">
                      {index + 1}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {editingSentenceId === sentence.id ? (
                      /* Edit Mode */
                      <div className="space-y-2">
                        {/* Speaker (if dialogue) */}
                        {(isDialogue || editForm.speaker) && (
                          <Input
                            value={editForm.speaker}
                            onChange={(e) => setEditForm(f => ({ ...f, speaker: e.target.value }))}
                            placeholder="Speaker (e.g., 小明)"
                            className="h-8 text-sm bg-white"
                          />
                        )}
                        <Input
                          value={editForm.chinese}
                          onChange={(e) => setEditForm(f => ({ ...f, chinese: e.target.value }))}
                          placeholder="中文"
                          className="text-lg bg-white"
                          autoFocus
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={editForm.pinyin}
                            onChange={(e) => setEditForm(f => ({ ...f, pinyin: e.target.value }))}
                            placeholder="pīnyīn"
                            className="h-8 text-sm bg-white"
                          />
                          <Input
                            value={editForm.english}
                            onChange={(e) => setEditForm(f => ({ ...f, english: e.target.value }))}
                            placeholder="English translation"
                            className="h-8 text-sm bg-white"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={cancelEditing}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={saveEditing} className="bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div
                        className="cursor-pointer"
                        onClick={() => startEditing(sentence)}
                      >
                        {sentence.speaker && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mb-0.5">
                            <MessageCircle className="w-3 h-3" />
                            {sentence.speaker}
                          </div>
                        )}
                        <p className="text-lg text-slate-900 leading-relaxed">
                          {sentence.chinese || <span className="text-slate-400 italic">Empty sentence</span>}
                        </p>
                        {(sentence.pinyin || sentence.english) && (
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                            {sentence.pinyin && <span className="text-purple-600">{sentence.pinyin}</span>}
                            {sentence.pinyin && sentence.english && <span className="text-slate-300">·</span>}
                            {sentence.english && <span>{sentence.english}</span>}
                          </div>
                        )}
                        {!sentence.chinese && !sentence.pinyin && !sentence.english && (
                          <p className="text-sm text-slate-400">Click to edit</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Audio Status & Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    {/* Audio indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      sentence.audioUrl || sentence.audioR2Key ? "bg-green-500" : "bg-slate-300"
                    )} />
                    
                    {/* Delete button (visible on hover) */}
                    {editingSentenceId !== sentence.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSentence(sentence.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {(!story.sentences || story.sentences.length === 0) && (
                <div className="px-5 py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-3">No sentences yet</p>
                  <p className="text-sm text-slate-400 mb-4">
                    Paste text above or add sentences manually
                  </p>
                </div>
              )}

              {/* Add Button */}
              <div className="px-5 py-3">
                <Button
                  variant="outline"
                  onClick={addNewSentence}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sentence
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

