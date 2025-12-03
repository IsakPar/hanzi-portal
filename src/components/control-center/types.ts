// ═══════════════════════════════════════════════════════════
// CONTROL CENTER TYPES
// ═══════════════════════════════════════════════════════════

export interface StagedLesson {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
  contentStatus: string;
  updatedAt: string;
}

export interface StagedStory {
  id: string;
  title: string;
  hskLevel: number;
  contentStatus: string;
  updatedAt: string;
}

export interface TestDevice {
  id: string;
  deviceId: string;
  name: string;
  platform: 'ios' | 'android' | null;
  createdAt: string;
}

export interface Overview {
  lessons: { draft: number; staging: number; live: number };
  stories: { draft: number; staging: number; live: number };
  total: { draft: number; staging: number; live: number };
}

export interface AnnouncementSchema {
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

export interface Announcement {
  id: string;
  title: string;
  uiSchema: AnnouncementSchema;
  targetAudience: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  priority: number;
}

export interface Template {
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

export interface ProviderConfig {
  name: string;
  color: string;
  models: string[];
}

export interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  byProvider: Record<string, { requests: number; tokens: number; cost: number; models: string[] }>;
  firstLogDate: string | null;
}

export interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface DailyUsageByProvider {
  date: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface TutorDailyUsage {
  date: string;
  lessons: number;
  cost: number;
  tokens: number;
  avgLatencyMs: number;
}

export interface TutorRecentLesson {
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

export interface TutorUsageSummary {
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
export interface TestStep {
  timestamp: string;
  step: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message: string;
  durationMs?: number;
  cost?: number;
  details?: Record<string, unknown>;
}

export interface TestResult {
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

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  estimatedSavings: number;
}

export type Tab = 'content' | 'devices' | 'announcements' | 'ai-usage' | 'test-lab';

