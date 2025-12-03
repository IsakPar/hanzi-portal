import { useState } from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Announcement, Template } from '../types';
import { AnnouncementEditor } from '../AnnouncementEditor';
import { TemplateManager } from '../TemplateManager';

interface AnnouncementsTabProps {
  announcements: Announcement[];
  templates: Template[];
  loading: boolean;
  editorOpen: boolean;
  setEditorOpen: (v: boolean) => void;
  editingAnnouncement: Announcement | null;
  setEditingAnnouncement: (a: Announcement | null) => void;
  deleteAnnouncement: (id: string) => void;
  duplicateAnnouncement: (id: string) => void;
  onSave: () => void;
}

export function AnnouncementsTab({
  announcements,
  templates,
  loading,
  editorOpen,
  setEditorOpen,
  editingAnnouncement,
  setEditingAnnouncement,
  deleteAnnouncement,
  duplicateAnnouncement,
  onSave,
}: AnnouncementsTabProps) {
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">SDUI messages for app launch</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplatesModalOpen(true)}>
            Manage Templates
          </Button>
          <Button onClick={() => setEditorOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* Template Manager Modal */}
      {templatesModalOpen && (
        <TemplateManager 
          templates={templates} 
          onClose={() => setTemplatesModalOpen(false)} 
          onUpdate={onSave}
        />
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <AnnouncementEditor
          templates={templates}
          announcement={editingAnnouncement}
          onClose={() => { setEditorOpen(false); setEditingAnnouncement(null); }}
          onSave={onSave}
        />
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No announcements yet</div>
        ) : (
          <div className="divide-y">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg overflow-hidden" 
                    style={{ 
                      background: ann.uiSchema?.style?.backgroundGradient || ann.uiSchema?.style?.backgroundColor || '#4F46E5' 
                    }}
                  >
                    {ann.uiSchema?.content?.iconSvg ? (
                      <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: ann.uiSchema.content.iconSvg }} />
                    ) : ann.uiSchema?.content?.iconUrl ? (
                      <img src={ann.uiSchema.content.iconUrl} alt="" className="w-6 h-6" />
                    ) : (
                      ann.uiSchema?.content?.iconEmoji || '📢'
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{ann.title}</div>
                    <div className="text-sm text-gray-500">
                      {ann.uiSchema?.type} · {ann.targetAudience}
                      {!ann.isActive && <span className="ml-2 text-red-500">(inactive)</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setEditingAnnouncement(ann); setEditorOpen(true); }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicateAnnouncement(ann.id)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteAnnouncement(ann.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

