/**
 * Release Manager Page
 * 
 * Central hub for reviewing and shipping content to the mobile app.
 * Provides git-style diff view of what's changing before shipping.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Package,
  Rocket,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  History,
  ChevronRight,
  Check,
  BookOpen,
  Search,
  Volume2,
  VolumeX,
  AlertTriangle,
} from 'lucide-react';
import { 
  previewRelease, 
  shipRelease, 
  getReleaseHistory,
  getAllHskStatus,
  generateBundle,
  debugVocabulary,
  syncVocabulary,
  type PreviewReleaseResponse,
  type Release,
  type HskLevelStatus,
  type LessonPreview,
  type VocabMode,
  type DebugVocabResponse,
} from '@/services/releaseAPI';
import { BookText } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const HSK_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function ReleaseManager() {
  const [selectedHsk, setSelectedHsk] = useState<number>(1);
  const [hskStatus, setHskStatus] = useState<Record<number, HskLevelStatus>>({});
  const [preview, setPreview] = useState<PreviewReleaseResponse | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [generatingBundle, setGeneratingBundle] = useState(false);
  
  // Selection state for lessons to ship
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
  const [releaseNotes, setReleaseNotes] = useState('');
  const [customVersion, setCustomVersion] = useState('');
  
  // Vocabulary selection state
  const [vocabMode, setVocabMode] = useState<VocabMode>('lessons_only');
  const [selectedVocabIds, setSelectedVocabIds] = useState<Set<string>>(new Set());
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabFilter, setVocabFilter] = useState<'all' | 'in_lessons' | 'not_in_lessons' | 'no_audio'>('all');
  const [showVocabPanel, setShowVocabPanel] = useState(false);
  
  const [showHistory, setShowHistory] = useState(false);
  const [debugData, setDebugData] = useState<DebugVocabResponse | null>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  // Load all HSK status on mount
  useEffect(() => {
    loadAllStatus();
  }, []);

  // Load preview when HSK level changes
  useEffect(() => {
    loadPreview();
    loadHistory();
  }, [selectedHsk]);

  const loadAllStatus = async () => {
    try {
      const response = await getAllHskStatus();
      setHskStatus(response.hskStatus);
    } catch (err) {
      console.error('Failed to load HSK status:', err);
    }
  };

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await previewRelease(selectedHsk);
      setPreview(response);
      
      // Auto-select all pending lessons (including live lessons with changes)
      const allPendingIds = [
        ...response.pendingChanges.newLessons.map(l => l.id),
        ...response.pendingChanges.updatedLessons.map(l => l.id),
        ...(response.pendingChanges.liveLessonsWithChanges || []).map(l => l.id),
      ];
      setSelectedLessonIds(new Set(allPendingIds));
      setCustomVersion(response.suggestedVersion);
      
      // Auto-select vocab used in lessons by default
      if (response.vocabulary.items) {
        const lessonVocabIds = response.vocabulary.items
          .filter(v => v.usedInLesson)
          .map(v => v.id);
        setSelectedVocabIds(new Set(lessonVocabIds));
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
      toast.error('Failed to load preview', 'Please try again');
    } finally {
      setLoading(false);
    }
  }, [selectedHsk]);
  
  // Filter vocabulary based on search and filter
  const filteredVocab = useMemo(() => {
    if (!preview?.vocabulary.items) return [];
    
    let items = preview.vocabulary.items;
    
    // Apply filter
    if (vocabFilter === 'in_lessons') {
      items = items.filter(v => v.usedInLesson);
    } else if (vocabFilter === 'not_in_lessons') {
      items = items.filter(v => !v.usedInLesson);
    } else if (vocabFilter === 'no_audio') {
      items = items.filter(v => !v.hasAudio);
    }
    
    // Apply search
    if (vocabSearch) {
      const search = vocabSearch.toLowerCase();
      items = items.filter(v => 
        v.hanzi.includes(search) || 
        v.pinyin.toLowerCase().includes(search) ||
        v.english.toLowerCase().includes(search)
      );
    }
    
    return items;
  }, [preview?.vocabulary.items, vocabSearch, vocabFilter]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await getReleaseHistory(selectedHsk);
      setReleases(response.releases);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleLesson = (id: string) => {
    setSelectedLessonIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleStory = (id: string) => {
    setSelectedStoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllStories = (storyIds: string[]) => {
    setSelectedStoryIds(prev => {
      const allSelected = storyIds.every(id => prev.has(id));
      if (allSelected) {
        // Deselect all
        const next = new Set(prev);
        storyIds.forEach(id => next.delete(id));
        return next;
      } else {
        // Select all
        return new Set([...prev, ...storyIds]);
      }
    });
  };

  const selectAll = () => {
    if (!preview) return;
    const allIds = [
      ...preview.pendingChanges.newLessons.map(l => l.id),
      ...preview.pendingChanges.updatedLessons.map(l => l.id),
      ...(preview.pendingChanges.liveLessonsWithChanges || []).map(l => l.id),
    ];
    setSelectedLessonIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedLessonIds(new Set());
  };

  const handleDebugVocab = async () => {
    setLoadingDebug(true);
    try {
      const data = await debugVocabulary(selectedHsk);
      setDebugData(data);
      console.log('Debug vocab data:', data);
    } catch (error) {
      toast.error('Debug failed', (error as Error).message);
    } finally {
      setLoadingDebug(false);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncVocabulary(selectedHsk);
      setSyncResult(result);
      console.log('Sync result:', result);
      toast.success('Sync complete!', `${result.totalVocabMatched} vocab matched`);
      // Reload preview to see updated counts
      loadPreview();
    } catch (error) {
      toast.error('Sync failed', (error as Error).message);
      setSyncResult({ error: (error as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateBundle = async () => {
    const version = customVersion || preview?.suggestedVersion || '1.0.0';
    
    setGeneratingBundle(true);
    try {
      const response = await generateBundle(selectedHsk, version);
      
      const sizeKB = Math.round(response.manifest.bundleSize / 1024);
      const sizeMB = (response.manifest.bundleSize / (1024 * 1024)).toFixed(2);
      
      toast.success(
        `📦 Bundle v${version} Generated!`,
        `${response.manifest.stats.lessonCount} lessons, ${response.manifest.stats.vocabCount} vocab, ${response.manifest.stats.audioFileCount} audio files (${sizeKB > 1024 ? sizeMB + 'MB' : sizeKB + 'KB'})`
      );
      
      if (response.errors && response.errors.length > 0) {
        toast.warning('Some files had issues', response.errors.slice(0, 3).join(', '));
      }
    } catch (error) {
      toast.error('Failed to generate bundle', (error as Error).message);
    } finally {
      setGeneratingBundle(false);
    }
  };

  const handleShip = async () => {
    if (selectedLessonIds.size === 0 && selectedStoryIds.size === 0) {
      toast.error('Nothing selected', 'Please select at least one lesson or story to ship');
      return;
    }

    const version = customVersion || preview?.suggestedVersion || '1.0.0';

    setShipping(true);
    try {
      const response = await shipRelease({
        hskLevel: selectedHsk,
        lessonIds: selectedLessonIds.size > 0 ? Array.from(selectedLessonIds) : undefined,
        storyIds: selectedStoryIds.size > 0 ? Array.from(selectedStoryIds) : undefined,
        version,
        releaseNotes: releaseNotes || undefined,
        vocabMode,
        selectedVocabIds: vocabMode === 'selected' ? Array.from(selectedVocabIds) : undefined,
      });

      const parts = [];
      if (response.release.lessonsShipped > 0) {
        parts.push(`${response.release.lessonsShipped} lessons`);
      }
      if (response.release.storiesShipped && response.release.storiesShipped > 0) {
        parts.push(`${response.release.storiesShipped} stories`);
      }
      if (response.release.vocabShipped > 0) {
        parts.push(`${response.release.vocabShipped} vocab`);
      }
      
      toast.success(
        `🚀 v${response.release.version} Shipped!`,
        `${parts.join(' + ')} now live for HSK ${selectedHsk}`
      );

      // Refresh data
      await Promise.all([
        loadPreview(),
        loadHistory(),
        loadAllStatus(),
      ]);

      setReleaseNotes('');
    } catch (err) {
      console.error('Ship failed:', err);
      toast.error('Ship failed', 'Please try again');
    } finally {
      setShipping(false);
    }
  };
  
  // Vocabulary selection helpers
  const toggleVocab = (id: string) => {
    setSelectedVocabIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Switch to selected mode when manually selecting
    if (vocabMode !== 'selected') {
      setVocabMode('selected');
    }
  };
  
  const selectAllVocab = () => {
    if (!preview?.vocabulary.items) return;
    setSelectedVocabIds(new Set(preview.vocabulary.items.map(v => v.id)));
    setVocabMode('selected');
  };
  
  const selectLessonVocab = () => {
    if (!preview?.vocabulary.items) return;
    const lessonVocabIds = preview.vocabulary.items
      .filter(v => v.usedInLesson)
      .map(v => v.id);
    setSelectedVocabIds(new Set(lessonVocabIds));
    setVocabMode('lessons_only');
  };
  
  const clearVocabSelection = () => {
    setSelectedVocabIds(new Set());
    setVocabMode('selected');
  };
  
  // Calculate vocab count to ship based on mode
  const vocabToShipCount = useMemo(() => {
    if (!preview?.vocabulary.items) return 0;
    if (vocabMode === 'all') return preview.vocabulary.total;
    if (vocabMode === 'lessons_only') return preview.vocabulary.inLessons;
    return selectedVocabIds.size;
  }, [vocabMode, selectedVocabIds.size, preview?.vocabulary]);

  const status = hskStatus[selectedHsk];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Release Manager</h1>
                <p className="text-sm text-slate-400">Ship content to the mobile app</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-slate-300 border-slate-600 hover:bg-slate-700"
            >
              <History className="w-4 h-4 mr-2" />
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* HSK Level Selector */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-slate-400">HSK Level</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {HSK_LEVELS.map(level => {
              const levelStatus = hskStatus[level];
              const hasChanges = levelStatus?.hasUnshippedChanges;
              
              return (
                <button
                  key={level}
                  onClick={() => setSelectedHsk(level)}
                  className={cn(
                    "relative px-4 py-3 rounded-xl font-semibold text-lg transition-all",
                    selectedHsk === level
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  HSK {level}
                  {hasChanges && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                  )}
                  {levelStatus?.latestVersion && (
                    <span className="block text-xs opacity-75">
                      v{levelStatus.latestVersion}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Preview Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Summary */}
            {status && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    HSK {selectedHsk} Status
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadPreview}
                    disabled={loading}
                    className="text-slate-400 hover:text-white"
                  >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                  </Button>
                </div>
                {/* Lessons Row */}
                <div className="mb-3">
                  <span className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Lessons</span>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-emerald-400">{status.live}</div>
                      <div className="text-xs text-slate-400 mt-1">Live</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-amber-400">{status.staging}</div>
                      <div className="text-xs text-slate-400 mt-1">Staging</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-slate-400">{status.draft}</div>
                      <div className="text-xs text-slate-400 mt-1">Draft</div>
                    </div>
                  </div>
                </div>
                
                {/* Stories Row */}
                {(status.storiesPublished !== undefined || status.storiesDraft !== undefined) && (
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">Stories</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-500/10 rounded-xl p-4 text-center border border-purple-500/20">
                        <div className="text-3xl font-bold text-purple-400">{status.storiesPublished || 0}</div>
                        <div className="text-xs text-slate-400 mt-1">Published</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-slate-400">{status.storiesDraft || 0}</div>
                        <div className="text-xs text-slate-400 mt-1">Draft</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Changes Preview */}
            {loading ? (
              <div className="bg-slate-800/50 rounded-2xl p-12 border border-slate-700 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* New Lessons */}
                {preview.pendingChanges.newLessons.length > 0 && (
                  <LessonSection
                    title="New Lessons"
                    subtitle="Will be added to mobile"
                    icon={<Plus className="w-5 h-5" />}
                    color="emerald"
                    lessons={preview.pendingChanges.newLessons}
                    selectedIds={selectedLessonIds}
                    onToggle={toggleLesson}
                  />
                )}

                {/* Updated Lessons */}
                {preview.pendingChanges.updatedLessons.length > 0 && (
                  <LessonSection
                    title="Updated Lessons"
                    subtitle="Content has changed"
                    icon={<RefreshCw className="w-5 h-5" />}
                    color="amber"
                    lessons={preview.pendingChanges.updatedLessons}
                    selectedIds={selectedLessonIds}
                    onToggle={toggleLesson}
                  />
                )}

                {/* Live Lessons with Changes (edited since last release) */}
                {(preview.pendingChanges.liveLessonsWithChanges?.length ?? 0) > 0 && (
                  <LessonSection
                    title="Live Lessons with Changes"
                    subtitle="Modified since last release - needs re-ship"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    color="orange"
                    lessons={preview.pendingChanges.liveLessonsWithChanges || []}
                    selectedIds={selectedLessonIds}
                    onToggle={toggleLesson}
                  />
                )}

                {/* Staying Live */}
                {preview.pendingChanges.stayingLessons.length > 0 && (
                  <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-700 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-300">Already Live</h3>
                        <p className="text-xs text-slate-500">{preview.pendingChanges.stayingLessons.length} lessons unchanged</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {preview.pendingChanges.stayingLessons.map(lesson => (
                        <span 
                          key={lesson.id}
                          className="px-3 py-1.5 bg-slate-700/50 text-slate-400 rounded-lg text-sm"
                        >
                          L{lesson.lessonNumber}: {lesson.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Changes - but allow force re-ship */}
                {!preview.hasChanges && (
                  <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No New Lessons</h3>
                    <p className="text-slate-400 mb-4">No pending lesson changes for HSK {selectedHsk}</p>
                    
                    {/* Show option to re-ship if there are live lessons */}
                    {(preview.summary?.totalLive ?? 0) > 0 && (
                      <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <p className="text-amber-400 text-sm mb-3">
                          <strong>Want to update vocab?</strong> You can re-ship {preview.summary.totalLive} live lesson(s) 
                          to apply the quality gate and remove incomplete vocabulary.
                        </p>
                        <Button
                          onClick={() => {
                            // Select all live lessons for re-shipping
                            const liveIds = preview.pendingChanges.stayingLessons?.map(l => l.id) || [];
                            setSelectedLessonIds(new Set(liveIds));
                          }}
                          variant="outline"
                          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Select Live Lessons for Re-Ship
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* STORIES SECTION */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {preview?.stories && (preview.stories.totalDrafts > 0 || preview.stories.totalPublished > 0) && (
                  <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <BookText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Stories</h3>
                          <p className="text-xs text-slate-500">
                            {preview.stories.totalPublished} published, {preview.stories.totalDrafts} draft(s)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Draft Stories - Ready to Publish */}
                    {preview.stories.drafts.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-purple-400 font-medium">
                            Draft Stories ({preview.stories.drafts.length})
                          </span>
                          <button
                            onClick={() => toggleAllStories(preview.stories!.drafts.map(s => s.id))}
                            className="text-xs text-purple-400 hover:text-purple-300"
                          >
                            {preview.stories.drafts.every(s => selectedStoryIds.has(s.id)) 
                              ? 'Deselect All' 
                              : 'Select All'}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {preview.stories.drafts.map(story => (
                            <button
                              key={story.id}
                              onClick={() => toggleStory(story.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                                selectedStoryIds.has(story.id)
                                  ? "bg-purple-500/20 border border-purple-500/50"
                                  : "bg-slate-700/30 border border-slate-600/30 hover:border-purple-500/30"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                                selectedStoryIds.has(story.id)
                                  ? "bg-purple-500"
                                  : "border-2 border-slate-500"
                              )}>
                                {selectedStoryIds.has(story.id) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">{story.title}</span>
                                  {story.difficulty && (
                                    <span className={cn(
                                      "text-xs px-2 py-0.5 rounded",
                                      story.difficulty === 'easy' ? "bg-green-500/20 text-green-400" :
                                      story.difficulty === 'medium' ? "bg-amber-500/20 text-amber-400" :
                                      "bg-red-500/20 text-red-400"
                                    )}>
                                      {story.difficulty}
                                    </span>
                                  )}
                                </div>
                                {story.subtitle && (
                                  <span className="text-sm text-slate-400">{story.subtitle}</span>
                                )}
                              </div>
                              {story.estimatedMinutes && (
                                <span className="text-xs text-slate-500">{story.estimatedMinutes} min</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Already Published Stories */}
                    {preview.stories.published.length > 0 && (
                      <div>
                        <span className="text-sm text-slate-500 font-medium block mb-2">
                          Already Published ({preview.stories.published.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {preview.stories.published.slice(0, 10).map(story => (
                            <span 
                              key={story.id}
                              className="px-3 py-1.5 bg-slate-700/50 text-slate-400 rounded-lg text-sm"
                            >
                              {story.title}
                            </span>
                          ))}
                          {preview.stories.published.length > 10 && (
                            <span className="px-3 py-1.5 text-slate-500 text-sm">
                              +{preview.stories.published.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* No stories case */}
                    {preview.stories.drafts.length === 0 && preview.stories.published.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No stories for HSK {selectedHsk}
                      </p>
                    )}
                  </div>
                )}

                {/* Vocabulary Selection Section */}
                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Vocabulary to Ship</h3>
                        <p className="text-xs text-slate-500">Select which vocab to include</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVocabPanel(!showVocabPanel)}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      {showVocabPanel ? 'Hide' : 'Show'} Selection
                    </Button>
                  </div>
                  
                  {/* Quality Gate Explanation */}
                  <div className="bg-slate-700/20 rounded-lg p-3 mb-4 border border-slate-600/50">
                    <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                      <span className="text-lg">🛡️</span>
                      <span className="font-medium">Quality Gate Active</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Only vocab with <span className="text-emerald-400">audio</span> + <span className="text-emerald-400">example sentence</span> + <span className="text-emerald-400">category</span> will ship to the app.
                    </p>
                  </div>

                  {/* Stats Row - Clearer breakdown */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Left: In Lessons breakdown */}
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Found in Lessons</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-blue-400">{preview.vocabulary.inLessons}</span>
                        <span className="text-sm text-slate-500">vocab items</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-400">✓ Ready to ship</span>
                          <span className="font-medium text-emerald-400">
                            {Math.min(preview.vocabulary.complete ?? preview.vocabulary.withAudio, preview.vocabulary.inLessons)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-400">✗ Blocked (incomplete)</span>
                          <span className="font-medium text-red-400">
                            {Math.max(0, preview.vocabulary.inLessons - (preview.vocabulary.complete ?? preview.vocabulary.withAudio))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Will Ship */}
                    <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                      <div className="text-xs text-emerald-400 uppercase tracking-wide mb-2">Will Ship to App</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-emerald-400">
                          {Math.min(preview.vocabulary.complete ?? preview.vocabulary.withAudio, preview.vocabulary.inLessons)}
                        </span>
                        <span className="text-sm text-emerald-300/70">vocab items</span>
                      </div>
                      <div className="mt-3 text-xs text-emerald-300/70">
                        ✓ Has audio<br/>
                        ✓ Has example sentence<br/>
                        ✓ Has category
                      </div>
                    </div>
                  </div>

                  {/* HSK Total (less prominent) */}
                  <div className="flex justify-between text-xs text-slate-500 mb-4 px-1">
                    <span>Total HSK {selectedHsk} vocab in database: {preview.vocabulary.total}</span>
                    <span>Missing audio: {preview.vocabulary.missingAudio}</span>
                  </div>
                  
                  {/* Mode Selector */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setVocabMode('lessons_only')}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        vocabMode === 'lessons_only'
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50"
                      )}
                    >
                      Lesson Vocab Only ({preview.vocabulary.inLessons})
                    </button>
                    <button
                      onClick={() => setVocabMode('all')}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        vocabMode === 'all'
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                          : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50"
                      )}
                    >
                      All HSK {selectedHsk} ({preview.vocabulary.total})
                    </button>
                    <button
                      onClick={() => setVocabMode('selected')}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        vocabMode === 'selected'
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50"
                      )}
                    >
                      Custom ({selectedVocabIds.size})
                    </button>
                  </div>
                  
                  {/* Expanded Vocab Selection Panel */}
                  {showVocabPanel && (
                    <div className="border-t border-slate-700 pt-4">
                      {/* Search and Filter */}
                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            value={vocabSearch}
                            onChange={(e) => setVocabSearch(e.target.value)}
                            placeholder="Search hanzi, pinyin, english..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <select
                          value={vocabFilter}
                          onChange={(e) => setVocabFilter(e.target.value as typeof vocabFilter)}
                          className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="all">All</option>
                          <option value="in_lessons">In Lessons</option>
                          <option value="not_in_lessons">Not in Lessons</option>
                          <option value="no_audio">Missing Audio</option>
                        </select>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex gap-2 mb-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAllVocab}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          Select All ({preview.vocabulary.total})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectLessonVocab}
                          className="text-xs text-emerald-400 hover:text-emerald-300"
                        >
                          Lesson Vocab ({preview.vocabulary.inLessons})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearVocabSelection}
                          className="text-xs text-slate-400 hover:text-slate-300"
                        >
                          Clear
                        </Button>
                      </div>
                      
                      {/* Vocab List */}
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50">
                        {filteredVocab.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-sm">
                            No vocabulary matches your search
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-700/50">
                            {filteredVocab.map(vocab => {
                              const isSelected = vocabMode === 'all' || 
                                (vocabMode === 'lessons_only' && vocab.usedInLesson) ||
                                (vocabMode === 'selected' && selectedVocabIds.has(vocab.id));
                              
                              return (
                                <button
                                  key={vocab.id}
                                  onClick={() => toggleVocab(vocab.id)}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-3 text-left transition-colors",
                                    isSelected ? "bg-indigo-500/10" : "hover:bg-slate-700/30"
                                  )}
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                                    isSelected ? "bg-indigo-500 text-white" : "bg-slate-600"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-white">{vocab.hanzi}</span>
                                      <span className="text-slate-400 text-sm">{vocab.pinyin}</span>
                                      {vocab.usedInLesson && (
                                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                                          lesson
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">{vocab.english}</div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {vocab.hasAudio ? (
                                      <Volume2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <VolumeX className="w-4 h-4 text-slate-600" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 text-right">
                        Showing {filteredVocab.length} of {preview.vocabulary.total} words
                      </div>
                    </div>
                  )}
                  
                  {/* Selection Summary */}
                  <div className="mt-4 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-indigo-300">Will ship:</span>
                      <span className="font-semibold text-indigo-400">
                        {vocabToShipCount} vocabulary words
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: Ship Panel */}
          <div className="space-y-6">
            {/* Ship Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl p-6 border border-slate-700 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Ship to Mobile</h3>
                  <p className="text-xs text-slate-400">HSK {selectedHsk}</p>
                </div>
              </div>

              {/* Selection Summary */}
              <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Lessons</span>
                  <span className="font-semibold text-white">{selectedLessonIds.size} selected</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Stories</span>
                  <span className="font-semibold text-purple-400">{selectedStoryIds.size} selected</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">Vocabulary</span>
                  <span className="font-semibold text-indigo-400">{vocabToShipCount} words</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs text-slate-400 hover:text-slate-300"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Version */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Version</label>
                <input
                  type="text"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  placeholder={preview?.suggestedVersion || '1.0.0'}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {preview?.suggestedVersion && (
                  <p className="text-xs text-slate-500 mt-1">
                    Suggested: v{preview.suggestedVersion}
                  </p>
                )}
              </div>

              {/* Release Notes */}
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">Release Notes (optional)</label>
                <textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="What's in this release?"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Ship Button */}
              <Button
                onClick={handleShip}
                disabled={shipping || (selectedLessonIds.size === 0 && selectedStoryIds.size === 0)}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3"
              >
                {shipping ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Shipping...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    Ship v{customVersion || preview?.suggestedVersion || '1.0.0'}
                  </>
                )}
              </Button>

              {selectedLessonIds.size === 0 && selectedStoryIds.size === 0 && (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  Select lessons or stories to ship
                </p>
              )}

              {/* Generate Bundle Button */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <p className="text-xs text-gray-400 mb-2">
                  📦 Generate offline bundle for mobile app
                </p>
                <Button
                  onClick={handleGenerateBundle}
                  disabled={generatingBundle || !preview?.currentLive?.lessonCount}
                  variant="outline"
                  className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                >
                  {generatingBundle ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Bundle...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Generate Bundle v{customVersion || preview?.suggestedVersion || '1.0.0'}
                    </>
                  )}
                </Button>
                {!preview?.currentLive?.lessonCount && (
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Ship lessons first to generate bundle
                  </p>
                )}
              </div>

              {/* Debug & Sync Vocabulary */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex gap-2 mb-2">
                  <Button
                    onClick={handleDebugVocab}
                    disabled={loadingDebug}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    {loadingDebug ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Debug
                  </Button>
                  <Button
                    onClick={handleForceSync}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Force Sync
                  </Button>
                </div>

                {/* Sync Result */}
                {syncResult && (
                  <div className="mb-3 p-2 bg-green-500/10 rounded border border-green-500/30 text-xs font-mono">
                    <p className="text-green-400 font-bold mb-1">Sync Result:</p>
                    <p className="text-gray-300">Synced: {syncResult.lessonsSynced} lessons</p>
                    <p className="text-gray-300">Total vocab matched: {syncResult.totalVocabMatched}</p>
                    {syncResult.verification && (
                      <div className="mt-2 border-t border-green-500/20 pt-2">
                        <p className="text-green-400 font-bold">Verification:</p>
                        {syncResult.verification.map((l: any) => (
                          <p key={l.id} className="text-gray-300">
                            {l.title}: {l.vocabCount} vocab IDs
                          </p>
                        ))}
                      </div>
                    )}
                    {syncResult.errors?.length > 0 && (
                      <p className="text-red-400 mt-1">Errors: {syncResult.errors.join(', ')}</p>
                    )}
                  </div>
                )}
                
                {debugData && (
                  <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-xs font-mono max-h-96 overflow-y-auto">
                    <div className="text-yellow-400 mb-2 font-bold">
                      Debug Results for HSK {debugData.hskLevel}
                    </div>
                    
                    {/* Summary */}
                    <div className="text-gray-300 space-y-1 mb-3">
                      <p>📚 Lessons: {debugData.lessonCount}</p>
                      <p>📖 Vocab in DB (HSK {debugData.hskLevel}): {debugData.vocabInHskLevel}</p>
                      <p>🔤 Sample DB vocab: {debugData.vocabSample?.slice(0, 8).join(', ')}</p>
                    </div>

                    {/* Matching Summary - THE KEY INFO */}
                    {debugData.matchingSummary && (
                      <div className="mb-3 p-2 bg-slate-800 rounded border border-slate-600">
                        <p className="text-white font-bold mb-1">🎯 Matching Summary:</p>
                        <p className="text-gray-300">Total extracted: {debugData.matchingSummary.totalExtracted}</p>
                        <p className={debugData.matchingSummary.foundCount > 0 ? "text-green-400" : "text-red-400"}>
                          ✅ Found in vocab: {debugData.matchingSummary.foundCount}
                        </p>
                        <p className={debugData.matchingSummary.notFoundCount > 0 ? "text-red-400" : "text-green-400"}>
                          ❌ NOT in vocab: {debugData.matchingSummary.notFoundCount}
                        </p>
                        {debugData.matchingSummary.wrongHskLevel?.length > 0 && (
                          <p className="text-orange-400">
                            ⚠️ Wrong HSK level: {debugData.matchingSummary.wrongHskLevel.length}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Not Found Words */}
                    {debugData.notFoundInVocab?.length > 0 && (
                      <div className="mb-3 p-2 bg-red-500/10 rounded border border-red-500/30">
                        <p className="text-red-400 font-bold">❌ Words NOT in vocabulary DB:</p>
                        <p className="text-red-300">{debugData.notFoundInVocab.join(', ')}</p>
                      </div>
                    )}

                    {/* Found Words */}
                    {debugData.foundInVocab?.length > 0 && (
                      <div className="mb-3 p-2 bg-green-500/10 rounded border border-green-500/30">
                        <p className="text-green-400 font-bold">✅ Found in vocab:</p>
                        <p className="text-green-300">{debugData.foundInVocab.slice(0, 15).join(', ')}</p>
                      </div>
                    )}

                    {/* Wrong HSK Level */}
                    {debugData.matchingSummary?.wrongHskLevel?.length > 0 && (
                      <div className="mb-3 p-2 bg-orange-500/10 rounded border border-orange-500/30">
                        <p className="text-orange-400 font-bold">⚠️ At wrong HSK level:</p>
                        <p className="text-orange-300">{debugData.matchingSummary.wrongHskLevel.join(', ')}</p>
                      </div>
                    )}

                    {/* Per Lesson Details (collapsed) */}
                    <details className="mt-3 border-t border-yellow-500/20 pt-2">
                      <summary className="text-yellow-400 font-bold cursor-pointer">Per Lesson Details</summary>
                      {debugData.lessons?.map(lesson => (
                        <div key={lesson.lessonId} className="text-gray-300 mb-2 pl-2 border-l-2 border-yellow-500/30 mt-2">
                          <p className="font-bold">L{lesson.lessonNumber}: {lesson.title}</p>
                          <p>Blocks: {lesson.blockCount}</p>
                          <p>Extracted: [{lesson.extractedHanzi?.slice(0, 8).join(', ')}]</p>
                        </div>
                      ))}
                    </details>
                  </div>
                )}
              </div>
            </div>

            {/* Release History */}
            {showHistory && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-white">Release History</h3>
                </div>
                
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                  </div>
                ) : releases.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">
                    No releases yet for HSK {selectedHsk}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {releases.slice(0, 5).map((release, idx) => (
                      <div 
                        key={release.id}
                        className={cn(
                          "p-3 rounded-xl",
                          idx === 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-700/30"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "font-semibold",
                            idx === 0 ? "text-emerald-400" : "text-white"
                          )}>
                            v{release.version}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(release.releasedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-400">
                          {release.lessonsAdded > 0 && (
                            <span className="text-emerald-400">+{release.lessonsAdded} new</span>
                          )}
                          {release.lessonsUpdated > 0 && (
                            <span className="text-amber-400">~{release.lessonsUpdated} updated</span>
                          )}
                        </div>
                        {release.releaseNotes && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                            {release.releaseNotes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LESSON SECTION COMPONENT
// ═══════════════════════════════════════════════════════════

interface LessonSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'emerald' | 'amber' | 'slate' | 'orange';
  lessons: LessonPreview[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

function LessonSection({ title, subtitle, icon, color, lessons, selectedIds, onToggle }: LessonSectionProps) {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: 'bg-emerald-500/20 text-emerald-400',
      text: 'text-emerald-400',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: 'bg-amber-500/20 text-amber-400',
      text: 'text-amber-400',
    },
    orange: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      icon: 'bg-orange-500/20 text-orange-400',
      text: 'text-orange-400',
    },
    slate: {
      bg: 'bg-slate-700/30',
      border: 'border-slate-700',
      icon: 'bg-slate-700 text-slate-400',
      text: 'text-slate-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={cn("rounded-2xl p-6 border", classes.bg, classes.border)}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg", classes.icon)}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className={cn("ml-auto text-sm font-medium", classes.text)}>
          {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {lessons.map(lesson => {
          const isSelected = selectedIds.has(lesson.id);
          
          return (
            <button
              key={lesson.id}
              onClick={() => onToggle(lesson.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                isSelected 
                  ? "bg-white/10 border border-white/20" 
                  : "bg-slate-700/30 border border-transparent hover:border-slate-600"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                isSelected 
                  ? "bg-emerald-500 text-white" 
                  : "bg-slate-600 text-slate-400"
              )}>
                {isSelected ? <Check className="w-4 h-4" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">L{lesson.lessonNumber}</span>
                  <span className="font-medium text-white truncate">{lesson.title}</span>
                </div>
                {lesson.vocabCount !== undefined && (
                  <span className="text-xs text-slate-500">{lesson.vocabCount} vocab</span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ReleaseManager;

