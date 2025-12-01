/**
 * k6 Performance Results API
 * 
 * Fetches load test results from the backend.
 */

import { api } from './api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface K6ResultListItem {
  id: string;
  test_type: 'smoke' | 'load' | 'soak' | 'stress';
  timestamp: string;
  status: 'success' | 'failure';
  p95_ms: number | null;
  error_rate: number | null;
  total_requests: number | null;
}

export interface K6ResultsListResponse {
  results: K6ResultListItem[];
  total: number;
  hasMore: boolean;
}

export interface K6Summary {
  metrics?: {
    http_req_duration?: {
      avg: number;
      min: number;
      med: number;
      max: number;
      'p(90)': number;
      'p(95)': number;
      'p(99)': number;
    };
    http_req_failed?: {
      rate: number;
    };
    http_reqs?: {
      count: number;
      rate: number;
    };
    iterations?: {
      count: number;
      rate: number;
    };
  };
}

export interface K6Result extends K6ResultListItem {
  date: string;
  commit_sha: string;
  branch: string;
  summary: K6Summary;
  github_run_url: string;
}

export interface K6DashboardSummary {
  latest_smoke: K6ResultListItem | null;
  latest_load: K6ResultListItem | null;
  latest_soak: K6ResultListItem | null;
  trends: {
    dates: string[];
    p95_values: (number | null)[];
    error_rates: (number | null)[];
  };
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get k6 dashboard summary
 */
export async function getK6Summary(): Promise<K6DashboardSummary> {
  return api.get<K6DashboardSummary>('/v1/admin/k6-results/summary');
}

/**
 * List k6 test results
 */
export async function listK6Results(options?: {
  limit?: number;
  type?: 'smoke' | 'load' | 'soak' | 'stress';
}): Promise<K6ResultsListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.type) params.set('type', options.type);
  
  const query = params.toString();
  return api.get<K6ResultsListResponse>(`/v1/admin/k6-results${query ? `?${query}` : ''}`);
}

/**
 * Get specific k6 result details
 */
export async function getK6Result(id: string): Promise<K6Result> {
  return api.get<K6Result>(`/v1/admin/k6-results/${id}`);
}

