/**
 * CategoryManagerModal Component
 * Manage story categories for the mobile app home screen
 * Create, edit, delete, and reorder display sections
 */

import { useState, useEffect } from 'react';
import { X, Plus, GripVertical, Trash2, Edit2, LayoutGrid, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/hooks/useToast';
import {
  getStoryCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  type StoryCategory,
  type CreateCategoryInput,
  type CategoryDisplayType,
  type CategoryFilterType,
} from '@/services/storiesAPI';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

const DISPLAY_TYPES: { value: CategoryDisplayType; label: string; icon: string }[] = [
  { value: 'horizontal', label: 'Horizontal Scroll', icon: '→' },
  { value: 'grid', label: 'Grid', icon: '⊞' },
  { value: 'featured', label: 'Featured Banner', icon: '★' },
  { value: 'series', label: 'Series Carousel', icon: '📚' },
];

const FILTER_TYPES: { value: CategoryFilterType; label: string; description: string }[] = [
  { value: 'recent', label: 'Recently Added', description: 'Auto: newest stories first' },
  { value: 'popular', label: 'Popular', description: 'Auto: most viewed stories' },
  { value: 'manual', label: 'Manual Selection', description: 'You choose specific stories' },
  { value: 'hsk', label: 'By HSK Level', description: 'Auto: filter by HSK level' },
  { value: 'series', label: 'Show Series', description: 'Display story series carousel' },
];

export function CategoryManagerModal({ isOpen, onClose, onCategoryChange }: CategoryManagerModalProps) {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoryCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<StoryCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateCategoryInput>({
    title: '',
    slug: '',
    displayType: 'horizontal',
    filterType: 'recent',
    isPublished: true,
    seeAllEnabled: true,
    maxItems: 10,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await getStoryCategories();
      setCategories(data.categories);
    } catch (err) {
      toast.error('Failed to load categories', String(err));
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function handleCreate() {
    if (!formData.title.trim()) {
      toast.error('Title required');
      return;
    }

    const slug = formData.slug || generateSlug(formData.title);

    try {
      setSaving(true);
      await createCategory({ ...formData, slug });
      toast.success('Category created!');
      setIsCreating(false);
      resetForm();
      loadCategories();
      onCategoryChange?.();
    } catch (err) {
      toast.error('Failed to create category', String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingCategory) return;

    try {
      setSaving(true);
      await updateCategory(editingCategory.id, formData);
      toast.success('Category updated!');
      setEditingCategory(null);
      resetForm();
      loadCategories();
      onCategoryChange?.();
    } catch (err) {
      toast.error('Failed to update category', String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete Category?',
      description: 'This category will be removed from the mobile app. Stories will not be affected.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await deleteCategory(id);
      toast.success('Category deleted');
      loadCategories();
      onCategoryChange?.();
    } catch (err) {
      toast.error('Failed to delete category', String(err));
    }
  }

  async function handleTogglePublished(category: StoryCategory) {
    try {
      await updateCategory(category.id, { isPublished: !category.isPublished });
      loadCategories();
      onCategoryChange?.();
    } catch (err) {
      toast.error('Failed to update', String(err));
    }
  }

  async function handleSaveOrder() {
    try {
      setSaving(true);
      await reorderCategories(categories.map(c => c.id));
      toast.success('Order saved!');
      setHasChanges(false);
      onCategoryChange?.();
    } catch (err) {
      toast.error('Failed to save order', String(err));
    } finally {
      setSaving(false);
    }
  }

  function moveCategory(index: number, direction: 'up' | 'down') {
    const newCategories = [...categories];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newCategories.length) return;
    
    [newCategories[index], newCategories[newIndex]] = [newCategories[newIndex], newCategories[index]];
    setCategories(newCategories);
    setHasChanges(true);
  }

  function resetForm() {
    setFormData({
      title: '',
      slug: '',
      displayType: 'horizontal',
      filterType: 'recent',
      isPublished: true,
      seeAllEnabled: true,
      maxItems: 10,
    });
  }

  function startEditing(category: StoryCategory) {
    setEditingCategory(category);
    setFormData({
      title: category.title,
      slug: category.slug,
      description: category.description,
      displayType: category.displayType,
      filterType: category.filterType,
      isPublished: category.isPublished,
      seeAllEnabled: category.seeAllEnabled,
      maxItems: category.maxItems,
    });
  }

  if (!isOpen) return null;

  const showForm = isCreating || editingCategory;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Home Screen Categories</h2>
                <p className="text-sm text-gray-500">Manage story sections in the mobile app</p>
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
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : showForm ? (
              /* Create/Edit Form */
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        title: e.target.value,
                        slug: isCreating ? generateSlug(e.target.value) : formData.slug,
                      });
                    }}
                    placeholder="e.g., New Arrivals"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {isCreating && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slug (URL-friendly)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="new-arrivals"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DISPLAY_TYPES.map((dt) => (
                      <button
                        key={dt.value}
                        onClick={() => setFormData({ ...formData, displayType: dt.value })}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          formData.displayType === dt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg mr-2">{dt.icon}</span>
                        <span className="font-medium">{dt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Filter</label>
                  <div className="space-y-2">
                    {FILTER_TYPES.map((ft) => (
                      <button
                        key={ft.value}
                        onClick={() => setFormData({ ...formData, filterType: ft.value })}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          formData.filterType === ft.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{ft.label}</div>
                        <div className="text-sm text-gray-500">{ft.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Items</label>
                  <input
                    type="number"
                    value={formData.maxItems}
                    onChange={(e) => setFormData({ ...formData, maxItems: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={50}
                    className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Published</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.seeAllEnabled}
                      onChange={(e) => setFormData({ ...formData, seeAllEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Show "See All" button</span>
                  </label>
                </div>
              </div>
            ) : (
              /* Category List */
              <div className="p-6">
                {hasChanges && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                    <span className="text-amber-700 text-sm">You have unsaved order changes</span>
                    <Button size="sm" onClick={handleSaveOrder} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Order
                    </Button>
                  </div>
                )}

                {categories.length === 0 ? (
                  <div className="text-center py-12">
                    <LayoutGrid className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
                    <p className="text-gray-500 mb-6">Create your first category</p>
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Category
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-3">
                      Categories appear in this order on the mobile app home screen:
                    </p>
                    {categories.map((cat, index) => (
                      <div
                        key={cat.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          cat.isPublished ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveCategory(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveCategory(index, 'down')}
                            disabled={index === categories.length - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-medium text-sm">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 truncate">{cat.title}</h4>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {cat.filterType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {cat.displayType} • {cat.maxItems} items
                          </p>
                        </div>
                        <button
                          onClick={() => handleTogglePublished(cat)}
                          className={`p-2 rounded-lg ${
                            cat.isPublished ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={cat.isPublished ? 'Published' : 'Hidden'}
                        >
                          {cat.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            {showForm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={isCreating ? handleCreate : handleUpdate}
                  disabled={saving || !formData.title.trim()}
                >
                  {saving ? 'Saving...' : isCreating ? 'Create Category' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                {categories.length > 0 && (
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Category
                  </Button>
                )}
                {categories.length === 0 && <div />}
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {ConfirmDialogComponent}
    </>
  );
}

