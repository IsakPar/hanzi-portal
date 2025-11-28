/**
 * AI File Picker Modal
 * Allows selecting lessons, stories, and vocabulary as context for AI conversations
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  GraduationCap, 
  BookOpen, 
  FileText,
  Check,
  Loader2
} from 'lucide-react';
import { useAPI } from '@/contexts/APIContext';
import { useAIAssistant, type ContextFile } from '@/contexts/AIAssistantContext';

interface AIFilePickerModalProps {
  onClose: () => void;
}

type TabType = 'lessons' | 'stories' | 'vocabulary';

interface LessonItem {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
}

interface StoryItem {
  id: string;
  title: string;
  hskLevel: number;
}

interface VocabItem {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  hskLevel: number;
}

export function AIFilePickerModal({ onClose }: AIFilePickerModalProps) {
  const api = useAPI();
  const { addContextFile, contextFiles } = useAIAssistant();
  
  const [activeTab, setActiveTab] = useState<TabType>('lessons');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lessonsRes, storiesRes, vocabRes] = await Promise.all([
          api.get<{ lessons: LessonItem[] }>('/v1/admin/lessons'),
          api.get<{ stories: StoryItem[] }>('/v1/stories'),
          api.get<{ vocabulary: VocabItem[] }>('/v1/vocabulary?limit=500'),
        ]);
        
        setLessons(lessonsRes.lessons || []);
        setStories(storiesRes.stories || []);
        setVocabulary(vocabRes.vocabulary || []);
      } catch (error) {
        console.error('Failed to fetch files:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    const query = search.toLowerCase();
    
    switch (activeTab) {
      case 'lessons':
        return lessons.filter(l => 
          l.title.toLowerCase().includes(query) ||
          `hsk ${l.hskLevel}`.includes(query) ||
          `lesson ${l.lessonNumber}`.includes(query)
        );
      case 'stories':
        return stories.filter(s => 
          s.title.toLowerCase().includes(query) ||
          `hsk ${s.hskLevel}`.includes(query)
        );
      case 'vocabulary':
        return vocabulary.filter(v =>
          v.hanzi.includes(query) ||
          v.pinyin.toLowerCase().includes(query) ||
          v.english.toLowerCase().includes(query)
        ).slice(0, 50); // Limit vocab display
      default:
        return [];
    }
  }, [activeTab, search, lessons, stories, vocabulary]);

  // Check if item is already in context
  const isInContext = (type: TabType, id: string) => {
    return contextFiles.some(f => f.type === type.slice(0, -1) as ContextFile['type'] && f.id === id);
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Add selected items to context
  const handleAddSelected = async () => {
    const toAdd: ContextFile[] = [];
    
    for (const id of selectedIds) {
      // Find the item
      const lesson = lessons.find(l => l.id === id);
      if (lesson) {
        // Fetch full lesson content
        try {
          const fullLesson = await api.get<{ lesson: { id: string; title: string; content?: string; blocks?: unknown[] } }>(`/v1/admin/lessons/${id}`);
          toAdd.push({
            id,
            type: 'lesson',
            title: lesson.title,
            hskLevel: lesson.hskLevel,
            content: JSON.stringify(fullLesson.lesson.blocks || fullLesson.lesson, null, 2),
          });
        } catch {
          toAdd.push({
            id,
            type: 'lesson',
            title: lesson.title,
            hskLevel: lesson.hskLevel,
          });
        }
        continue;
      }
      
      const story = stories.find(s => s.id === id);
      if (story) {
        try {
          const fullStory = await api.get<{ story: { id: string; title: string; sentences?: unknown[] } }>(`/v1/stories/${id}`);
          toAdd.push({
            id,
            type: 'story',
            title: story.title,
            hskLevel: story.hskLevel,
            content: JSON.stringify(fullStory.story.sentences || fullStory.story, null, 2),
          });
        } catch {
          toAdd.push({
            id,
            type: 'story',
            title: story.title,
            hskLevel: story.hskLevel,
          });
        }
        continue;
      }
      
      const vocab = vocabulary.find(v => v.id === id);
      if (vocab) {
        toAdd.push({
          id,
          type: 'vocabulary',
          title: `${vocab.hanzi} (${vocab.english})`,
          hskLevel: vocab.hskLevel,
          content: JSON.stringify(vocab, null, 2),
        });
      }
    }
    
    toAdd.forEach(file => addContextFile(file));
    onClose();
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'lessons', label: 'Lessons', icon: <GraduationCap size={16} />, count: lessons.length },
    { id: 'stories', label: 'Stories', icon: <BookOpen size={16} />, count: stories.length },
    { id: 'vocabulary', label: 'Vocabulary', icon: <FileText size={16} />, count: vocabulary.length },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Context Files</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lessons, stories, vocabulary..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No items found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTab === 'lessons' && (filteredItems as LessonItem[]).map(item => (
                <FileItem
                  key={item.id}
                  title={item.title}
                  subtitle={`HSK ${item.hskLevel} · Lesson ${item.lessonNumber}`}
                  icon={<GraduationCap size={18} className="text-purple-500" />}
                  isSelected={selectedIds.has(item.id)}
                  isInContext={isInContext('lessons', item.id)}
                  onToggle={() => toggleSelection(item.id)}
                />
              ))}
              
              {activeTab === 'stories' && (filteredItems as StoryItem[]).map(item => (
                <FileItem
                  key={item.id}
                  title={item.title}
                  subtitle={`HSK ${item.hskLevel}`}
                  icon={<BookOpen size={18} className="text-blue-500" />}
                  isSelected={selectedIds.has(item.id)}
                  isInContext={isInContext('stories', item.id)}
                  onToggle={() => toggleSelection(item.id)}
                />
              ))}
              
              {activeTab === 'vocabulary' && (filteredItems as VocabItem[]).map(item => (
                <FileItem
                  key={item.id}
                  title={`${item.hanzi} (${item.pinyin})`}
                  subtitle={item.english}
                  icon={<FileText size={18} className="text-green-500" />}
                  isSelected={selectedIds.has(item.id)}
                  isInContext={isInContext('vocabulary', item.id)}
                  onToggle={() => toggleSelection(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <span className="text-sm text-gray-500">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Add Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual file item component
function FileItem({
  title,
  subtitle,
  icon,
  isSelected,
  isInContext,
  onToggle,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isSelected: boolean;
  isInContext: boolean;
  onToggle: () => void;
}) {
  const isDisabled = isInContext;
  
  return (
    <button
      onClick={onToggle}
      disabled={isDisabled}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed bg-gray-50'
          : isSelected
          ? 'bg-purple-50 border-2 border-purple-500'
          : 'hover:bg-gray-50 border-2 border-transparent'
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
      </div>
      <div className="flex-shrink-0">
        {isInContext ? (
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            Added
          </span>
        ) : isSelected ? (
          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
        )}
      </div>
    </button>
  );
}

