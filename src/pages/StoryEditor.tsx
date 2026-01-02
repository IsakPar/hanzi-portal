/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Eye, Trash2, PlayCircle, Download } from "lucide-react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import { getStory, createStory, updateStory, deleteStory, exportStory, bulkSaveSegments } from "@/services/storiesAPI";
import type { StoryImportData } from "@/components/stories-list/StoryImportModal";
import { StoryInfoTab } from "@/components/story-editor/StoryInfoTab";
import { StorySentencesTab } from "@/components/story-editor/StorySentencesTab";
import { StoryVocabularyTab } from "@/components/story-editor/StoryVocabularyTab";
import { StoryPracticeTab } from "@/components/story-editor/StoryPracticeTab";
import { StoryPreviewModal } from "@/components/story-editor/StoryPreviewModal";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/useToast";
import { useGlobalConfirm } from "@/hooks/useConfirm";
import { useSaveShortcut } from "@/hooks/useKeyboardShortcuts";
import { useAbortController } from "@/hooks/useAbortController";

type Tab = 'info' | 'sentences' | 'vocabulary' | 'practice';

export function StoryEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useGlobalConfirm();
  const { getSignal } = useAbortController();
  const isNew = id === 'new';
  
  // Check for imported data from JSON import workflow
  const importedData = (location.state as { importedStory?: StoryImportData } | null)?.importedStory;

  const [story, setStory] = useState<StoryWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Ref for save handler (needed for keyboard shortcut)
  const saveHandlerRef = useRef<() => void>(() => {});
  
  // Keyboard shortcut for save (Cmd+S / Ctrl+S)
  useSaveShortcut(() => {
    if (story && (isDirty || isNew) && !saving) {
      saveHandlerRef.current();
    }
  }, [story, isDirty, isNew, saving]);

  useEffect(() => {
    if (!isNew && id) {
      loadStory();
    } else if (importedData) {
      // Initialize from imported JSON data
      setStory({
        id: 'new',
        title: importedData.title,
        subtitle: importedData.titleEn || importedData.subtitle,
        author: importedData.author,
        description: importedData.description,
        topic: importedData.topic,
        hskLevel: importedData.hskLevel,
        difficulty: importedData.difficulty || 'medium',
        storyType: importedData.storyType,
        estimatedMinutes: importedData.estimatedMinutes,
        accessTier: importedData.accessTier,
        seriesId: importedData.seriesId,
        seriesOrder: importedData.seriesOrder,
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Convert imported sentences to the editor format
        sentences: importedData.sentences.map((s, idx) => ({
          id: `temp-${idx}`,
          storyId: 'new',
          orderIndex: idx,
          chinese: s.chinese,
          pinyin: s.pinyin,
          english: s.english,
          speaker: s.speaker || null,
          audioUrl: null,
          createdAt: new Date(),
        })),
        vocabulary: [],
        questions: [],
        // Include practice blocks if provided
        practiceBlocks: importedData.practiceBlocks || [],
      } as any);
      setIsDirty(true); // Mark as dirty since it needs saving
      toast.success('Story imported!', `Loaded "${importedData.title}" with ${importedData.sentences.length} sentences. Add TTS and save when ready.`);
    } else {
      // Initialize empty new story
      setStory({
        id: 'new',
        title: '',
        hskLevel: 1,
        difficulty: 'medium',
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sentences: [],
        vocabulary: [],
        questions: [],
        practiceBlocks: [],
      } as any);
    }
  }, [id, isNew]);

  const loadStory = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getStory(id, getSignal());
      setStory(data);
    } catch (error: any) {
      // Ignore cancelled requests
      if (error.isAborted) return;
      logger.error('Failed to load story:', error);
    } finally {
      setLoading(false);
    }
  }, [id, getSignal]);

  const handleSave = useCallback(async () => {
    if (!story) return;

    setSaving(true);
    try {
      if (isNew) {
        // Create the story first
        const newStory = await createStory({
          title: story.title,
          subtitle: story.subtitle,
          author: story.author,
          description: story.description,
          topic: story.topic,
          hskLevel: story.hskLevel,
          difficulty: story.difficulty,
          estimatedMinutes: story.estimatedMinutes,
          practiceBlocks: story.practiceBlocks,
        });
        
        // If we have sentences (from import), save them too
        if (story.sentences && story.sentences.length > 0) {
          await bulkSaveSegments(newStory.id, story.sentences.map((s) => ({
            chinese: s.chinese,
            pinyin: s.pinyin,
            english: s.english,
            speaker: s.speaker || undefined,
            audioR2Key: s.audioR2Key,
          })));
        }
        
        toast.success('Story created!', `"${story.title}" with ${story.sentences?.length || 0} sentences saved.`);
        navigate(`/stories/${newStory.id}/edit`, { replace: true });
      } else {
        await updateStory(story.id, {
          title: story.title,
          subtitle: story.subtitle,
          author: story.author,
          description: story.description,
          topic: story.topic,
          hskLevel: story.hskLevel,
          difficulty: story.difficulty,
          estimatedMinutes: story.estimatedMinutes,
          isPublished: story.isPublished,
          practiceBlocks: story.practiceBlocks,
        });
        toast.success('Story saved!', 'Your changes have been saved successfully');
      }
      setIsDirty(false);
    } catch (error) {
      logger.error('Failed to save story:', error);
      toast.error('Save failed', 'Could not save story. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [story, isNew, navigate]);
  
  // Update ref for keyboard shortcut
  saveHandlerRef.current = handleSave;

  const handleDelete = async () => {
    if (!story || isNew) return;
    
    const confirmed = await confirm({
      title: "Delete Story?",
      description: "Are you sure you want to delete this story? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await deleteStory(story.id);
      toast.success('Story deleted');
      navigate('/stories');
    } catch (error) {
      logger.error('Failed to delete story:', error);
      toast.error('Delete failed', 'Could not delete story. Please try again.');
    }
  };

  const handlePublishToggle = async () => {
    if (!story) return;
    
    const newStatus = !story.isPublished;
    setStory({ ...story, isPublished: newStatus });
    
    if (!isNew) {
      await updateStory(story.id, { isPublished: newStatus });
    }
  };

  if (loading) {
    return <div className="p-8">Loading story...</div>;
  }

  if (!story) {
    return <div className="p-8">Story not found</div>;
  }

  const tabs = [
    { id: 'info' as Tab, label: 'Info', count: null },
    { id: 'sentences' as Tab, label: 'Segments', count: story.sentences?.length || 0 },
    { id: 'vocabulary' as Tab, label: 'Vocabulary', count: story.vocabulary?.length || 0 },
    { id: 'practice' as Tab, label: 'Practice', count: story.practiceBlocks?.length || 0 },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/stories')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isNew ? 'Create New Story' : story.title || 'Untitled Story'}
            </h1>
            <p className="text-sm text-gray-500">
              HSK {story.hskLevel} · {story.difficulty} · {story.isPublished ? 'Published' : 'Draft'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
          {/* Export Button */}
          {!isNew && (
            <button
              onClick={async () => {
                try {
                  const data = await exportStory(story.id);
                  // Rename segments to sentences for content-planner format
                  const exportData = {
                    ...data,
                    sentences: data.segments,
                    segments: undefined,
                  };
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${story.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '-')}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Story exported!');
                } catch (err) {
                  toast.error('Export failed');
                }
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          )}
          {/* Preview Button */}
          {(story.sentences?.length || 0) > 0 && (
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-2"
            >
              <PlayCircle size={16} />
              Preview
            </button>
          )}
          <button
            onClick={handlePublishToggle}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              story.isPublished
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye size={16} />
            {story.isPublished ? 'Published' : 'Publish'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                activeTab === tab.id
                  ? 'text-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && (
          <StoryInfoTab 
            story={story} 
            onChange={(updated) => {
              setStory(updated);
              setIsDirty(true);
            }}
            onGenerateSegments={(segments) => {
              // Add generated segments to the story
              const newSentences = segments.map((seg, idx) => ({
                id: `temp-${Date.now()}-${idx}`,
                storyId: story.id,
                orderIndex: (story.sentences?.length || 0) + idx,
                chinese: seg.chinese,
                pinyin: seg.pinyin,
                english: seg.english,
                audioUrl: null,
                createdAt: new Date(),
              }));
              
              setStory({
                ...story,
                sentences: [...(story.sentences || []), ...newSentences],
              });
              setIsDirty(true);
              
              // Switch to sentences tab
              setActiveTab('sentences');
              toast.success(
                `${segments.length} segments created!`,
                'Add translations and generate audio in the Segments tab'
              );
            }}
          />
        )}
        {activeTab === 'sentences' && (
          <StorySentencesTab story={story} onUpdate={loadStory} />
        )}
        {activeTab === 'vocabulary' && (
          <StoryVocabularyTab story={story} onUpdate={loadStory} />
        )}
        {activeTab === 'practice' && (
          <StoryPracticeTab story={story} onChange={setStory} />
        )}
      </div>

      {/* Story Preview Modal */}
      <StoryPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={story.title || 'Untitled Story'}
        segments={story.sentences || []}
        pauseBetweenSegmentsMs={(story as any).pauseBetweenSegmentsMs || 500}
      />
    </div>
  );
}

