import { useState } from 'react';
import { X, RefreshCw, Eye, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/services/api';
import type { Announcement, AnnouncementSchema, Template } from './types';
import { PhonePreview } from './PhonePreview';

interface AnnouncementEditorProps {
  templates: Template[];
  announcement: Announcement | null;
  onClose: () => void;
  onSave: () => void;
}

export function AnnouncementEditor({ templates, announcement, onClose, onSave }: AnnouncementEditorProps) {
  const [step, setStep] = useState<'template' | 'edit'>(announcement ? 'edit' : 'template');
  const [jsonMode, setJsonMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    uiSchema: AnnouncementSchema;
    targetAudience: string;
    isActive: boolean;
    priority: number;
  }>({
    title: announcement?.title || '',
    uiSchema: announcement?.uiSchema || {
      type: 'modal',
      style: { backgroundColor: '#4F46E5', textColor: '#ffffff' },
      content: { title: '', body: '' },
      primaryCta: { text: 'OK', action: 'dismiss' },
      dismissible: true,
      showOnce: true,
    },
    targetAudience: announcement?.targetAudience || 'all',
    isActive: announcement?.isActive ?? false,
    priority: announcement?.priority || 0,
  });

  const [jsonText, setJsonText] = useState(JSON.stringify(formData.uiSchema, null, 2));

  function selectTemplate(template: Template) {
    setFormData({
      ...formData,
      title: template.defaultSchema.content.title,
      uiSchema: { ...template.defaultSchema },
    });
    setJsonText(JSON.stringify(template.defaultSchema, null, 2));
    setStep('edit');
    setJsonMode(template.id === 'json');
  }

  function updateSchema(path: string, value: string | boolean) {
    const parts = path.split('.');
    const newSchema = { ...formData.uiSchema };
    let obj: Record<string, unknown> = newSchema;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = value;
    setFormData({ ...formData, uiSchema: newSchema as AnnouncementSchema });
    setJsonText(JSON.stringify(newSchema, null, 2));
  }

  function parseJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setFormData({ ...formData, uiSchema: parsed });
      setError(null);
      return true;
    } catch {
      setError('Invalid JSON');
      return false;
    }
  }

  async function handleSave() {
    if (jsonMode && !parseJson()) return;
    
    setSaving(true);
    setError(null);
    try {
      const endpoint = announcement 
        ? `/v1/announcements/admin/${announcement.id}` 
        : '/v1/announcements/admin/create';
      const method = announcement ? 'PUT' : 'POST';
      
      await api[method.toLowerCase() as 'put' | 'post'](endpoint, {
        title: formData.title || formData.uiSchema.content.title,
        uiSchema: formData.uiSchema,
        targetAudience: formData.targetAudience,
        isActive: formData.isActive,
        priority: formData.priority,
      });
      onSave();
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{announcement ? 'Edit Announcement' : 'Create Announcement'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'template' ? (
            <div>
              <h3 className="font-medium mb-4">Choose a Template</h3>
              <div className="grid grid-cols-3 gap-4">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className="p-4 border rounded-xl text-left hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                  >
                    <div className="text-2xl mb-2">{t.icon}</div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Editor */}
              <div className="flex-1 space-y-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setJsonMode(false)}
                    className={`px-3 py-1 rounded text-sm ${!jsonMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" /> Simple
                  </button>
                  <button
                    onClick={() => setJsonMode(true)}
                    className={`px-3 py-1 rounded text-sm ${jsonMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
                  >
                    <Code className="w-4 h-4 inline mr-1" /> JSON
                  </button>
                </div>

                {jsonMode ? (
                  <div>
                    <Label>SDUI Schema (JSON)</Label>
                    <textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      onBlur={parseJson}
                      className="w-full h-80 font-mono text-sm p-3 border rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input 
                        value={formData.uiSchema.content.title} 
                        onChange={(e) => updateSchema('content.title', e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea 
                        value={formData.uiSchema.content.body || ''} 
                        onChange={(e) => updateSchema('content.body', e.target.value)} 
                        rows={3} 
                      />
                    </div>
                    <div>
                      <Label>Icon URL (or Emoji below)</Label>
                      <Input 
                        value={formData.uiSchema.content.iconUrl || ''} 
                        onChange={(e) => updateSchema('content.iconUrl', e.target.value)} 
                        placeholder="https://content.polymasterlabs.com/icons/..." 
                      />
                    </div>
                    <div>
                      <Label>Emoji Fallback</Label>
                      <Input 
                        value={formData.uiSchema.content.iconEmoji || ''} 
                        onChange={(e) => updateSchema('content.iconEmoji', e.target.value)} 
                        placeholder="🎄" 
                      />
                    </div>
                    <div>
                      <Label>Button Text</Label>
                      <Input 
                        value={formData.uiSchema.primaryCta?.text || ''} 
                        onChange={(e) => updateSchema('primaryCta.text', e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Background Color</Label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={formData.uiSchema.style.backgroundColor || '#4F46E5'} 
                          onChange={(e) => updateSchema('style.backgroundColor', e.target.value)} 
                          className="w-10 h-10 rounded" 
                        />
                        <Input 
                          value={formData.uiSchema.style.backgroundColor || ''} 
                          onChange={(e) => updateSchema('style.backgroundColor', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Display Type</Label>
                      <select 
                        value={formData.uiSchema.type} 
                        onChange={(e) => updateSchema('type', e.target.value)} 
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="modal">Modal</option>
                        <option value="banner">Banner</option>
                        <option value="fullscreen">Full Screen</option>
                        <option value="bottom_sheet">Bottom Sheet</option>
                      </select>
                    </div>
                  </div>
                )}

                <hr />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Audience</Label>
                    <select 
                      value={formData.targetAudience} 
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })} 
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="all">All Users</option>
                      <option value="free">Free Users</option>
                      <option value="premium">Premium Users</option>
                      <option value="test_devices">Test Devices Only</option>
                    </select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Input 
                      type="number" 
                      value={formData.priority} 
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.isActive} 
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} 
                    id="isActive" 
                  />
                  <Label htmlFor="isActive">Active (visible to users)</Label>
                </div>
              </div>

              {/* Preview */}
              <div className="w-80">
                <div className="sticky top-0">
                  <Label>Preview</Label>
                  <PhonePreview schema={formData.uiSchema} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'edit' && (
          <div className="p-4 border-t flex items-center justify-between">
            {error && <span className="text-red-500 text-sm">{error}</span>}
            <div className="flex gap-3 ml-auto">
              <Button variant="outline" onClick={() => setStep('template')}>Back</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                {announcement ? 'Update' : 'Create'} Announcement
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

