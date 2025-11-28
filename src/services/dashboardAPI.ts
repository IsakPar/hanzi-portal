/**
 * Dashboard API Service
 * Aggregates stats from multiple endpoints for the dashboard
 */

import { lessonAPI } from './lessonAPI';
import { searchVocabulary } from './vocabularyAPI';
import { getAIUsageStats, getContentEvents, getUserStats, DATE_RANGES, type UserStats } from './analyticsAPI';
import { logger } from '@/utils/logger';

export interface DashboardStats {
  lessons: {
    total: number;
    loading: boolean;
    error: string | null;
  };
  vocabulary: {
    total: number;
    loading: boolean;
    error: string | null;
  };
  aiUsage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    loading: boolean;
    error: string | null;
  };
}

export interface RecentActivityItem {
  id: string;
  type: 'lesson' | 'vocab' | 'system';
  title: string;
  time: string;
  eventType: string;
}

/**
 * Fetch lesson count
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function fetchLessonCount(signal?: AbortSignal): Promise<number> {
  try {
    const response = await lessonAPI.getAll(undefined, signal);
    return response.total;
  } catch (err) {
    logger.error('Failed to fetch lesson count:', err);
    throw err;
  }
}

/**
 * Fetch vocabulary count
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function fetchVocabularyCount(signal?: AbortSignal): Promise<number> {
  try {
    const response = await searchVocabulary({ limit: 1 }, signal);
    return response.total;
  } catch (err) {
    logger.error('Failed to fetch vocabulary count:', err);
    throw err;
  }
}

/**
 * Fetch AI usage stats for the last 30 days
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function fetchAIUsageStats(signal?: AbortSignal): Promise<{
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}> {
  try {
    const dateRange = DATE_RANGES.last30Days();
    const stats = await getAIUsageStats({
      from: dateRange.from,
      to: dateRange.to,
    }, signal);
    return {
      totalRequests: stats.summary.totalRequests,
      totalTokens: stats.summary.totalTokens,
      totalCost: stats.summary.totalCost,
    };
  } catch (err) {
    logger.error('Failed to fetch AI usage stats:', err);
    throw err;
  }
}

/**
 * Fetch recent activity from content events
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function fetchRecentActivity(signal?: AbortSignal): Promise<RecentActivityItem[]> {
  try {
    const dateRange = DATE_RANGES.last7Days();
    const events = await getContentEvents({
      from: dateRange.from,
      to: dateRange.to,
    }, signal);

    return events.records.slice(0, 10).map((event) => {
      // Parse event type to determine activity type
      let type: 'lesson' | 'vocab' | 'system' = 'system';
      let title = event.eventType || 'Unknown Event';

      if (event.eventType?.includes('lesson')) {
        type = 'lesson';
        title = formatEventTitle(event.eventType, 'Lesson');
      } else if (event.eventType?.includes('vocab')) {
        type = 'vocab';
        title = formatEventTitle(event.eventType, 'Vocabulary');
      }

      // Format time
      const createdAt =
        typeof event.createdAt === 'number'
          ? new Date(event.createdAt * 1000)
          : new Date(event.createdAt);

      return {
        id: event.id,
        type,
        title,
        time: formatRelativeTime(createdAt),
        eventType: event.eventType,
      };
    });
  } catch (err) {
    logger.error('Failed to fetch recent activity:', err);
    throw err;
  }
}

/**
 * Fetch user statistics
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function fetchUserStats(signal?: AbortSignal): Promise<UserStats> {
  try {
    return await getUserStats(signal);
  } catch (err) {
    logger.error('Failed to fetch user stats:', err);
    throw err;
  }
}

/**
 * Format event type into readable title
 */
function formatEventTitle(eventType: string, prefix: string): string {
  const action = eventType.split('.').pop() || '';
  const actionLabels: Record<string, string> = {
    created: 'created',
    updated: 'updated',
    deleted: 'deleted',
    published: 'published',
    unpublished: 'unpublished',
    bulk_imported: 'bulk imported',
  };
  return `${prefix} ${actionLabels[action] || action}`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

/**
 * Format large numbers with K, M suffixes
 */
export function formatCompactNumber(num: number | null | undefined): string {
  if (num == null) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

/**
 * Aggregated dashboard data for overview
 */
export interface DashboardData {
  userCount: number;
  lessonCount: number;
  vocabularyCount: number;
}

/**
 * Fetch aggregated dashboard data
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function fetchDashboardData(signal?: AbortSignal): Promise<DashboardData> {
  try {
    const [userStats, lessonCount, vocabCount] = await Promise.all([
      fetchUserStats(signal).catch(() => ({ total: 0 })),
      fetchLessonCount(signal).catch(() => 0),
      fetchVocabularyCount(signal).catch(() => 0),
    ]);

    return {
      userCount: userStats.total,
      lessonCount,
      vocabularyCount: vocabCount,
    };
  } catch (err) {
    logger.error('Failed to fetch dashboard data:', err);
    return {
      userCount: 0,
      lessonCount: 0,
      vocabularyCount: 0,
    };
  }
}

