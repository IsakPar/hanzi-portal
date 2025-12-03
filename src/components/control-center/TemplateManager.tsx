import { useState, useEffect } from 'react';
import { Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import type { Template } from './types';

interface TemplateManagerProps {
  templates: Template[];
  onClose: () => void;
  onUpdate: () => void;
}

export function TemplateManager({ templates, onClose, onUpdate }: TemplateManagerProps) {
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    icon: '📢',
    description: '',
    defaultSchema: JSON.stringify({
      type: 'modal',
      style: { backgroundColor: '#4F46E5', textColor: '#ffffff' },
      content: { title: 'Title', body: 'Message' },
      primaryCta: { text: 'OK', action: 'dismiss' },
      dismissible: true,
      showOnce: true,
    }, null, 2),
  });

  useEffect(() => {
    if (editing) {
      setFormData({
        name: editing.name,
        icon: editing.icon,
        description: editing.description || '',
        defaultSchema: JSON.stringify(editing.defaultSchema, null, 2),
      });
    } else if (creating) {
      setFormData({
        name: '',
        icon: '📢',
        description: '',
        defaultSchema: JSON.stringify({
          type: 'modal',
          style: { backgroundColor: '#4F46E5', textColor: '#ffffff' },
          content: { title: 'Title', body: 'Message' },
          primaryCta: { text: 'OK', action: 'dismiss' },
          dismissible: true,
          showOnce: true,
        }, null, 2),
      });
    }
  }, [editing, creating]);

  async function handleSave() {
    try {
      JSON.parse(formData.defaultSchema);
    } catch {
      setError('Invalid JSON in default schema');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const endpoint = editing 
        ? `/v1/announcements/admin/templates/${editing.id}` 
        : '/v1/announcements/admin/templates';
      const method = editing ? 'PUT' : 'POST';

      await api[method.toLowerCase() as 'put' | 'post'](endpoint, {
        name: formData.name,
        icon: formData.icon,
        description: formData.description,
        fields: [], // Simple mode - no custom fields
        defaultSchema: JSON.parse(formData.defaultSchema),
      });

      setEditing(null);
      setCreating(false);
      onUpdate();
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/v1/announcements/admin/templates/${id}`);
      onUpdate();
    } catch {
      setError('Failed to delete template');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Manage Templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {(editing || creating) ? (
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="My Template" 
                />
              </div>
              <div>
                <Label>Icon (Emoji)</Label>
                <Input 
                  value={formData.icon} 
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })} 
                  placeholder="📢" 
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="What is this template for?" 
                />
              </div>
              <div>
                <Label>Default Schema (JSON)</Label>
                <textarea
                  value={formData.defaultSchema}
                  onChange={(e) => setFormData({ ...formData, defaultSchema: e.target.value })}
                  className="w-full h-64 font-mono text-sm p-3 border rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editing ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">{templates.length} templates</p>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>

              <div className="space-y-2">
                {templates.map((t) => (
                  <div key={t.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-sm text-gray-500">{t.description}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                        Edit
                      </Button>
                      {!(t as Template & { isBuiltin?: boolean }).isBuiltin && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

