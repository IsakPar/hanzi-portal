import { useState, useEffect } from 'react';
import { Gauge, Smartphone, RefreshCw, BookOpen, AlertCircle, X, Megaphone, Zap, FlaskConical } from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  ContentPipelineTab,
  TestDevicesTab,
  AnnouncementsTab,
  AIUsageTab,
  TestLabTab,
  type Tab,
  type StagedLesson,
  type StagedStory,
  type TestDevice,
  type Overview,
  type Announcement,
  type Template,
  type ProviderConfig,
  type AIUsageSummary,
  type DailyUsage,
  type DailyUsageByProvider,
  type TutorUsageSummary,
  type TestStep,
  type TestResult,
  type CacheStats,
} from '@/components/control-center';

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
  const [aiTimePeriod, setAiTimePeriod] = useState<'7' | '30' | '90' | '0'>('0');
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
    } catch {
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
    } catch {
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
    } catch {
      setError('Failed to add test device');
    }
  }

  async function removeTestDevice(id: string) {
    try {
      await api.delete(`/v1/control-center/test-devices/${id}`);
      await fetchData();
    } catch {
      setError('Failed to remove test device');
    }
  }

  // Announcement functions
  async function deleteAnnouncement(id: string) {
    try {
      await api.delete(`/v1/announcements/admin/${id}`);
      await fetchData();
    } catch {
      setError('Failed to delete announcement');
    }
  }

  async function duplicateAnnouncement(id: string) {
    try {
      await api.post(`/v1/announcements/admin/duplicate/${id}`);
      await fetchData();
    } catch {
      setError('Failed to duplicate announcement');
    }
  }

  const totalStaged = stagedLessons.length + stagedStories.length;

  // Test Lab function - uses SSE for real-time streaming
  function runTestLabTest() {
    setTestLabRunning(true);
    setTestLabResult(null);
    setTestLabSteps([]);
    setTestLabElapsedMs(0);
    setTestLabRunningCost(0);
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setTestLabElapsedMs(Date.now() - startTime);
    }, 100);
    
    const API_BASE = import.meta.env.VITE_API_URL || 'https://api.studio.polymasterlabs.com';
    const token = localStorage.getItem('hm_access_token') || '';
    
    const params = new URLSearchParams({
      hskLevel: String(testLabHskLevel),
      lessonPosition: String(testLabPosition),
      focusWords: testLabFocusWords,
      bypassCache: String(testLabBypassCache),
      token,
    });
    
    const eventSource = new EventSource(`${API_BASE}/v1/ai-tutor-test/run-stream?${params}`);
    setTestLabEventSource(eventSource);
    
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
    
    eventSource.addEventListener('result', async (event) => {
      const data = JSON.parse(event.data);
      clearInterval(interval);
      eventSource.close();
      setTestLabEventSource(null);
      setTestLabRunning(false);
      
      setTestLabResult({
        success: data.success,
        lesson: data.lesson,
        steps: [],
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
      
      try {
        const cacheData = await api.get<{ success: boolean; stats: CacheStats }>('/v1/ai-tutor-test/cache-stats');
        setTestLabCacheStats(cacheData.stats || null);
      } catch { /* ignore */ }
    });
    
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
