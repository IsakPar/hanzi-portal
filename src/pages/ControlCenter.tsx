import { useState, useEffect } from 'react';
import { Gauge, Smartphone, RefreshCw, Trash2, Plus, BookOpen, BookText, AlertCircle, X, Megaphone, Zap, Copy, Eye, Code, FlaskConical, Play, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
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

interface ProviderConfig {
  name: string;
  color: string;
  models: string[];
}

interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  byProvider: Record<string, { requests: number; tokens: number; cost: number; models: string[] }>;
  firstLogDate: string | null;
}

interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface DailyUsageByProvider {
  date: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface TutorDailyUsage {
  date: string;
  lessons: number;
  cost: number;
  tokens: number;
  avgLatencyMs: number;
}

interface TutorRecentLesson {
  sessionId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  steps: number;
  latencyMs: number;
  metadata?: {
    userLessonPosition?: number;
    hskLevel?: number;
    focusWords?: string[];
  };
}

interface TutorUsageSummary {
  totalLessons: number;
  totalCost: number;
  avgCostPerLesson: number;
  totalTokens: number;
  avgLatencyMs: number;
  totalLatencyMs: number;
  fallbackRate: number;
  daily: TutorDailyUsage[];
  recentLessons: TutorRecentLesson[];
}

// Test Lab types
interface TestStep {
  timestamp: string;
  step: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message: string;
  durationMs?: number;
  cost?: number;
  details?: Record<string, unknown>;
}

interface TestResult {
  success: boolean;
  lesson?: unknown;
  steps: TestStep[];
  summary: {
    totalDurationMs: number;
    totalCost: number;
    cacheHit: boolean;
    cacheKey?: string;
    preFilterScore?: number;
    preFilterPassed?: boolean;
    attemptsReading: number;
    attemptsPractice: number;
    attemptsGrammar: number;
  };
  error?: string;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  estimatedSavings: number;
}

type Tab = 'content' | 'devices' | 'announcements' | 'ai-usage' | 'test-lab';

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
  const [dailyByProvider, setDailyByProvider] = useState<DailyUsageByProvider[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({});
  const [aiTimePeriod, setAiTimePeriod] = useState<'7' | '30' | '90' | '0'>('0'); // 0 = all time
  const [tutorSummary, setTutorSummary] = useState<TutorUsageSummary | null>(null);

  // Test Lab state
  const [testLabHskLevel, setTestLabHskLevel] = useState(1);
  const [testLabPosition, setTestLabPosition] = useState(15);
  const [testLabFocusWords, setTestLabFocusWords] = useState('学习,中文');
  const [testLabBypassCache, setTestLabBypassCache] = useState(false);
  const [testLabRunning, setTestLabRunning] = useState(false);
  const [testLabResult, setTestLabResult] = useState<TestResult | null>(null);
  const [testLabCacheStats, setTestLabCacheStats] = useState<CacheStats | null>(null);
  const [testLabSuggestedWords, setTestLabSuggestedWords] = useState<string[][]>([]);
  const [testLabElapsedMs, setTestLabElapsedMs] = useState(0);
  const [testLabSteps, setTestLabSteps] = useState<TestStep[]>([]);
  const [testLabRunningCost, setTestLabRunningCost] = useState(0);
  const [testLabEventSource, setTestLabEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, aiTimePeriod, testLabHskLevel]);

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
        const [data, tutorData] = await Promise.all([
          api.get<{ 
            summary: AIUsageSummary; 
            daily: DailyUsage[]; 
            dailyByProvider: DailyUsageByProvider[];
            providers: Record<string, ProviderConfig>;
          }>(`/v1/admin/ai-usage/summary?days=${aiTimePeriod}`),
          api.get<TutorUsageSummary>(`/v1/admin/ai-usage/tutor-summary?days=${aiTimePeriod}`),
        ]);
        setUsageSummary(data.summary || null);
        setDailyUsage(data.daily || []);
        setDailyByProvider(data.dailyByProvider || []);
        setProviders(data.providers || {});
        setTutorSummary(tutorData || null);
      }
      
      if (activeTab === 'test-lab') {
        const [cacheData, suggestionsData] = await Promise.all([
          api.get<{ success: boolean; stats: CacheStats }>('/v1/ai-tutor-test/cache-stats'),
          api.get<{ success: boolean; suggestions: string[][] }>(`/v1/ai-tutor-test/suggested-words?hskLevel=${testLabHskLevel}`),
        ]);
        setTestLabCacheStats(cacheData.stats || null);
        setTestLabSuggestedWords(suggestionsData.suggestions || []);
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

  // Test Lab function - uses SSE for real-time streaming
  function runTestLabTest() {
    // Reset state
    setTestLabRunning(true);
    setTestLabResult(null);
    setTestLabSteps([]);
    setTestLabElapsedMs(0);
    setTestLabRunningCost(0);
    
    // Start timer
    const startTime = Date.now();
    const interval = setInterval(() => {
      setTestLabElapsedMs(Date.now() - startTime);
    }, 100);
    
    // Build SSE URL with query params
    const API_BASE = import.meta.env.VITE_API_URL || 'https://api.studio.polymasterlabs.com';
    const params = new URLSearchParams({
      hskLevel: String(testLabHskLevel),
      lessonPosition: String(testLabPosition),
      focusWords: testLabFocusWords,
      bypassCache: String(testLabBypassCache),
    });
    
    // Create EventSource for SSE
    const eventSource = new EventSource(`${API_BASE}/v1/ai-tutor-test/run-stream?${params}`);
    setTestLabEventSource(eventSource);
    
    // Handle step events (real-time progress)
    eventSource.addEventListener('step', (event) => {
      const data = JSON.parse(event.data);
      setTestLabSteps(prev => [...prev, {
        timestamp: new Date().toISOString(),
        step: data.step,
        status: data.status,
        message: data.message,
        durationMs: data.durationMs,
        cost: data.cost,
        details: data.details,
      }]);
      setTestLabRunningCost(data.totalCost || 0);
    });
    
    // Handle final result
    eventSource.addEventListener('result', async (event) => {
      const data = JSON.parse(event.data);
      clearInterval(interval);
      eventSource.close();
      setTestLabEventSource(null);
      setTestLabRunning(false);
      
      setTestLabResult({
        success: data.success,
        lesson: data.lesson,
        steps: [], // Steps are shown separately now
        summary: {
          totalDurationMs: data.summary?.totalDurationMs || Date.now() - startTime,
          totalCost: data.summary?.totalCost || 0,
          cacheHit: data.lesson?.metadata?.warnings?.some((w: string) => w.includes('cache')) || false,
          attemptsReading: data.lesson?.metadata?.attempts?.reading || 0,
          attemptsPractice: data.lesson?.metadata?.attempts?.practice || 0,
          attemptsGrammar: data.lesson?.metadata?.attempts?.grammarCheck || 0,
        },
        error: data.error,
      });
      
      // Refresh cache stats
      try {
        const cacheData = await api.get<{ success: boolean; stats: CacheStats }>('/v1/ai-tutor-test/cache-stats');
        setTestLabCacheStats(cacheData.stats || null);
      } catch { /* ignore */ }
    });
    
    // Handle errors
    eventSource.onerror = () => {
      clearInterval(interval);
      eventSource.close();
      setTestLabEventSource(null);
      setTestLabRunning(false);
      setTestLabResult({
        success: false,
        steps: [],
        summary: {
          totalDurationMs: Date.now() - startTime,
          totalCost: 0,
          cacheHit: false,
          attemptsReading: 0,
          attemptsPractice: 0,
          attemptsGrammar: 0,
        },
        error: 'Connection lost - test may still be running on server',
      });
    };
  }
  
  // Cancel running test
  function cancelTestLabTest() {
    if (testLabEventSource) {
      testLabEventSource.close();
      setTestLabEventSource(null);
    }
    setTestLabRunning(false);
    setTestLabSteps(prev => [...prev, {
      timestamp: new Date().toISOString(),
      step: 'cancelled',
      status: 'error',
      message: 'Test cancelled by user',
      durationMs: testLabElapsedMs,
    }]);
  }

  const tabs = [
    { id: 'content' as Tab, label: 'Content Pipeline', icon: BookOpen },
    { id: 'devices' as Tab, label: 'Test Devices', icon: Smartphone },
    { id: 'announcements' as Tab, label: 'Announcements', icon: Megaphone },
    { id: 'ai-usage' as Tab, label: 'AI Usage', icon: Zap },
    { id: 'test-lab' as Tab, label: 'Test Lab', icon: FlaskConical },
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
        <AIUsageTab 
          summary={usageSummary} 
          daily={dailyUsage} 
          dailyByProvider={dailyByProvider}
          providers={providers}
          tutorSummary={tutorSummary}
          loading={loading}
          timePeriod={aiTimePeriod}
          setTimePeriod={setAiTimePeriod}
        />
      )}

      {activeTab === 'test-lab' && (
        <TestLabTab
          hskLevel={testLabHskLevel}
          setHskLevel={setTestLabHskLevel}
          position={testLabPosition}
          setPosition={setTestLabPosition}
          focusWords={testLabFocusWords}
          setFocusWords={setTestLabFocusWords}
          bypassCache={testLabBypassCache}
          setBypassCache={setTestLabBypassCache}
          running={testLabRunning}
          result={testLabResult}
          cacheStats={testLabCacheStats}
          suggestedWords={testLabSuggestedWords}
          onRunTest={runTestLabTest}
          onCancel={cancelTestLabTest}
          loading={loading}
          elapsedMs={testLabElapsedMs}
          tutorSummary={tutorSummary}
          streamingSteps={testLabSteps}
          runningCost={testLabRunningCost}
        />
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
// AI USAGE TAB - Control Suite for DeepSeek, Qwen, ElevenLabs
// ═══════════════════════════════════════════════════════════

// Provider colors fallback
const PROVIDER_COLORS: Record<string, string> = {
  deepseek: '#0066FF',
  qwen: '#7C3AED',
  elevenlabs: '#10B981',
  cloudflare: '#F59E0B',
  other: '#6B7280',
};

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  elevenlabs: 'ElevenLabs',
  cloudflare: 'Cloudflare AI',
  other: 'Other',
};

// Prepare chart data from dailyByProvider
interface ChartDataPoint {
  date: string;
  deepseek: number;
  qwen: number;
  elevenlabs: number;
  other: number;
  total: number;
}

function prepareChartData(dailyByProvider: DailyUsageByProvider[]): ChartDataPoint[] {
  // Group by date
  const byDate: Record<string, ChartDataPoint> = {};
  
  for (const entry of dailyByProvider) {
    if (!byDate[entry.date]) {
      byDate[entry.date] = { 
        date: entry.date, 
        deepseek: 0, 
        qwen: 0, 
        elevenlabs: 0, 
        other: 0,
        total: 0 
      };
    }
    const provider = entry.provider as keyof Omit<ChartDataPoint, 'date' | 'total'>;
    if (provider in byDate[entry.date]) {
      byDate[entry.date][provider] += entry.cost;
    } else {
      byDate[entry.date].other += entry.cost;
    }
    byDate[entry.date].total += entry.cost;
  }
  
  // Sort by date ascending and take last 14 days
  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

// Simple stacked bar chart component (no external dependencies)
function CostChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return null;
  
  const maxCost = Math.max(...data.map(d => d.total), 0.001);
  const providers = ['deepseek', 'qwen', 'elevenlabs', 'other'] as const;
  
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {providers.filter(p => data.some(d => d[p] > 0)).map(provider => (
          <div key={provider} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: PROVIDER_COLORS[provider] }}
            />
            <span className="text-gray-600">{PROVIDER_LABELS[provider]}</span>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="flex items-end gap-1 h-48">
        {data.map((day, i) => {
          const barHeight = (day.total / maxCost) * 100;
          const deepseekH = day.total > 0 ? (day.deepseek / day.total) * barHeight : 0;
          const qwenH = day.total > 0 ? (day.qwen / day.total) * barHeight : 0;
          const elevenlabsH = day.total > 0 ? (day.elevenlabs / day.total) * barHeight : 0;
          const otherH = day.total > 0 ? (day.other / day.total) * barHeight : 0;
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center group">
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute -mt-20 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap">
                <div className="font-semibold">{day.date}</div>
                <div>Total: ${day.total.toFixed(4)}</div>
                {day.deepseek > 0 && <div>DeepSeek: ${day.deepseek.toFixed(4)}</div>}
                {day.qwen > 0 && <div>Qwen: ${day.qwen.toFixed(4)}</div>}
                {day.elevenlabs > 0 && <div>ElevenLabs: ${day.elevenlabs.toFixed(4)}</div>}
              </div>
              
              {/* Stacked bar */}
              <div 
                className="w-full flex flex-col-reverse rounded-t transition-all hover:opacity-80"
                style={{ height: `${Math.max(barHeight, 2)}%` }}
              >
                {otherH > 0 && (
                  <div style={{ height: `${otherH}%`, backgroundColor: PROVIDER_COLORS.other }} />
                )}
                {elevenlabsH > 0 && (
                  <div style={{ height: `${elevenlabsH}%`, backgroundColor: PROVIDER_COLORS.elevenlabs }} />
                )}
                {qwenH > 0 && (
                  <div style={{ height: `${qwenH}%`, backgroundColor: PROVIDER_COLORS.qwen }} />
                )}
                {deepseekH > 0 && (
                  <div style={{ height: `${deepseekH}%`, backgroundColor: PROVIDER_COLORS.deepseek }} className="rounded-t" />
                )}
              </div>
              
              {/* Date label */}
              <div className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-top-left w-8 truncate">
                {day.date.slice(5)} {/* Show MM-DD */}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Y-axis label */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>$0</span>
        <span>${maxCost.toFixed(4)}</span>
      </div>
    </div>
  );
}

function AIUsageTab({ 
  summary, 
  daily, 
  dailyByProvider,
  providers: _providers,
  tutorSummary,
  loading, 
  timePeriod, 
  setTimePeriod 
}: { 
  summary: AIUsageSummary | null; 
  daily: DailyUsage[]; 
  dailyByProvider: DailyUsageByProvider[];
  providers: Record<string, ProviderConfig>;
  tutorSummary: TutorUsageSummary | null;
  loading: boolean;
  timePeriod: '7' | '30' | '90' | '0';
  setTimePeriod: (v: '7' | '30' | '90' | '0') => void;
}) {
  void _providers;
  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  // Prepare chart data - aggregate by date and provider
  const chartData = prepareChartData(dailyByProvider);

  const periodLabel = timePeriod === '0' ? 'All Time' : `Last ${timePeriod} Days`;

  // Get active providers from byProvider
  const activeProviders = summary?.byProvider 
    ? Object.entries(summary.byProvider).filter(([_, data]) => data.requests > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header with Time Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Provider Analytics</h2>
          <p className="text-sm text-gray-500">
            {summary?.firstLogDate 
              ? `Tracking since ${summary.firstLogDate}` 
              : 'No data yet'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['7', '30', '90', '0'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                timePeriod === period
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {period === '0' ? 'All Time' : `${period}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-medium text-gray-500">Total Requests</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{summary.totalRequests.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">{periodLabel}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-medium text-gray-500">Total Tokens</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{summary.totalTokens.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">Characters for ElevenLabs</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-5">
            <div className="text-sm font-medium text-emerald-600">Total Cost</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">${summary.totalCost.toFixed(2)}</div>
            <div className="text-xs text-emerald-500 mt-1">{periodLabel}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-medium text-gray-500">Active Providers</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{activeProviders.length}</div>
            <div className="text-xs text-gray-400 mt-1">DeepSeek, Qwen, ElevenLabs</div>
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {activeProviders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Usage by Provider</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {activeProviders.map(([provider, data]) => {
              const color = PROVIDER_COLORS[provider] || PROVIDER_COLORS.other;
              const label = PROVIDER_LABELS[provider] || provider;
              const percentage = summary?.totalCost ? (data.cost / summary.totalCost) * 100 : 0;
              const isElevenLabs = provider === 'elevenlabs';
              
              return (
                <div key={provider} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {label.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{label}</div>
                        <div className="text-xs text-gray-500">
                          {data.models.length > 0 
                            ? data.models.slice(0, 2).join(', ') + (data.models.length > 2 ? ` +${data.models.length - 2}` : '')
                            : 'No models'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color }}>${data.cost.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Requests:</span>{' '}
                      <span className="font-medium">{data.requests.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">{isElevenLabs ? 'Characters:' : 'Tokens:'}</span>{' '}
                      <span className="font-medium">{data.tokens.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg/req:</span>{' '}
                      <span className="font-medium">
                        {data.requests > 0 ? Math.round(data.tokens / data.requests).toLocaleString() : 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost Over Time Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Cost Over Time by Provider</h3>
            <p className="text-sm text-gray-500 mt-1">Last 14 days of AI spending</p>
          </div>
          <div className="p-5">
            <CostChart data={chartData} />
          </div>
        </div>
      )}

      {/* AI Tutor Lesson Generation Section */}
      {tutorSummary && tutorSummary.totalLessons > 0 && (
        <AITutorSection tutorSummary={tutorSummary} />
      )}

      {/* Daily Usage Table */}
      {daily.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Daily Usage</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-5 font-medium">Date</th>
                  <th className="text-right py-3 px-5 font-medium">Requests</th>
                  <th className="text-right py-3 px-5 font-medium">Tokens/Chars</th>
                  <th className="text-right py-3 px-5 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {daily.slice(0, 30).map((d, i) => (
                  <tr key={d.date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-3 px-5 font-medium">{d.date}</td>
                    <td className="text-right py-3 px-5">{d.requests.toLocaleString()}</td>
                    <td className="text-right py-3 px-5">{(d.tokens || 0).toLocaleString()}</td>
                    <td className="text-right py-3 px-5 text-emerald-600 font-medium">${(d.cost || 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!summary || summary.totalRequests === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Usage Data Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            AI usage will be tracked here when you use features like example sentence generation,
            vocabulary tagging, or audio synthesis.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AI TUTOR SECTION
// ═══════════════════════════════════════════════════════════

function AITutorSection({ tutorSummary }: { tutorSummary: TutorUsageSummary }) {
  // Simple chart for tutor daily costs
  const maxDailyCost = Math.max(...tutorSummary.daily.map(d => d.cost), 0.0001);
  
  // Format latency nicely
  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 overflow-hidden">
      <div className="p-5 border-b border-violet-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI Tutor Lesson Generation</h3>
          <p className="text-sm text-gray-500">Mobile app personalized lessons (Qwen 32B)</p>
        </div>
      </div>

      {/* Summary Cards - Row 1: Lessons & Cost */}
      <div className="p-5 grid grid-cols-4 gap-4">
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Lessons</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{tutorSummary.totalLessons}</div>
          <div className="text-xs text-gray-400 mt-1">Generated for users</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Cost</div>
          <div className="text-2xl font-bold text-violet-600 mt-1">${tutorSummary.totalCost.toFixed(4)}</div>
          <div className="text-xs text-gray-400 mt-1">OpenRouter API</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Avg Cost/Lesson</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">${tutorSummary.avgCostPerLesson.toFixed(5)}</div>
          <div className="text-xs text-gray-400 mt-1">~$0.00039 target</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Avg Latency</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatLatency(tutorSummary.avgLatencyMs)}</div>
          <div className="text-xs text-gray-400 mt-1">AI calls only</div>
        </div>
      </div>

      {/* Summary Cards - Row 2: Tokens & Performance */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-4">
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Tokens</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{tutorSummary.totalTokens.toLocaleString()}</div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Avg Tokens/Lesson</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {tutorSummary.totalLessons > 0 
              ? Math.round(tutorSummary.totalTokens / tutorSummary.totalLessons).toLocaleString() 
              : 0}
          </div>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Steps/Lesson</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {tutorSummary.recentLessons.length > 0 
              ? (tutorSummary.recentLessons.reduce((sum, l) => sum + l.steps, 0) / tutorSummary.recentLessons.length).toFixed(1)
              : '-'}
          </div>
          <div className="text-xs text-gray-400 mt-1">reading + practice + grammar</div>
        </div>
      </div>

      {/* Daily Chart */}
      {tutorSummary.daily.length > 0 && (
        <div className="px-5 pb-5">
          <div className="bg-white/70 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Lessons Generated Per Day</div>
            <div className="flex items-end gap-1 h-24">
              {tutorSummary.daily.slice(-14).reverse().map((day, i) => {
                const barHeight = (day.cost / maxDailyCost) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    {/* Tooltip */}
                    <div className="hidden group-hover:block absolute -top-20 bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap">
                      <div className="font-semibold">{day.date}</div>
                      <div>{day.lessons} lesson{day.lessons !== 1 ? 's' : ''}</div>
                      <div>${day.cost.toFixed(4)}</div>
                      <div>Avg latency: {formatLatency(day.avgLatencyMs)}</div>
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full bg-violet-500 rounded-t transition-all hover:bg-violet-400"
                      style={{ height: `${Math.max(barHeight, 4)}%` }}
                    />
                    {/* Lesson count */}
                    <div className="text-xs text-gray-500 mt-1">{day.lessons}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Lessons Table */}
      {tutorSummary.recentLessons.length > 0 && (
        <div className="border-t border-violet-100">
          <div className="p-4 bg-white/50">
            <div className="text-sm font-medium text-gray-700 mb-3">Recent User Generations</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-violet-100">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-left py-2 px-3 font-medium">Focus Words</th>
                    <th className="text-right py-2 px-3 font-medium">HSK</th>
                    <th className="text-right py-2 px-3 font-medium">Position</th>
                    <th className="text-right py-2 px-3 font-medium">Tokens</th>
                    <th className="text-right py-2 px-3 font-medium">Latency</th>
                    <th className="text-right py-2 px-3 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {tutorSummary.recentLessons.slice(0, 10).map((lesson) => (
                    <tr key={lesson.sessionId} className="border-b border-violet-50 hover:bg-violet-50/50">
                      <td className="py-2 px-3 font-medium">
                        {new Date(lesson.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-chinese">
                          {lesson.metadata?.focusWords?.slice(0, 3).join(', ') || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {lesson.metadata?.hskLevel || '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        L{lesson.metadata?.userLessonPosition || '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {(lesson.inputTokens + lesson.outputTokens).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {formatLatency(lesson.latencyMs)}
                      </td>
                      <td className="py-2 px-3 text-right text-violet-600 font-medium">
                        ${lesson.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {tutorSummary.totalLessons === 0 && (
        <div className="p-8 text-center">
          <div className="text-gray-500 mb-2">No AI Tutor lessons generated yet</div>
          <div className="text-sm text-gray-400">
            Lessons will appear here when users generate them from the mobile app
          </div>
        </div>
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

// ═══════════════════════════════════════════════════════════
// TEST LAB TAB
// ═══════════════════════════════════════════════════════════

function TestLabTab({
  hskLevel,
  setHskLevel,
  position,
  setPosition,
  focusWords,
  setFocusWords,
  bypassCache,
  setBypassCache,
  running,
  result,
  cacheStats,
  suggestedWords,
  onRunTest,
  onCancel,
  loading,
  elapsedMs,
  tutorSummary,
  streamingSteps,
  runningCost,
}: {
  hskLevel: number;
  setHskLevel: (v: number) => void;
  position: number;
  setPosition: (v: number) => void;
  focusWords: string;
  setFocusWords: (v: string) => void;
  bypassCache: boolean;
  setBypassCache: (v: boolean) => void;
  running: boolean;
  result: TestResult | null;
  cacheStats: CacheStats | null;
  suggestedWords: string[][];
  onRunTest: () => void;
  onCancel: () => void;
  loading: boolean;
  elapsedMs: number;
  tutorSummary: TutorUsageSummary | null;
  streamingSteps: TestStep[];
  runningCost: number;
}) {
  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Cache Stats + AI Cost */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Cached Lessons</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {loading ? '...' : cacheStats?.totalEntries || 0}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Total Hits</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {loading ? '...' : cacheStats?.totalHits || 0}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Hit Rate</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {loading ? '...' : `${((cacheStats?.hitRate || 0) * 100).toFixed(1)}%`}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Cache Savings</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            ${loading ? '...' : (cacheStats?.estimatedSavings || 0).toFixed(4)}
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm font-medium text-purple-600">AI Tutor Cost (All Time)</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            ${loading ? '...' : (tutorSummary?.totalCost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-purple-500 mt-1">
            {tutorSummary?.totalLessons || 0} lessons · ${((tutorSummary?.totalCost || 0) / Math.max(tutorSummary?.totalLessons || 1, 1)).toFixed(5)}/lesson
          </div>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Test Configuration</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <Label>HSK Level</Label>
            <select
              value={hskLevel}
              onChange={(e) => setHskLevel(Number(e.target.value))}
              className="w-full h-10 border rounded-lg px-3"
              disabled={running}
            >
              {[1, 2, 3, 4, 5, 6].map(level => (
                <option key={level} value={level}>HSK {level}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Lesson Position</Label>
            <Input
              type="number"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              min={1}
              max={500}
              disabled={running}
            />
          </div>
          <div>
            <Label>Focus Words (comma-separated)</Label>
            <Input
              value={focusWords}
              onChange={(e) => setFocusWords(e.target.value)}
              placeholder="学习,中文"
              disabled={running}
            />
          </div>
        </div>

        {/* Suggested Words */}
        {suggestedWords.length > 0 && (
          <div className="mb-4">
            <Label className="mb-2 block">Quick Select:</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedWords.map((words, idx) => (
                <button
                  key={idx}
                  onClick={() => setFocusWords(words.join(','))}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  disabled={running}
                >
                  {words.join(', ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bypassCache}
              onChange={(e) => setBypassCache(e.target.checked)}
              disabled={running}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Bypass cache (force generation)</span>
          </label>
        </div>

        {/* Run/Cancel Button with Timer and Cost */}
        <div className="flex gap-4">
          {running ? (
            <Button
              onClick={onCancel}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Test
            </Button>
          ) : (
            <Button
              onClick={onRunTest}
              disabled={!focusWords.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Test
            </Button>
          )}
          
          {/* Live Timer */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg min-w-[100px] justify-center">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-mono font-bold text-lg">
              {(elapsedMs / 1000).toFixed(1)}s
            </span>
          </div>
          
          {/* Running Cost */}
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg min-w-[120px] justify-center">
            <span className="text-amber-600 font-medium">Cost:</span>
            <span className="font-mono font-bold text-amber-700">
              ${(running ? runningCost : (result?.summary.totalCost || 0)).toFixed(5)}
            </span>
          </div>
        </div>
      </div>

      {/* Results - Show when running OR when we have result */}
      {(running || result || streamingSteps.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Live Logs - streams in real-time */}
          <div className="bg-gray-900 rounded-xl p-4 text-sm font-mono">
            <div className="text-gray-400 mb-3 flex items-center gap-2">
              <Code className="w-4 h-4" />
              Live Logs
              {running && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {streamingSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {getStepIcon(step.status)}
                  <div className="flex-1">
                    <div className="text-gray-300">
                      <span className="text-gray-500">[{((step.durationMs || 0) / 1000).toFixed(1)}s]</span>{' '}
                      {step.message}
                      {step.cost !== undefined && step.cost > 0 && (
                        <span className="text-amber-400 ml-2">(+${step.cost.toFixed(5)})</span>
                      )}
                    </div>
                    {step.details && (
                      <div className="text-gray-500 text-xs mt-0.5">
                        {JSON.stringify(step.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {running && streamingSteps.length === 0 && (
                <div className="text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to test server...
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Result</h4>
              {result.success ? (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Success
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Failed
                </span>
              )}
            </div>

            {result.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {result.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Duration</div>
                <div className="font-bold text-lg">{(result.summary.totalDurationMs / 1000).toFixed(2)}s</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Cost</div>
                <div className="font-bold text-lg">${result.summary.totalCost.toFixed(5)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Cache</div>
                <div className="font-bold text-lg">{result.summary.cacheHit ? '✅ HIT' : '❌ MISS'}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Pre-Filter</div>
                <div className="font-bold text-lg">
                  {result.summary.preFilterScore !== undefined 
                    ? `${result.summary.preFilterScore}/100 ${result.summary.preFilterPassed ? '✅' : '❌'}`
                    : 'N/A'}
                </div>
              </div>
            </div>

            {result.summary.cacheKey && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <div className="text-blue-600 font-medium">Cache Key</div>
                <code className="text-blue-800">{result.summary.cacheKey}</code>
              </div>
            )}

            {!result.summary.cacheHit && result.success && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="text-gray-600 mb-2">Attempts</div>
                <div className="flex gap-4">
                  <span>Reading: {result.summary.attemptsReading}</span>
                  <span>Practice: {result.summary.attemptsPractice}</span>
                  <span>Grammar: {result.summary.attemptsGrammar}</span>
                </div>
              </div>
            )}

            {result.lesson !== undefined && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(result.lesson, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Full Lesson JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
