/**
 * Performance Analytics API
 * Fetches performance metrics from backend
 */

import { api } from './api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface PerformanceOverview {
  totalRequests: number;
  avgLatencyMs: number;
  errorRate: number;
  totalErrors: number;
  systemEvents: number;
  uptime: number;
  period: string;
}

export interface LatencyDataPoint {
  hour: string;
  p50: number;
  p95: number;
  p99: number;
  requests: number;
}

export interface ErrorByCode {
  code: string;
  count: number;
  description: string;
}

export interface ErrorByType {
  eventType: string;
  count: number;
}

export interface ErrorBreakdown {
  byStatusCode: ErrorByCode[];
  byEventType: ErrorByType[];
}

export interface EndpointStats {
  endpoint: string;
  requests: number;
  avgMs: number;
  errorRate: string;
}

export interface SystemEvent {
  id: string;
  type: string;
  requestId: string | null;
  model: string | null;
  latencyMs: number | null;
  costUsd: number | null;
  createdAt: string;
}

export interface ModelPerformance {
  model: string;
  requests: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCost: string;
  errorRate: string;
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

export async function fetchPerformanceOverview(
  days: number = 7,
  signal?: AbortSignal
): Promise<PerformanceOverview> {
  return api.get<PerformanceOverview>(`/v1/analytics/performance/overview?days=${days}`, signal);
}

export async function fetchLatencyTrend(
  hours: number = 24,
  signal?: AbortSignal
): Promise<LatencyDataPoint[]> {
  const response = await api.get<{ latency: LatencyDataPoint[] }>(
    `/v1/analytics/performance/latency?hours=${hours}`,
    signal
  );
  return response.latency;
}

export async function fetchErrorBreakdown(
  days: number = 7,
  signal?: AbortSignal
): Promise<ErrorBreakdown> {
  return api.get<ErrorBreakdown>(`/v1/analytics/performance/errors?days=${days}`, signal);
}

export async function fetchTopEndpoints(
  days: number = 7,
  limit: number = 10,
  signal?: AbortSignal
): Promise<EndpointStats[]> {
  const response = await api.get<{ endpoints: EndpointStats[] }>(
    `/v1/analytics/performance/endpoints?days=${days}&limit=${limit}`,
    signal
  );
  return response.endpoints;
}

export async function fetchSystemEvents(
  limit: number = 50,
  signal?: AbortSignal
): Promise<SystemEvent[]> {
  const response = await api.get<{ events: SystemEvent[] }>(
    `/v1/analytics/performance/events?limit=${limit}`,
    signal
  );
  return response.events;
}

export async function fetchModelPerformance(
  days: number = 7,
  signal?: AbortSignal
): Promise<ModelPerformance[]> {
  const response = await api.get<{ models: ModelPerformance[] }>(
    `/v1/analytics/performance/models?days=${days}`,
    signal
  );
  return response.models;
}

