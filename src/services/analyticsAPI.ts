/**
 * Analytics API Service
 * Provides insights into AI usage, content activity, and system events
 */

import { api } from './api';

export interface AIUsageRecord {
  id: string;
  userId: string | null;
  modelUsed: string;
  promptSlug: string | null;
  promptVersion: number | null;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  success: boolean;
  createdAt: number | string;
}

export interface AIUsageStats {
  summary: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
  };
  records: AIUsageRecord[];
}

export interface SystemEvent {
  id: string;
  eventType: string;
  userId: string | null;
  requestId: string | null;
  modelUsed: string | null;
  promptSlug: string | null;
  promptVersion: number | null;
  latencyMs: number | null;
  costUsd: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: number | string;
}

export interface ContentEvent extends SystemEvent {
  eventType: string; // starts with 'content.'
}

export interface AnalyticsFilters {
  from?: string; // ISO date
  to?: string;   // ISO date
  model?: string;
  prompt_slug?: string;
  success?: boolean;
  slug?: string;
  user_id?: string;
}

/**
 * Get AI usage statistics
 * @param filters - Query filters
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function getAIUsageStats(
  filters: AnalyticsFilters = {},
  signal?: AbortSignal
): Promise<AIUsageStats> {
  const searchParams = new URLSearchParams();
  
  if (filters.from) searchParams.set('from', filters.from);
  if (filters.to) searchParams.set('to', filters.to);
  if (filters.model) searchParams.set('model', filters.model);
  if (filters.prompt_slug) searchParams.set('prompt_slug', filters.prompt_slug);
  if (typeof filters.success === 'boolean') searchParams.set('success', String(filters.success));

  const queryString = searchParams.toString();
  const endpoint = `/v1/analytics/ai${queryString ? `?${queryString}` : ''}`;

  return api.get<AIUsageStats>(endpoint, signal);
}

/**
 * Get content-related events
 * @param filters - Query filters
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function getContentEvents(
  filters: AnalyticsFilters = {},
  signal?: AbortSignal
): Promise<{ records: ContentEvent[] }> {
  const searchParams = new URLSearchParams();
  
  if (filters.from) searchParams.set('from', filters.from);
  if (filters.to) searchParams.set('to', filters.to);
  if (filters.slug) searchParams.set('slug', filters.slug);
  if (filters.user_id) searchParams.set('user_id', filters.user_id);

  const queryString = searchParams.toString();
  const endpoint = `/v1/analytics/content${queryString ? `?${queryString}` : ''}`;

  return api.get<{ records: ContentEvent[] }>(endpoint, signal);
}

/**
 * Get system events
 */
export async function getSystemEvents(
  filters: AnalyticsFilters = {}
): Promise<{ records: SystemEvent[] }> {
  const searchParams = new URLSearchParams();
  
  if (filters.from) searchParams.set('from', filters.from);
  if (filters.to) searchParams.set('to', filters.to);

  const queryString = searchParams.toString();
  const endpoint = `/v1/analytics/system${queryString ? `?${queryString}` : ''}`;

  return api.get<{ records: SystemEvent[] }>(endpoint);
}

/**
 * User statistics response (legacy)
 */
export interface UserStats {
  total: number;
  tierBreakdown: {
    free: number;
    premium: number;
    pro: number;
  };
  recentSignups: {
    last30Days: number;
  };
  dailySignups: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Get user statistics (legacy)
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function getUserStats(signal?: AbortSignal): Promise<UserStats> {
  return api.get<UserStats>('/v1/analytics/users', signal);
}

// ═══════════════════════════════════════════════════════════
// NEW USER ANALYTICS API (Phase 2)
// ═══════════════════════════════════════════════════════════

/**
 * User analytics overview response
 */
export interface UserAnalyticsOverview {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  newSignups: {
    today: number;
    last7Days: number;
    last30Days: number;
  };
  tierBreakdown: {
    free: number;
    premium: number;
    pro: number;
  };
  avgSessionDuration: number;
}

/**
 * User growth data point
 */
export interface UserGrowthData {
  date: string;
  totalUsers: number;
  newSignups: number;
  activeUsers: number;
}

/**
 * Retention cohort data
 */
export interface RetentionCohort {
  cohortWeek: string;
  weekNumber: number;
  usersInCohort: number;
  usersRetained: number;
  retentionRate: number;
}

/**
 * Get comprehensive user analytics overview
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function getUserAnalyticsOverview(
  signal?: AbortSignal
): Promise<UserAnalyticsOverview> {
  return api.get<UserAnalyticsOverview>('/v1/analytics/users/overview', signal);
}

/**
 * Get user growth data for charts
 * @param days - Number of days to fetch (default: 30)
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function getUserGrowthData(
  days: number = 30,
  signal?: AbortSignal
): Promise<UserGrowthData[]> {
  const response = await api.get<{ data: UserGrowthData[] }>(
    `/v1/analytics/users/growth?days=${days}`,
    signal
  );
  return response.data;
}

/**
 * Get retention cohort data
 * @param weeks - Number of weeks to fetch (default: 8)
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function getRetentionCohorts(
  weeks: number = 8,
  signal?: AbortSignal
): Promise<RetentionCohort[]> {
  const response = await api.get<{ cohorts: RetentionCohort[] }>(
    `/v1/analytics/users/retention?weeks=${weeks}`,
    signal
  );
  return response.cohorts;
}

/**
 * Get tier breakdown history
 * @param days - Number of days to fetch (default: 30)
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function getTierHistory(
  days: number = 30,
  signal?: AbortSignal
): Promise<Array<{ date: string; free: number; premium: number; pro: number }>> {
  const response = await api.get<{ data: Array<{ date: string; free: number; premium: number; pro: number }> }>(
    `/v1/analytics/users/tiers?days=${days}`,
    signal
  );
  return response.data;
}

// ═══════════════════════════════════════════════════════════
// CONTENT ANALYTICS API (Phase 3)
// ═══════════════════════════════════════════════════════════

/**
 * Content analytics overview response
 */
export interface ContentOverview {
  lessons: {
    total: number;
    published: number;
    totalCompletions: number;
    avgCompletionRate: number;
  };
  stories: {
    total: number;
    published: number;
    totalReads: number;
  };
  vocabulary: {
    total: number;
    wordsLearned: number;
    wordsMastered: number;
  };
}

/**
 * Content engagement data point
 */
export interface ContentEngagementData {
  date: string;
  lessons: number;
  stories: number;
  vocabulary: number;
}

/**
 * Popular content item
 */
export interface PopularContent {
  id: string;
  title: string;
  hskLevel: number;
  views: number;
  completions: number;
  completionRate: number;
}

/**
 * HSK level breakdown data
 */
export interface HskBreakdown {
  level: number;
  lessons: number;
  stories: number;
  vocabulary: number;
  completions: number;
  uniqueUsers: number;
}

/**
 * Vocabulary progress data
 */
export interface VocabProgress {
  new: number;
  weak: number;
  learning: number;
  mastered: number;
  total: number;
}

/**
 * Get content analytics overview
 */
export async function getContentOverview(signal?: AbortSignal): Promise<ContentOverview> {
  return api.get<ContentOverview>('/v1/analytics/content/overview', signal);
}

/**
 * Get content engagement data for charts
 */
export async function getContentEngagementData(
  days: number = 30,
  signal?: AbortSignal
): Promise<ContentEngagementData[]> {
  const response = await api.get<{ data: ContentEngagementData[] }>(
    `/v1/analytics/content/engagement?days=${days}`,
    signal
  );
  return response.data;
}

/**
 * Get popular lessons
 */
export async function getPopularLessons(
  limit: number = 10,
  signal?: AbortSignal
): Promise<PopularContent[]> {
  const response = await api.get<{ lessons: PopularContent[] }>(
    `/v1/analytics/content/popular/lessons?limit=${limit}`,
    signal
  );
  return response.lessons;
}

/**
 * Get popular stories
 */
export async function getPopularStories(
  limit: number = 10,
  signal?: AbortSignal
): Promise<PopularContent[]> {
  const response = await api.get<{ stories: PopularContent[] }>(
    `/v1/analytics/content/popular/stories?limit=${limit}`,
    signal
  );
  return response.stories;
}

/**
 * Get HSK level breakdown
 */
export async function getHskBreakdown(signal?: AbortSignal): Promise<HskBreakdown[]> {
  const response = await api.get<{ breakdown: HskBreakdown[] }>(
    '/v1/analytics/content/hsk-breakdown',
    signal
  );
  return response.breakdown;
}

/**
 * Get vocabulary learning progress
 */
export async function getVocabProgress(signal?: AbortSignal): Promise<VocabProgress> {
  return api.get<VocabProgress>('/v1/analytics/content/vocab-progress', signal);
}

// ═══════════════════════════════════════════════════════════
// ENGAGEMENT TRACKING API (Phase 3b)
// ═══════════════════════════════════════════════════════════

/**
 * Detailed lesson engagement stats
 */
export interface LessonEngagementStats {
  lessonId: string;
  title?: string;
  hskLevel?: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  avgTimeSeconds: number;
  minTimeSeconds: number;
  maxTimeSeconds: number;
  medianTimeSeconds: number;
  p90TimeSeconds: number;
  avgScore: number;
  blockStats?: BlockStat[];
  lastEventAt?: string;
}

export interface BlockStat {
  index: number;
  type: string;
  avgTime: number;
  completions: number;
  dropOffs: number;
}

/**
 * Detailed story engagement stats
 */
export interface StoryEngagementStats {
  storyId: string;
  title?: string;
  hskLevel?: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  avgTimeSeconds: number;
  avgSentencesRead: number;
  sentenceStats?: SentenceStat[];
  lastEventAt?: string;
}

export interface SentenceStat {
  index: number;
  avgTime: number;
  reads: number;
  dropOffs: number;
}

/**
 * Engagement overview
 */
export interface EngagementOverview {
  lessons: {
    totalStarts: number;
    totalCompletions: number;
    avgCompletionRate: number;
    avgTimeSeconds: number;
  };
  stories: {
    totalStarts: number;
    totalCompletions: number;
    avgCompletionRate: number;
  };
  vocab: {
    totalReviews: number;
    avgAccuracyRate: number;
  };
  trends: Array<{
    date: string;
    lessonCompletions: number;
    storyCompletions: number;
    vocabReviews: number;
  }>;
}

/**
 * Get engagement overview
 */
export async function getEngagementOverview(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<EngagementOverview> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return api.get<EngagementOverview>(
    `/v1/analytics/engagement/overview${query ? `?${query}` : ''}`,
    signal
  );
}

/**
 * Get all lesson engagement stats
 */
export async function getAllLessonEngagementStats(
  options: { hskLevel?: number; limit?: number; orderBy?: 'completions' | 'time' | 'rate' } = {},
  signal?: AbortSignal
): Promise<LessonEngagementStats[]> {
  const params = new URLSearchParams();
  if (options.hskLevel) params.set('hskLevel', String(options.hskLevel));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.orderBy) params.set('orderBy', options.orderBy);
  const query = params.toString();
  const response = await api.get<{ lessons: LessonEngagementStats[] }>(
    `/v1/analytics/engagement/lessons${query ? `?${query}` : ''}`,
    signal
  );
  return response.lessons;
}

/**
 * Get stats for a specific lesson
 */
export async function getLessonEngagementStats(
  lessonId: string,
  signal?: AbortSignal
): Promise<LessonEngagementStats | null> {
  try {
    return await api.get<LessonEngagementStats>(
      `/v1/analytics/engagement/lessons/${lessonId}`,
      signal
    );
  } catch {
    return null;
  }
}

/**
 * Get all story engagement stats
 */
export async function getAllStoryEngagementStats(
  options: { hskLevel?: number; limit?: number; orderBy?: 'completions' | 'time' | 'rate' } = {},
  signal?: AbortSignal
): Promise<StoryEngagementStats[]> {
  const params = new URLSearchParams();
  if (options.hskLevel) params.set('hskLevel', String(options.hskLevel));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.orderBy) params.set('orderBy', options.orderBy);
  const query = params.toString();
  const response = await api.get<{ stories: StoryEngagementStats[] }>(
    `/v1/analytics/engagement/stories${query ? `?${query}` : ''}`,
    signal
  );
  return response.stories;
}

/**
 * Get stats for a specific story
 */
export async function getStoryEngagementStats(
  storyId: string,
  signal?: AbortSignal
): Promise<StoryEngagementStats | null> {
  try {
    return await api.get<StoryEngagementStats>(
      `/v1/analytics/engagement/stories/${storyId}`,
      signal
    );
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// AI ANALYTICS API (Phase 4)
// ═══════════════════════════════════════════════════════════

/**
 * AI analytics overview
 */
export interface AIOverview {
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  successRate: number;
  avgLatencyMs: number;
  uniqueUsers: number;
}

/**
 * Daily AI usage
 */
export interface DailyAIUsage {
  date: string;
  requests: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  avgLatencyMs: number;
  successCount: number;
  errorCount: number;
}

/**
 * Model breakdown
 */
export interface ModelBreakdown {
  model: string;
  requests: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  avgLatencyMs: number;
  successRate: number;
  costPer1kTokens: number;
}

/**
 * Prompt performance
 */
export interface PromptPerformance {
  promptSlug: string;
  activeVersion: number | null;
  requests: number;
  tokens: number;
  avgLatencyMs: number;
  successRate: number;
  avgCost: number;
  lastUsed: string | null;
}

/**
 * Latency distribution
 */
export interface LatencyDistribution {
  bucket: string;
  count: number;
  percentage: number;
}

/**
 * AI error
 */
export interface AIError {
  id: string;
  timestamp: string;
  model: string;
  promptSlug: string | null;
  errorMessage: string;
  latencyMs: number | null;
}

/**
 * Get AI analytics overview
 */
export async function getAIOverview(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<AIOverview> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return api.get<AIOverview>(
    `/v1/analytics/ai/overview${query ? `?${query}` : ''}`,
    signal
  );
}

/**
 * Get daily AI usage
 */
export async function getDailyAIUsage(
  days: number = 30,
  signal?: AbortSignal
): Promise<DailyAIUsage[]> {
  const response = await api.get<{ data: DailyAIUsage[] }>(
    `/v1/analytics/ai/daily?days=${days}`,
    signal
  );
  return response.data;
}

/**
 * Get model breakdown
 */
export async function getModelBreakdown(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<ModelBreakdown[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  const response = await api.get<{ models: ModelBreakdown[] }>(
    `/v1/analytics/ai/models${query ? `?${query}` : ''}`,
    signal
  );
  return response.models;
}

/**
 * Get prompt performance
 */
export async function getPromptPerformance(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<PromptPerformance[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  const response = await api.get<{ prompts: PromptPerformance[] }>(
    `/v1/analytics/ai/prompts${query ? `?${query}` : ''}`,
    signal
  );
  return response.prompts;
}

/**
 * Get latency distribution and percentiles
 */
export async function getLatencyData(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<{ distribution: LatencyDistribution[]; percentiles: { p50: number; p90: number; p99: number } }> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return api.get<{ distribution: LatencyDistribution[]; percentiles: { p50: number; p90: number; p99: number } }>(
    `/v1/analytics/ai/latency${query ? `?${query}` : ''}`,
    signal
  );
}

/**
 * Get recent AI errors
 */
export async function getAIErrors(
  limit: number = 20,
  signal?: AbortSignal
): Promise<AIError[]> {
  const response = await api.get<{ errors: AIError[] }>(
    `/v1/analytics/ai/errors?limit=${limit}`,
    signal
  );
  return response.errors;
}

/**
 * Get hourly AI usage for today
 */
export async function getHourlyAIUsage(
  signal?: AbortSignal
): Promise<Array<{ hour: number; requests: number; tokens: number }>> {
  const response = await api.get<{ hourly: Array<{ hour: number; requests: number; tokens: number }> }>(
    '/v1/analytics/ai/hourly',
    signal
  );
  return response.hourly;
}

/**
 * Helper: Get date range presets
 */
export const DATE_RANGES = {
  today: () => ({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  }),
  last7Days: () => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  },
  last30Days: () => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  },
  thisMonth: () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  },
};

// ============================================
// REVENUE ANALYTICS
// ============================================

export interface RevenueOverview {
  totalSubscribers: number;
  activeSubscribers: number;
  mrr: number; // In cents
  arr: number; // In cents
  churnRate: number;
  avgRevenuePerUser: number; // In cents
}

export interface TierBreakdown {
  tier: string;
  count: number;
  percentage: number;
  mrr: number;
}

export interface PlatformBreakdown {
  platform: string;
  count: number;
  percentage: number;
  mrr: number;
}

export interface SubscriptionTrend {
  date: string;
  newSubscriptions: number;
  cancellations: number;
  expirations: number;
  netChange: number;
}

export interface RevenueEvent {
  id: string;
  eventType: string;
  userId: string;
  tier: string;
  platform: string;
  productId: string;
  timestamp: number;
}

export interface MRRHistoryPoint {
  date: string;
  mrr: number;
}

/**
 * Get revenue overview metrics (MRR, ARR, churn, etc.)
 */
export async function getRevenueOverview(): Promise<RevenueOverview> {
  return api.get<RevenueOverview>('/v1/analytics/revenue/overview');
}

/**
 * Get subscriber breakdown by tier
 */
export async function getRevenueTiers(): Promise<{ tiers: TierBreakdown[] }> {
  return api.get<{ tiers: TierBreakdown[] }>('/v1/analytics/revenue/tiers');
}

/**
 * Get subscriber breakdown by platform
 */
export async function getRevenuePlatforms(): Promise<{ platforms: PlatformBreakdown[] }> {
  return api.get<{ platforms: PlatformBreakdown[] }>('/v1/analytics/revenue/platforms');
}

/**
 * Get subscription trends over time
 */
export async function getRevenueTrends(days: number = 30): Promise<{ trends: SubscriptionTrend[] }> {
  return api.get<{ trends: SubscriptionTrend[] }>(`/v1/analytics/revenue/trends?days=${days}`);
}

/**
 * Get MRR history over time
 */
export async function getMRRHistory(days: number = 90): Promise<{ history: MRRHistoryPoint[] }> {
  return api.get<{ history: MRRHistoryPoint[] }>(`/v1/analytics/revenue/mrr-history?days=${days}`);
}

/**
 * Get recent subscription events
 */
export async function getRevenueEvents(limit: number = 50): Promise<{ events: RevenueEvent[] }> {
  return api.get<{ events: RevenueEvent[] }>(`/v1/analytics/revenue/events?limit=${limit}`);
}

/**
 * Get subscriber counts by status
 */
export async function getRevenueStatus(): Promise<{ status: Record<string, number> }> {
  return api.get<{ status: Record<string, number> }>('/v1/analytics/revenue/status');
}

/**
 * Get count of subscriptions expiring soon
 */
export async function getExpiringSubscriptions(days: number = 7): Promise<{ expiring_count: number; days_ahead: number }> {
  return api.get<{ expiring_count: number; days_ahead: number }>(`/v1/analytics/revenue/expiring?days=${days}`);
}

/**
 * Helper: Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Helper: Format number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// ═══════════════════════════════════════════════════════════
// COSTS ANALYTICS
// ═══════════════════════════════════════════════════════════

export interface CostSummary {
  totalAICost: number;
  totalAudioCost: number;
  totalCombined: number;
  avgCostPerStory: number;
  storiesPerDollarAI: number;
  segmentsPerDollarAudio: number;
}

export interface CostByType {
  type: string;
  requests: number;
  tokens: number;
  cost: number;
  costPer: number;
}

export interface CostByModel {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  costPer1kTokens: number;
}

export interface AudioCostInfo {
  configured: boolean;
  charactersUsed: number;
  segmentsGenerated: number;
  estimatedCost: number;
  costPerSegment: number;
  segmentsPerDollar: number;
  costPer1kChars: number;
}

export interface DailyCost {
  date: string;
  aiCost: number;
  audioCost: number;
}

export interface CostsAnalytics {
  summary: CostSummary;
  aiByType: CostByType[];
  aiByModel: CostByModel[];
  audio: AudioCostInfo;
  daily: DailyCost[];
  dateRange: { from: string; to: string };
}

/**
 * Get comprehensive cost breakdown for AI and audio
 */
export async function getCostsAnalytics(from?: string, to?: string): Promise<CostsAnalytics> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const query = params.toString();
  return api.get<CostsAnalytics>(`/v1/analytics/costs${query ? `?${query}` : ''}`);
}

/**
 * Format cost with precision based on value
 */
export function formatCost(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.001) return `$${value.toFixed(6)}`;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return formatCurrency(value);
}

/**
 * Format "X per dollar" metric
 */
export function formatPerDollar(perDollar: number): string {
  if (perDollar === 0) return '—';
  if (perDollar >= 10000) return `~${Math.round(perDollar / 1000)}K/$1`;
  return `~${perDollar.toLocaleString()}/$1`;
}

