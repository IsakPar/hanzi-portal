/**
 * Showcase Editor Page
 * 
 * Manage the configurable sections for the mobile story home screen.
 * Supports: new releases, popular, series, by HSK level, curated lists.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Edit2, 
  Eye, 
  EyeOff, 
  Save, 
  X,
  Sparkles,
  TrendingUp,
  BookText,
  Star,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import api from '@/services/api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ShowcaseSection {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  sectionType: string;
  config: Record<string, unknown> | null;
  curatedStoryIds: string[] | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SectionFormData {
  title: string;
  subtitle: string;
  icon: string;
  sectionType: string;
  config: {
    limit?: number;
    hskLevel?: number;
    sortBy?: string;
  };
  curatedStoryIds: string[];
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const SECTION_TYPES = [
  { value: 'new_releases', label: 'New Releases', icon: Sparkles, description: 'Latest published stories' },
  { value: 'popular', label: 'Most Popular', icon: TrendingUp, description: 'Stories with most completions' },
  { value: 'series', label: 'Story Series', icon: BookText, description: 'Multi-part story collections' },
  { value: 'by_hsk', label: 'By HSK Level', icon: Star, description: 'Stories for a specific HSK level' },
  { value: 'curated', label: 'Curated List', icon: Clock, description: 'Hand-picked stories' },
];

const DEFAULT_FORM: SectionFormData = {
  title: '',
  subtitle: '',
  icon: '✨',
  sectionType: 'new_releases',
  config: { limit: 10 },
  curatedStoryIds: [],
  isActive: true,
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ShowcaseEditor() {
  const [sections, setSections] = useState<ShowcaseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<SectionFormData>(DEFAULT_FORM);

  // Load sections
  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ sections: ShowcaseSection[] }>('/v1/control-center/showcase-sections');
      setSections(response.sections);
    } catch (error) {
      toast.error('Failed to load sections', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // Create section
  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Title required', 'Please enter a section title');
      return;
    }

    setSaving(true);
    try {
      await api.post('/v1/control-center/showcase-sections', {
        title: formData.title,
        subtitle: formData.subtitle || null,
        icon: formData.icon || null,
        sectionType: formData.sectionType,
        config: formData.config,
        curatedStoryIds: formData.sectionType === 'curated' ? formData.curatedStoryIds : null,
        isActive: formData.isActive,
      });
      toast.success('Section created', `"${formData.title}" added to showcase`);
      setShowCreateModal(false);
      setFormData(DEFAULT_FORM);
      loadSections();
    } catch (error) {
      toast.error('Failed to create section', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Update section
  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await api.put(`/v1/control-center/showcase-sections/${id}`, {
        title: formData.title,
        subtitle: formData.subtitle || null,
        icon: formData.icon || null,
        sectionType: formData.sectionType,
        config: formData.config,
        curatedStoryIds: formData.sectionType === 'curated' ? formData.curatedStoryIds : null,
        isActive: formData.isActive,
      });
      toast.success('Section updated');
      setEditingId(null);
      loadSections();
    } catch (error) {
      toast.error('Failed to update', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Delete section
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this showcase section?')) return;

    try {
      await api.delete(`/v1/control-center/showcase-sections/${id}`);
      toast.success('Section deleted');
      loadSections();
    } catch (error) {
      toast.error('Failed to delete', (error as Error).message);
    }
  };

  // Toggle visibility
  const toggleVisibility = async (section: ShowcaseSection) => {
    try {
      await api.put(`/v1/control-center/showcase-sections/${section.id}`, {
        isActive: !section.isActive,
      });
      toast.success(section.isActive ? 'Section hidden' : 'Section visible');
      loadSections();
    } catch (error) {
      toast.error('Failed to update', (error as Error).message);
    }
  };

  // Start editing
  const startEditing = (section: ShowcaseSection) => {
    setFormData({
      title: section.title,
      subtitle: section.subtitle || '',
      icon: section.icon || '',
      sectionType: section.sectionType,
      config: (section.config as SectionFormData['config']) || { limit: 10 },
      curatedStoryIds: section.curatedStoryIds || [],
      isActive: section.isActive,
    });
    setEditingId(section.id);
  };

  // Get section type info
  const getSectionTypeInfo = (type: string) => {
    return SECTION_TYPES.find(t => t.value === type) || SECTION_TYPES[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Story Showcase</h1>
                <p className="text-sm text-slate-400">Configure mobile app home sections</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSections}
                disabled={loading}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
              <Button
                onClick={() => {
                  setFormData(DEFAULT_FORM);
                  setShowCreateModal(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Showcase Sections</h2>
            <p className="text-slate-400 mb-6">Create sections to customize the mobile story home screen</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Section
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => {
              const typeInfo = getSectionTypeInfo(section.sectionType);
              const Icon = typeInfo.icon;
              const isEditing = editingId === section.id;

              return (
                <div
                  key={section.id}
                  className={cn(
                    "bg-slate-800/50 rounded-2xl border transition-all",
                    isEditing ? "border-purple-500 ring-2 ring-purple-500/20" : "border-slate-700",
                    !section.isActive && "opacity-50"
                  )}
                >
                  {isEditing ? (
                    <SectionForm
                      formData={formData}
                      setFormData={setFormData}
                      onSave={() => handleUpdate(section.id)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                      isEditing
                    />
                  ) : (
                    <div className="p-5 flex items-center gap-4">
                      {/* Drag Handle */}
                      <GripVertical className="w-5 h-5 text-slate-600 cursor-grab" />
                      
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                        section.isActive ? "bg-purple-500/20" : "bg-slate-700/50"
                      )}>
                        {section.icon || <Icon className="w-6 h-6 text-purple-400" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{section.title}</h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            "bg-slate-700 text-slate-300"
                          )}>
                            {typeInfo.label}
                          </span>
                          {!section.isActive && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                              Hidden
                            </span>
                          )}
                        </div>
                        {section.subtitle && (
                          <p className="text-sm text-slate-400">{section.subtitle}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span>Order: {section.orderIndex}</span>
                          {section.config && (section.config as any).limit && (
                            <span>Limit: {(section.config as any).limit}</span>
                          )}
                          {section.config && (section.config as any).hskLevel && (
                            <span>HSK {(section.config as any).hskLevel}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisibility(section)}
                          className="text-slate-400 hover:text-white"
                        >
                          {section.isActive ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(section)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(section.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">New Showcase Section</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <SectionForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION FORM COMPONENT
// ═══════════════════════════════════════════════════════════

interface SectionFormProps {
  formData: SectionFormData;
  setFormData: React.Dispatch<React.SetStateAction<SectionFormData>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing?: boolean;
}

function SectionForm({ formData, setFormData, onSave, onCancel, saving, isEditing }: SectionFormProps) {
  return (
    <div className="p-5 space-y-4">
      {/* Title & Icon */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Label className="text-slate-300">Icon</Label>
          <Input
            value={formData.icon}
            onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
            placeholder="✨"
            className="text-center text-2xl bg-slate-700 border-slate-600 text-white"
          />
        </div>
        <div className="col-span-3">
          <Label className="text-slate-300">Title</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="New Releases"
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
      </div>

      {/* Subtitle */}
      <div>
        <Label className="text-slate-300">Subtitle (optional)</Label>
        <Input
          value={formData.subtitle}
          onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Fresh stories just added"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {/* Section Type */}
      <div>
        <Label className="text-slate-300">Section Type</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {SECTION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setFormData(prev => ({ ...prev, sectionType: type.value }))}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                  formData.sectionType === type.value
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  formData.sectionType === type.value ? "text-purple-400" : "text-slate-400"
                )} />
                <div>
                  <div className="font-medium text-white text-sm">{type.label}</div>
                  <div className="text-xs text-slate-500">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Config Options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">Limit</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={formData.config.limit || 10}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, limit: parseInt(e.target.value) || 10 }
            }))}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
        {formData.sectionType === 'by_hsk' && (
          <div>
            <Label className="text-slate-300">HSK Level</Label>
            <select
              value={formData.config.hskLevel || 1}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                config: { ...prev.config, hskLevel: parseInt(e.target.value) }
              }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                <option key={level} value={level}>HSK {level}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
          className="w-5 h-5 rounded text-purple-500"
        />
        <span className="text-white">Show this section in the app</span>
      </label>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <Button variant="ghost" onClick={onCancel} className="text-slate-400">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || !formData.title.trim()}
          className="bg-purple-500 hover:bg-purple-600"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update' : 'Create'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ShowcaseEditor;

