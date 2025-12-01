import { useState, useEffect } from 'react';
import { Gauge, Smartphone, RefreshCw, Trash2, Plus, BookOpen, BookText, AlertCircle, X, Megaphone, Zap, Copy, Eye, Code } from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface StagedLesson {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
  contentStatus: string;
  updatedAt: string;
}

interface StagedStory {
  id: string;
  title: string;
  hskLevel: number;
  contentStatus: string;
  updatedAt: string;
}

interface TestDevice {
  id: string;
  deviceId: string;
  name: string;
  platform: 'ios' | 'android' | null;
  createdAt: string;
}

interface Overview {
  lessons: { draft: number; staging: number; live: number };
  stories: { draft: number; staging: number; live: number };
  total: { draft: number; staging: number; live: number };
}

interface AnnouncementSchema {
  type: 'modal' | 'banner' | 'fullscreen' | 'bottom_sheet';
  style: {
    backgroundColor?: string;
    backgroundGradient?: string;
    textColor?: string;
    border?: string;
  };
  content: {
    iconEmoji?: string;
    iconUrl?: string;
    iconSvg?: string;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    body?: string;
    signature?: string;
    urgency?: string;
    imageUrl?: string;
  };
  primaryCta?: {
    text: string;
    action: string;
    route?: string;
  };
  secondaryCta?: {
    text: string;
    action: string;
  };
  dismissible: boolean;
  showOnce: boolean;
}

interface Announcement {
  id: string;
  title: string;
  uiSchema: AnnouncementSchema;
  targetAudience: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  priority: number;
}

interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    default?: string;
    placeholder?: string;
    options?: string[];
  }>;
  defaultSchema: AnnouncementSchema;
}

interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
}

interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

type Tab = 'content' | 'devices' | 'announcements' | 'ai-usage';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ControlCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Content Pipeline state
  const [stagedLessons, setStagedLessons] = useState<StagedLesson[]>([]);
  const [stagedStories, setStagedStories] = useState<StagedStory[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  // Test Devices state
  const [testDevices, setTestDevices] = useState<TestDevice[]>([]);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ deviceId: '', name: '', platform: 'ios' });

  // Announcements state
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // AI Usage state
  const [usageSummary, setUsageSummary] = useState<AIUsageSummary | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'content' || activeTab === 'devices') {
        const [stagedData, devicesData, overviewData] = await Promise.all([
          api.get<{ lessons: StagedLesson[]; stories: StagedStory[] }>('/v1/control-center/staged'),
          api.get<{ devices: TestDevice[] }>('/v1/control-center/test-devices'),
          api.get<Overview>('/v1/control-center/overview'),
        ]);
        setStagedLessons(stagedData.lessons || []);
        setStagedStories(stagedData.stories || []);
        setTestDevices(devicesData.devices || []);
        setOverview(overviewData);
      }
      
      if (activeTab === 'announcements') {
        const [listData, templatesData] = await Promise.all([
          api.get<{ announcements: Announcement[] }>('/v1/announcements/admin/list'),
          api.get<{ templates: Template[] }>('/v1/announcements/admin/templates'),
        ]);
        setAnnouncementsList(listData.announcements || []);
        setTemplates(templatesData.templates || []);
      }
      
      if (activeTab === 'ai-usage') {
        const data = await api.get<{ summary: AIUsageSummary; daily: DailyUsage[] }>('/v1/admin/ai-usage/summary?days=30');
        setUsageSummary(data.summary || null);
        setDailyUsage(data.daily || []);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Content Pipeline functions
  async function promoteToLive(type: 'lesson' | 'story', id: string) {
    setPromoting(id);
    try {
      await api.post('/v1/control-center/promote', type === 'lesson' ? { lessonIds: [id] } : { storyIds: [id] });
      await fetchData();
    } catch (err) {
      setError('Failed to promote content');
    } finally {
      setPromoting(null);
    }
  }

  async function promoteAll() {
    setPromoting('all');
    try {
      await api.post('/v1/control-center/promote', {
        lessonIds: stagedLessons.map(l => l.id),
        storyIds: stagedStories.map(s => s.id),
      });
      await fetchData();
    } catch (err) {
      setError('Failed to promote all content');
    } finally {
      setPromoting(null);
    }
  }

  // Test Device functions
  async function addTestDevice() {
    if (!newDevice.deviceId || !newDevice.name) return;
    try {
      await api.post('/v1/control-center/test-devices', newDevice);
      setAddDeviceOpen(false);
      setNewDevice({ deviceId: '', name: '', platform: 'ios' });
      await fetchData();
    } catch (err) {
      setError('Failed to add test device');
    }
  }

  async function removeTestDevice(id: string) {
    try {
      await api.delete(`/v1/control-center/test-devices/${id}`);
      await fetchData();
    } catch (err) {
      setError('Failed to remove test device');
    }
  }

  // Announcement functions
  async function deleteAnnouncement(id: string) {
    try {
      await api.delete(`/v1/announcements/admin/${id}`);
      await fetchData();
    } catch (err) {
      setError('Failed to delete announcement');
    }
  }

  async function duplicateAnnouncement(id: string) {
    try {
      await api.post(`/v1/announcements/admin/duplicate/${id}`);
      await fetchData();
    } catch (err) {
      setError('Failed to duplicate announcement');
    }
  }

  const totalStaged = stagedLessons.length + stagedStories.length;

  const tabs = [
    { id: 'content' as Tab, label: 'Content Pipeline', icon: BookOpen },
    { id: 'devices' as Tab, label: 'Test Devices', icon: Smartphone },
    { id: 'announcements' as Tab, label: 'Announcements', icon: Megaphone },
    { id: 'ai-usage' as Tab, label: 'AI Usage', icon: Zap },
  ];

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Gauge className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control Center</h1>
            <p className="text-sm text-gray-500">Manage content, devices, and app communications</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'content' && (
        <ContentPipelineTab
          overview={overview}
          stagedLessons={stagedLessons}
          stagedStories={stagedStories}
          totalStaged={totalStaged}
          promoting={promoting}
          loading={loading}
          promoteToLive={promoteToLive}
          promoteAll={promoteAll}
        />
      )}

      {activeTab === 'devices' && (
        <TestDevicesTab
          testDevices={testDevices}
          addDeviceOpen={addDeviceOpen}
          setAddDeviceOpen={setAddDeviceOpen}
          newDevice={newDevice}
          setNewDevice={setNewDevice}
          addTestDevice={addTestDevice}
          removeTestDevice={removeTestDevice}
        />
      )}

      {activeTab === 'announcements' && (
        <AnnouncementsTab
          announcements={announcementsList}
          templates={templates}
          loading={loading}
          editorOpen={editorOpen}
          setEditorOpen={setEditorOpen}
          editingAnnouncement={editingAnnouncement}
          setEditingAnnouncement={setEditingAnnouncement}
          deleteAnnouncement={deleteAnnouncement}
          duplicateAnnouncement={duplicateAnnouncement}
          onSave={() => { setEditorOpen(false); setEditingAnnouncement(null); fetchData(); }}
        />
      )}

      {activeTab === 'ai-usage' && (
        <AIUsageTab summary={usageSummary} daily={dailyUsage} loading={loading} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTENT PIPELINE TAB
// ═══════════════════════════════════════════════════════════

function ContentPipelineTab({ overview, stagedLessons, stagedStories, totalStaged, promoting, loading, promoteToLive, promoteAll }: {
  overview: Overview | null;
  stagedLessons: StagedLesson[];
  stagedStories: StagedStory[];
  totalStaged: number;
  promoting: string | null;
  loading: boolean;
  promoteToLive: (type: 'lesson' | 'story', id: string) => void;
  promoteAll: () => void;
}) {
  return (
    <div className="space-y-6">
      {overview && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">Draft</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{overview.total.draft}</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <div className="text-sm font-medium text-amber-600">Staging</div>
            <div className="text-3xl font-bold text-amber-700 mt-1">{overview.total.staging}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
            <div className="text-sm font-medium text-emerald-600">Live</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">{overview.total.live}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Staged Content</h2>
          {totalStaged > 0 && (
            <Button onClick={promoteAll} disabled={promoting !== null} className="bg-emerald-600 hover:bg-emerald-700">
              Push All Live
            </Button>
          )}
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : totalStaged === 0 ? (
          <div className="p-8 text-center text-gray-500">No content in staging</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stagedLessons.map((lesson) => (
              <div key={lesson.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{lesson.title}</span>
                </div>
                <Button size="sm" onClick={() => promoteToLive('lesson', lesson.id)} className="bg-emerald-600">Push Live</Button>
              </div>
            ))}
            {stagedStories.map((story) => (
              <div key={story.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BookText className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">{story.title}</span>
                </div>
                <Button size="sm" onClick={() => promoteToLive('story', story.id)} className="bg-emerald-600">Push Live</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TEST DEVICES TAB
// ═══════════════════════════════════════════════════════════

function TestDevicesTab({ testDevices, addDeviceOpen, setAddDeviceOpen, newDevice, setNewDevice, addTestDevice, removeTestDevice }: {
  testDevices: TestDevice[];
  addDeviceOpen: boolean;
  setAddDeviceOpen: (v: boolean) => void;
  newDevice: { deviceId: string; name: string; platform: string };
  setNewDevice: (d: { deviceId: string; name: string; platform: string }) => void;
  addTestDevice: () => void;
  removeTestDevice: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Test Devices</h2>
        <Button variant="outline" onClick={() => setAddDeviceOpen(true)}><Plus className="w-4 h-4 mr-2" />Add</Button>
      </div>
      {addDeviceOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Test Device</h3>
            <div className="space-y-4">
              <div><Label>Device ID</Label><Input value={newDevice.deviceId} onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setAddDeviceOpen(false)}>Cancel</Button>
              <Button onClick={addTestDevice}>Add</Button>
            </div>
          </div>
        </div>
      )}
      {testDevices.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No test devices</div>
      ) : (
        <div className="divide-y">
          {testDevices.map((d) => (
            <div key={d.id} className="p-4 flex items-center justify-between">
              <div><div className="font-medium">{d.name}</div><div className="text-sm text-gray-500 font-mono">{d.deviceId.slice(0, 20)}...</div></div>
              <Button variant="ghost" size="sm" onClick={() => removeTestDevice(d.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANNOUNCEMENTS TAB
// ═══════════════════════════════════════════════════════════

function AnnouncementsTab({ announcements, templates, loading, editorOpen, setEditorOpen, editingAnnouncement, setEditingAnnouncement, deleteAnnouncement, duplicateAnnouncement, onSave }: {
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
}) {
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">SDUI messages for app launch</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplatesModalOpen(true)}>Manage Templates</Button>
          <Button onClick={() => setEditorOpen(true)}><Plus className="w-4 h-4 mr-2" />New Announcement</Button>
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
                  <Button variant="outline" size="sm" onClick={() => { setEditingAnnouncement(ann); setEditorOpen(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicateAnnouncement(ann.id)}><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteAnnouncement(ann.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANNOUNCEMENT EDITOR
// ═══════════════════════════════════════════════════════════

function AnnouncementEditor({ templates, announcement, onClose, onSave }: {
  templates: Template[];
  announcement: Announcement | null;
  onClose: () => void;
  onSave: () => void;
}) {
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
    } catch (err) {
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
                      <Input value={formData.uiSchema.content.title} onChange={(e) => updateSchema('content.title', e.target.value)} />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea value={formData.uiSchema.content.body || ''} onChange={(e) => updateSchema('content.body', e.target.value)} rows={3} />
                    </div>
                    <div>
                      <Label>Icon URL (or Emoji below)</Label>
                      <Input value={formData.uiSchema.content.iconUrl || ''} onChange={(e) => updateSchema('content.iconUrl', e.target.value)} placeholder="https://content.polymasterlabs.com/icons/..." />
                    </div>
                    <div>
                      <Label>Emoji Fallback</Label>
                      <Input value={formData.uiSchema.content.iconEmoji || ''} onChange={(e) => updateSchema('content.iconEmoji', e.target.value)} placeholder="🎄" />
                    </div>
                    <div>
                      <Label>Button Text</Label>
                      <Input value={formData.uiSchema.primaryCta?.text || ''} onChange={(e) => updateSchema('primaryCta.text', e.target.value)} />
                    </div>
                    <div>
                      <Label>Background Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={formData.uiSchema.style.backgroundColor || '#4F46E5'} onChange={(e) => updateSchema('style.backgroundColor', e.target.value)} className="w-10 h-10 rounded" />
                        <Input value={formData.uiSchema.style.backgroundColor || ''} onChange={(e) => updateSchema('style.backgroundColor', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Display Type</Label>
                      <select value={formData.uiSchema.type} onChange={(e) => updateSchema('type', e.target.value)} className="w-full border rounded-lg px-3 py-2">
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
                    <select value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="all">All Users</option>
                      <option value="free">Free Users</option>
                      <option value="premium">Premium Users</option>
                      <option value="test_devices">Test Devices Only</option>
                    </select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} id="isActive" />
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

// ═══════════════════════════════════════════════════════════
// PHONE PREVIEW
// ═══════════════════════════════════════════════════════════

function PhonePreview({ schema }: { schema: AnnouncementSchema }) {
  const bgStyle = schema.style.backgroundGradient 
    ? { background: schema.style.backgroundGradient }
    : { backgroundColor: schema.style.backgroundColor || '#4F46E5' };

  // Render icon - inline SVG, URL, or emoji
  const renderIcon = (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeMap = { sm: 24, md: 48, lg: 64 };
    const px = sizeMap[size];
    
    if (schema.content.iconSvg) {
      return (
        <div 
          className="drop-shadow-lg" 
          style={{ width: px, height: px }}
          dangerouslySetInnerHTML={{ __html: schema.content.iconSvg }} 
        />
      );
    }
    if (schema.content.iconUrl) {
      return <img src={schema.content.iconUrl} alt="" className="drop-shadow-lg" style={{ width: px, height: px }} />;
    }
    if (schema.content.iconEmoji) {
      const textSize = size === 'sm' ? 'text-xl' : size === 'md' ? 'text-4xl' : 'text-5xl';
      return <span className={textSize}>{schema.content.iconEmoji}</span>;
    }
    return null;
  };

  return (
    <div className="bg-gray-900 rounded-[2.5rem] p-3 mt-2 shadow-2xl">
      <div className="bg-black rounded-[2rem] overflow-hidden" style={{ height: 520 }}>
        {/* Phone notch */}
        <div className="h-8 bg-black flex items-center justify-center relative">
          <div className="w-24 h-6 bg-black rounded-b-2xl absolute -top-1" />
          <div className="w-16 h-4 bg-gray-900 rounded-full" />
        </div>
        
        {/* Phone content */}
        <div className="h-full bg-gray-100 relative flex items-center justify-center">
          {/* The announcement preview */}
          {schema.type === 'banner' ? (
            <div className="absolute top-0 left-0 right-0 p-4" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
              <div className="flex items-center gap-3">
                {renderIcon('sm')}
                <div className="flex-1">
                  <div className="font-semibold text-sm">{schema.content.title || 'Title'}</div>
                  {schema.content.subtitle && <div className="text-xs opacity-80">{schema.content.subtitle}</div>}
                </div>
                <button className="text-xs opacity-70">✕</button>
              </div>
            </div>
          ) : schema.type === 'fullscreen' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
              {renderIcon('lg')}
              {schema.content.eyebrow && (
                <div className="text-xs font-bold tracking-wider opacity-80 mt-4 mb-1">{schema.content.eyebrow}</div>
              )}
              <div className="text-2xl font-bold text-center">{schema.content.title || 'Title'}</div>
              {schema.content.subtitle && <div className="text-sm opacity-90 mt-1">{schema.content.subtitle}</div>}
              {schema.content.body && <div className="text-sm text-center opacity-80 mt-3 px-4">{schema.content.body}</div>}
              {schema.content.urgency && (
                <div className="mt-3 px-3 py-1 bg-black/20 rounded-full text-xs">{schema.content.urgency}</div>
              )}
              <div className="mt-6 flex flex-col gap-2 w-full px-6">
                {schema.primaryCta && (
                  <button className="w-full py-3 bg-white/20 backdrop-blur rounded-xl text-sm font-semibold">
                    {schema.primaryCta.text}
                  </button>
                )}
                {schema.secondaryCta && (
                  <button className="w-full py-2 text-sm opacity-70">
                    {schema.secondaryCta.text}
                  </button>
                )}
              </div>
            </div>
          ) : schema.type === 'bottom_sheet' ? (
            <>
              {/* Dimmed background */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Bottom sheet */}
              <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
                <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mt-3" />
                <div className="p-6 flex flex-col items-center text-center">
                  {renderIcon('md')}
                  <div className="text-lg font-bold mt-3">{schema.content.title || 'Title'}</div>
                  {schema.content.subtitle && <div className="text-sm opacity-80 mt-1">{schema.content.subtitle}</div>}
                  {schema.content.body && <div className="text-sm opacity-70 mt-2">{schema.content.body}</div>}
                  <div className="mt-5 flex flex-col gap-2 w-full">
                    {schema.primaryCta && (
                      <button className="w-full py-3 bg-white/20 rounded-xl text-sm font-semibold">
                        {schema.primaryCta.text}
                      </button>
                    )}
                    {schema.secondaryCta && (
                      <button className="w-full py-2 text-sm opacity-60">
                        {schema.secondaryCta.text}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Modal (default) */
            <>
              {/* Dimmed background */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Modal card */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[260px] relative" style={{ border: schema.style.border }}>
                <div className="p-5 text-center" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
                  {renderIcon('md')}
                  {schema.content.eyebrow && (
                    <div className="text-xs font-bold tracking-wider opacity-80 mt-3 mb-1">{schema.content.eyebrow}</div>
                  )}
                  <div className="text-lg font-bold mt-2">{schema.content.title || 'Title'}</div>
                  {schema.content.subtitle && <div className="text-sm opacity-90 mt-1">{schema.content.subtitle}</div>}
                </div>
                {(schema.content.body || schema.content.signature) && (
                  <div className="p-4 text-center">
                    {schema.content.body && <div className="text-gray-600 text-sm">{schema.content.body}</div>}
                    {schema.content.signature && <div className="text-gray-500 text-xs mt-2 italic">{schema.content.signature}</div>}
                  </div>
                )}
                <div className="p-4 border-t flex flex-col gap-2">
                  {schema.primaryCta && (
                    <button className="w-full py-2.5 rounded-xl text-white text-sm font-semibold" style={bgStyle}>
                      {schema.primaryCta.text}
                    </button>
                  )}
                  {schema.secondaryCta && (
                    <button className="w-full py-2 text-gray-500 text-sm">
                      {schema.secondaryCta.text}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AI USAGE TAB
// ═══════════════════════════════════════════════════════════

function AIUsageTab({ summary, daily, loading }: { summary: AIUsageSummary | null; daily: DailyUsage[]; loading: boolean }) {
  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-6">
            <div className="text-sm text-gray-500">Total Requests</div>
            <div className="text-3xl font-bold mt-1">{summary.totalRequests.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <div className="text-sm text-gray-500">Total Tokens</div>
            <div className="text-3xl font-bold mt-1">{summary.totalTokens.toLocaleString()}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
            <div className="text-sm text-emerald-600">Total Cost</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">${summary.totalCost.toFixed(4)}</div>
          </div>
        </div>
      )}

      {summary && Object.keys(summary.byModel).length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">By Model</h3>
          {Object.entries(summary.byModel).map(([model, data]) => (
            <div key={model} className="flex justify-between py-2 border-b last:border-0">
              <div><div className="font-medium">{model}</div><div className="text-sm text-gray-500">{data.requests} req · {data.tokens.toLocaleString()} tokens</div></div>
              <div className="text-emerald-600 font-medium">${data.cost.toFixed(4)}</div>
            </div>
          ))}
        </div>
      )}

      {daily.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Daily (Last 14 days)</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 border-b"><th className="text-left py-2">Date</th><th className="text-right">Requests</th><th className="text-right">Tokens</th><th className="text-right">Cost</th></tr></thead>
            <tbody>
              {daily.slice(0, 14).map((d) => (
                <tr key={d.date} className="border-b border-gray-50">
                  <td className="py-2">{d.date}</td>
                  <td className="text-right">{d.requests}</td>
                  <td className="text-right">{(d.tokens || 0).toLocaleString()}</td>
                  <td className="text-right text-emerald-600">${(d.cost || 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(!summary || summary.totalRequests === 0) && (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">No AI usage data yet</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE MANAGER
// ═══════════════════════════════════════════════════════════

function TemplateManager({ templates, onClose, onUpdate }: {
  templates: Template[];
  onClose: () => void;
  onUpdate: () => void;
}) {
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
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/v1/announcements/admin/templates/${id}`);
      onUpdate();
    } catch (err) {
      setError('Failed to delete template');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Manage Templates</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {(editing || creating) ? (
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="My Template" />
              </div>
              <div>
                <Label>Icon (Emoji)</Label>
                <Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="📢" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What is this template for?" />
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
                <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
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
                <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />New Template</Button>
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
                      <Button variant="outline" size="sm" onClick={() => setEditing(t)}>Edit</Button>
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
