/**
 * SeriesManagerModal Component
 * Manage story series (multi-part collections)
 * Create, edit, delete series and reorder stories within them
 */

import { useState, useEffect } from 'react';
import { X, Plus, GripVertical, Trash2, Edit2, BookOpen, ChevronRight, Palette, Check, Upload, FileJson, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/hooks/useToast';
import {
  getStorySeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
  reorderSeriesStories,
  removeStoryFromSeries,
  uploadSeriesCover,
  deleteSeriesCover,
  type StorySeries,
  type SeriesWithStories,
  type CreateSeriesInput,
  type SeriesImportData,
} from '@/services/storiesAPI';
import { ThumbnailUploader, Thumbnail } from './ThumbnailUploader';

interface SeriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeriesChange?: () => void;
}

// Color presets for series
const COLOR_PRESETS = [
  '#4F46E5', // Indigo
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#EF4444', // Red
  '#6366F1', // Violet
];

export function SeriesManagerModal({ isOpen, onClose, onSeriesChange }: SeriesManagerModalProps) {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<StorySeries[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<SeriesWithStories | null>(null);
  const [editMode, setEditMode] = useState<'list' | 'create' | 'edit' | 'import'>('list');
  const [formData, setFormData] = useState<CreateSeriesInput>({
    title: '',
    description: '',
    color: '#4F46E5',
    hskLevel: undefined,
    isPublished: false,
  });
  const [saving, setSaving] = useState(false);
  
  // JSON import state
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedImport, setParsedImport] = useState<SeriesImportData | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSeries();
    }
  }, [isOpen]);

  async function loadSeries() {
    try {
      setLoading(true);
      const data = await getStorySeries();
      setSeries(data.series);
    } catch (err) {
      toast.error('Failed to load series', String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadSeriesDetails(id: string) {
    try {
      setLoading(true);
      const data = await getSeriesById(id);
      setSelectedSeries(data);
    } catch (err) {
      toast.error('Failed to load series', String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSeries() {
    if (!formData.title.trim()) {
      toast.error('Title required', 'Please enter a series title');
      return;
    }

    try {
      setSaving(true);
      await createSeries(formData);
      toast.success('Series created!');
      setEditMode('list');
      setFormData({ title: '', description: '', color: '#4F46E5', isPublished: false });
      loadSeries();
      onSeriesChange?.();
    } catch (err) {
      toast.error('Failed to create series', String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSeries() {
    if (!selectedSeries) return;

    try {
      setSaving(true);
      await updateSeries(selectedSeries.id, formData);
      toast.success('Series updated!');
      setEditMode('list');
      loadSeries();
      onSeriesChange?.();
    } catch (err) {
      toast.error('Failed to update series', String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSeries(id: string) {
    const confirmed = await confirm({
      title: 'Delete Series?',
      description: 'Stories in this series will become standalone. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await deleteSeries(id);
      toast.success('Series deleted');
      if (selectedSeries?.id === id) {
        setSelectedSeries(null);
      }
      loadSeries();
      onSeriesChange?.();
    } catch (err) {
      toast.error('Failed to delete series', String(err));
    }
  }

  async function handleRemoveStory(storyId: string) {
    if (!selectedSeries) return;

    try {
      await removeStoryFromSeries(selectedSeries.id, storyId);
      toast.success('Story removed from series');
      loadSeriesDetails(selectedSeries.id);
      onSeriesChange?.();
    } catch (err) {
      toast.error('Failed to remove story', String(err));
    }
  }

  async function handleReorderStories(storyIds: string[]) {
    if (!selectedSeries) return;

    try {
      await reorderSeriesStories(selectedSeries.id, storyIds);
      loadSeriesDetails(selectedSeries.id);
    } catch (err) {
      toast.error('Failed to reorder', String(err));
    }
  }

  function moveStory(index: number, direction: 'up' | 'down') {
    if (!selectedSeries) return;
    const stories = [...selectedSeries.stories];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stories.length) return;
    
    [stories[index], stories[newIndex]] = [stories[newIndex], stories[index]];
    handleReorderStories(stories.map(s => s.id));
  }

  // JSON Import handlers
  function handleJsonChange(value: string) {
    setJsonInput(value);
    setJsonError(null);
    setParsedImport(null);
    
    if (!value.trim()) return;
    
    try {
      const parsed = JSON.parse(value) as SeriesImportData;
      
      // Validate required fields
      if (!parsed.title) {
        setJsonError('Missing required field: title');
        return;
      }
      
      setParsedImport(parsed);
    } catch (err) {
      setJsonError(`Invalid JSON: ${(err as Error).message}`);
    }
  }

  function applyImportToForm() {
    if (!parsedImport) return;
    
    // Build description from titleEn and description
    let description = parsedImport.description || '';
    if (parsedImport.titleEn && !description.includes(parsedImport.titleEn)) {
      description = parsedImport.titleEn + (description ? ' — ' + description : '');
    }
    
    setFormData({
      title: parsedImport.title,
      description,
      color: '#4F46E5', // Default, user can change
      hskLevel: parsedImport.hskLevel,
      isPublished: false,
      accessTier: parsedImport.accessTier,
      tags: parsedImport.tags,
      metadata: {
        titleEn: parsedImport.titleEn,
        characters: parsedImport.characters,
        parts: parsedImport.parts,
        author: parsedImport.author,
        difficulty: parsedImport.difficulty,
        totalParts: parsedImport.totalParts,
        estimatedTotalMinutes: parsedImport.estimatedTotalMinutes,
      },
    });
    
    setEditMode('create');
    setJsonInput('');
    setParsedImport(null);
    toast.success('JSON imported! Review and create the series.');
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Story Series</h2>
                <p className="text-sm text-gray-500">Organize stories into multi-part collections</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
              </div>
            ) : editMode === 'import' ? (
              /* JSON Import Mode */
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileJson className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Import from JSON</h3>
                    <p className="text-sm text-gray-500">Paste a _series.json from content-planner</p>
                  </div>
                </div>
                
                <div>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder={`{
  "title": "小明的一天",
  "titleEn": "Xiaoming's Day",
  "description": "Follow Xiaoming through a typical day...",
  "hskLevel": 1,
  "characters": [...],
  "parts": [...]
}`}
                    rows={12}
                    className={`w-full px-4 py-3 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      jsonError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                </div>
                
                {jsonError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {jsonError}
                  </div>
                )}
                
                {parsedImport && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <Check className="w-4 h-4" />
                      Valid JSON detected
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Title:</span>{' '}
                        <span className="font-medium">{parsedImport.title}</span>
                      </div>
                      {parsedImport.titleEn && (
                        <div>
                          <span className="text-gray-500">English:</span>{' '}
                          <span className="font-medium">{parsedImport.titleEn}</span>
                        </div>
                      )}
                      {parsedImport.hskLevel && (
                        <div>
                          <span className="text-gray-500">HSK Level:</span>{' '}
                          <span className="font-medium">HSK {parsedImport.hskLevel}</span>
                        </div>
                      )}
                      {parsedImport.parts && (
                        <div>
                          <span className="text-gray-500">Parts:</span>{' '}
                          <span className="font-medium">{parsedImport.parts.length} stories</span>
                        </div>
                      )}
                      {parsedImport.characters && (
                        <div>
                          <span className="text-gray-500">Characters:</span>{' '}
                          <span className="font-medium">{parsedImport.characters.length} defined</span>
                        </div>
                      )}
                      {parsedImport.tags && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Tags:</span>{' '}
                          <span className="font-medium">{parsedImport.tags.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    
                    <Button onClick={applyImportToForm} className="w-full mt-3">
                      <Upload className="w-4 h-4 mr-2" />
                      Import & Continue to Form
                    </Button>
                  </div>
                )}
              </div>
            ) : editMode === 'create' || editMode === 'edit' ? (
              /* Create/Edit Form */
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Journey to the West"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A brief description of this series..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg transition-transform ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {formData.color === color && (
                          <Check className="w-5 h-5 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                    <div className="relative">
                      <Palette className="w-5 h-5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer opacity-0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">HSK Level (optional)</label>
                  <select
                    value={formData.hskLevel || ''}
                    onChange={(e) => setFormData({ ...formData, hskLevel: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Any level</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                      <option key={l} value={l}>HSK {l}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="isPublished" className="text-sm text-gray-700">
                    Published (visible in mobile app)
                  </label>
                </div>

                {/* Cover Image (only in edit mode) */}
                {editMode === 'edit' && selectedSeries && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image
                      <span className="text-gray-400 font-normal ml-2">(optional)</span>
                    </label>
                    <div className="flex items-start gap-4">
                      <ThumbnailUploader
                        currentR2Key={selectedSeries.coverImageR2Key}
                        fallbackColor={formData.color}
                        fallbackIcon={<BookOpen className="w-10 h-10 text-white/70" />}
                        onUpload={async (file) => {
                          const r2Key = await uploadSeriesCover(selectedSeries.id, file);
                          setSelectedSeries({ ...selectedSeries, coverImageR2Key: r2Key });
                          toast.success('Cover uploaded!');
                          return r2Key;
                        }}
                        onDelete={async () => {
                          await deleteSeriesCover(selectedSeries.id);
                          setSelectedSeries({ ...selectedSeries, coverImageR2Key: null });
                          toast.success('Cover removed');
                        }}
                        size="lg"
                      />
                      <div className="text-sm text-gray-500">
                        <p>PNG, JPEG, or WebP</p>
                        <p>Max 5MB, square recommended</p>
                        <p className="mt-2 text-gray-400">Falls back to color if no image</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview (create mode or fallback) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editMode === 'create' ? 'Preview' : 'Color Fallback Preview'}
                  </label>
                  <div
                    className="w-40 h-40 rounded-xl p-4 flex flex-col justify-end relative overflow-hidden"
                    style={{ backgroundColor: formData.color }}
                  >
                    <div className="absolute top-[-30px] right-[-30px] w-[100px] h-[100px] rounded-full bg-white/15" />
                    <BookOpen className="w-6 h-6 text-white/90 mb-3" />
                    <div className="text-white font-bold text-lg">{formData.title || 'Series Title'}</div>
                    <div className="text-white/80 text-sm">{selectedSeries?.storyCount || 0} Stories</div>
                  </div>
                  {editMode === 'create' && (
                    <p className="text-xs text-gray-400 mt-2">
                      You can add a cover image after creating the series
                    </p>
                  )}
                </div>
              </div>
            ) : selectedSeries ? (
              /* Series Detail View */
              <div className="p-6">
                <button
                  onClick={() => setSelectedSeries(null)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
                >
                  ← Back to all series
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <Thumbnail
                      r2Key={selectedSeries.coverImageR2Key}
                      fallbackColor={selectedSeries.color}
                      fallbackIcon={<BookOpen className="w-8 h-8 text-white" />}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{selectedSeries.title}</h3>
                    <p className="text-gray-500">{selectedSeries.storyCount} stories</p>
                  </div>
                  <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        title: selectedSeries.title,
                        description: selectedSeries.description,
                        color: selectedSeries.color,
                        hskLevel: selectedSeries.hskLevel,
                        isPublished: selectedSeries.isPublished,
                      });
                      setEditMode('edit');
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSeries(selectedSeries.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                {selectedSeries.stories.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No stories in this series yet.</p>
                    <p className="text-sm">Add stories from the story editor.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-3">Drag to reorder stories in this series:</p>
                    {selectedSeries.stories.map((story, index) => (
                      <div
                        key={story.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveStory(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveStory(index, 'down')}
                            disabled={index === selectedSeries.stories.length - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-medium text-sm">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{story.title}</div>
                          <div className="text-sm text-gray-500">HSK {story.hskLevel}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveStory(story.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Series List View */
              <div className="p-6">
                {series.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No series yet</h3>
                    <p className="text-gray-500 mb-6">Create your first series to organize stories</p>
                    <Button onClick={() => setEditMode('create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Series
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {series.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          <Thumbnail
                            r2Key={s.coverImageR2Key}
                            fallbackColor={s.color}
                            fallbackIcon={<BookOpen className="w-7 h-7 text-white" />}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 truncate">{s.title}</h4>
                            {s.isPublished ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Published</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">Draft</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{s.storyCount} stories</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSeries(s.id);
                            }}
                            className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        <button
                          onClick={() => loadSeriesDetails(s.id)}
                          className="p-2 hover:bg-gray-200 rounded-lg"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            {editMode === 'list' && !selectedSeries && series.length > 0 && (
              <div className="flex gap-2">
              <Button onClick={() => setEditMode('create')}>
                <Plus className="w-4 h-4 mr-2" />
                New Series
              </Button>
                <Button variant="outline" onClick={() => {
                  setEditMode('import');
                  setJsonInput('');
                  setJsonError(null);
                  setParsedImport(null);
                }}>
                  <FileJson className="w-4 h-4 mr-2" />
                  Import JSON
                </Button>
              </div>
            )}
            {editMode === 'list' && selectedSeries && (
              <div />
            )}
            {editMode === 'import' && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode('list');
                  setJsonInput('');
                  setJsonError(null);
                  setParsedImport(null);
                }}
              >
                Cancel
              </Button>
            )}
            {(editMode === 'create' || editMode === 'edit') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode('list');
                    setFormData({ title: '', description: '', color: '#4F46E5', isPublished: false });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editMode === 'create' ? handleCreateSeries : handleUpdateSeries}
                  disabled={saving || !formData.title.trim()}
                >
                  {saving ? 'Saving...' : editMode === 'create' ? 'Create Series' : 'Save Changes'}
                </Button>
              </>
            )}
            {editMode === 'list' && !selectedSeries && series.length === 0 && (
              <div className="flex gap-2">
                <Button onClick={() => setEditMode('create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Series
                </Button>
                <Button variant="outline" onClick={() => {
                  setEditMode('import');
                  setJsonInput('');
                  setJsonError(null);
                  setParsedImport(null);
                }}>
                  <FileJson className="w-4 h-4 mr-2" />
                  Import JSON
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
      {ConfirmDialogComponent}
    </>
  );
}

