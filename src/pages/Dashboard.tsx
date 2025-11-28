/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  BookOpen,
  FileText,
  Cpu,
  Plus,
  Mic,
  ArrowRight,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APIError } from "@/services/api";
import { logger } from "@/utils/logger";
import {
  fetchLessonCount,
  fetchVocabularyCount,
  fetchAIUsageStats,
  fetchRecentActivity,
  fetchUserStats,
  formatCompactNumber,
  type RecentActivityItem,
} from "@/services/dashboardAPI";
import type { UserStats } from "@/services/analyticsAPI";
import { formatCurrency } from "@/services/analyticsAPI";
import { useAbortControllers } from "@/hooks/useAbortController";

interface StatData {
  value: number | null;
  loading: boolean;
  error: string | null;
}

interface GlobalAPIError {
  message: string;
  statusCode: number;
  timestamp: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { getSignal } = useAbortControllers();
  
  // Global API error state - shows prominent error banner
  const [apiErrors, setApiErrors] = useState<GlobalAPIError[]>([]);

  // Stats state
  const [lessonStats, setLessonStats] = useState<StatData>({
    value: null,
    loading: true,
    error: null,
  });
  const [vocabStats, setVocabStats] = useState<StatData>({
    value: null,
    loading: true,
    error: null,
  });
  const [aiStats, setAIStats] = useState<{
    requests: number | null;
    tokens: number | null;
    cost: number | null;
    loading: boolean;
    error: string | null;
  }>({
    requests: null,
    tokens: null,
    cost: null,
    loading: true,
    error: null,
  });
  const [recentActivity, setRecentActivity] = useState<{
    items: RecentActivityItem[];
    loading: boolean;
    error: string | null;
  }>({
    items: [],
    loading: true,
    error: null,
  });
  const [userStats, setUserStats] = useState<{
    data: UserStats | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  // Helper to track API errors for the error banner
  const trackError = useCallback((err: unknown, context: string) => {
    if (err instanceof APIError && !err.isAborted) {
      setApiErrors(prev => {
        // Avoid duplicates within 5 seconds
        const isDuplicate = prev.some(e => 
          e.statusCode === err.statusCode && 
          Date.now() - e.timestamp < 5000
        );
        if (isDuplicate) return prev;
        return [{
          message: `${context}: ${err.message}`,
          statusCode: err.statusCode,
          timestamp: Date.now(),
        }, ...prev.slice(0, 4)]; // Keep last 5 errors
      });
    }
  }, []);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    // Clear old errors on refresh
    setApiErrors([]);
    
    // Fetch lessons count
    setLessonStats((prev) => ({ ...prev, loading: true, error: null }));
    fetchLessonCount(getSignal('lessons'))
      .then((total) => setLessonStats({ value: total, loading: false, error: null }))
      .catch((err) => {
        if (err.isAborted) return;
        logger.error("Dashboard lesson fetch failed:", err);
        trackError(err, "Lessons");
        setLessonStats({ value: null, loading: false, error: "Failed to load" });
      });

    // Fetch vocabulary count
    setVocabStats((prev) => ({ ...prev, loading: true, error: null }));
    fetchVocabularyCount(getSignal('vocab'))
      .then((total) => setVocabStats({ value: total, loading: false, error: null }))
      .catch((err) => {
        if (err.isAborted) return;
        logger.error("Dashboard vocab fetch failed:", err);
        trackError(err, "Vocabulary");
        setVocabStats({ value: null, loading: false, error: "Failed to load" });
      });

    // Fetch AI usage stats
    setAIStats((prev) => ({ ...prev, loading: true, error: null }));
    fetchAIUsageStats(getSignal('ai'))
      .then((stats) =>
        setAIStats({
          requests: stats.totalRequests,
          tokens: stats.totalTokens,
          cost: stats.totalCost,
          loading: false,
          error: null,
        })
      )
      .catch((err) => {
        if (err.isAborted) return;
        logger.error("Dashboard AI stats fetch failed:", err);
        trackError(err, "AI Stats");
        setAIStats({
          requests: null,
          tokens: null,
          cost: null,
          loading: false,
          error: "Failed to load",
        });
      });

    // Fetch recent activity
    setRecentActivity((prev) => ({ ...prev, loading: true, error: null }));
    fetchRecentActivity(getSignal('activity'))
      .then((items) => setRecentActivity({ items, loading: false, error: null }))
      .catch((err) => {
        if (err.isAborted) return;
        logger.error("Dashboard activity fetch failed:", err);
        trackError(err, "Activity");
        setRecentActivity({ items: [], loading: false, error: "Failed to load" });
      });

    // Fetch user stats
    setUserStats((prev) => ({ ...prev, loading: true, error: null }));
    fetchUserStats(getSignal('users'))
      .then((data) => setUserStats({ data, loading: false, error: null }))
      .catch((err) => {
        if (err.isAborted) return;
        logger.error("Dashboard user stats fetch failed:", err);
        trackError(err, "Users");
        setUserStats({ data: null, loading: false, error: "Failed to load" });
      });
  }, [getSignal, trackError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-8">
      {/* API Error Banner */}
      {apiErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-800 text-sm">API Connection Issues</h3>
              <div className="mt-2 space-y-1">
                {apiErrors.map((err, i) => (
                  <p key={i} className="text-sm text-red-700">
                    {err.message}
                    {err.statusCode > 0 && (
                      <span className="ml-2 text-xs opacity-60">(Status: {err.statusCode})</span>
                    )}
                  </p>
                ))}
              </div>
              {apiErrors.some(e => e.statusCode === 401) && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Auth error - try refreshing the page or signing out/in.
                </p>
              )}
              {apiErrors.some(e => e.statusCode === 0) && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Network/CORS error - check that the backend ALLOWED_ORIGINS includes this portal's URL.
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setApiErrors([])}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 text-white border border-slate-800">
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium bg-white/10 px-3 py-1 rounded-md">
              Admin Portal
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Content Dashboard</h1>
          <p className="text-slate-300 text-base">
            Manage lessons, vocabulary, and user content
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value={userStats.data !== null ? formatCompactNumber(userStats.data.total) : null}
          loading={userStats.loading}
          error={userStats.error}
          subtitle={userStats.data ? `+${userStats.data.recentSignups.last30Days} this month` : "Registered users"}
          icon={Users}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />
        <StatCard
          title="Total Lessons"
          value={lessonStats.value !== null ? formatCompactNumber(lessonStats.value) : null}
          loading={lessonStats.loading}
          error={lessonStats.error}
          subtitle="Published lessons"
          icon={BookOpen}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Vocabulary Items"
          value={vocabStats.value !== null ? formatCompactNumber(vocabStats.value) : null}
          loading={vocabStats.loading}
          error={vocabStats.error}
          subtitle="Total words"
          icon={FileText}
          iconColor="text-slate-600"
          iconBg="bg-slate-50"
        />
        <StatCard
          title="AI Requests"
          value={aiStats.requests !== null ? formatCompactNumber(aiStats.requests) : null}
          loading={aiStats.loading}
          error={aiStats.error}
          subtitle="Last 30 days"
          icon={Cpu}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="AI Cost"
          value={aiStats.cost !== null ? formatCurrency(aiStats.cost) : null}
          loading={aiStats.loading}
          error={aiStats.error}
          subtitle="Last 30 days"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* User Tier Breakdown */}
      {userStats.data && !userStats.loading && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Users size={16} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Free Users</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCompactNumber(userStats.data.tierBreakdown.free)}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-violet-200 bg-violet-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Users size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-violet-600">Premium Users</p>
                <p className="text-xl font-bold text-violet-900">
                  {formatCompactNumber(userStats.data.tierBreakdown.premium)}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white rounded-lg border border-amber-200 bg-amber-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Users size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600">Pro Users</p>
                <p className="text-xl font-bold text-amber-900">
                  {formatCompactNumber(userStats.data.tierBreakdown.pro)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Activity */}
        <div className="lg:col-span-4 border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500">Latest content updates</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDashboardData}
              disabled={recentActivity.loading}
            >
              <RefreshCw
                size={16}
                className={recentActivity.loading ? "animate-spin" : ""}
              />
            </Button>
          </div>

          {recentActivity.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentActivity.error ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">{recentActivity.error}</p>
            </div>
          ) : recentActivity.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer border border-gray-100"
                >
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      item.type === "lesson"
                        ? "bg-blue-50 text-blue-600"
                        : item.type === "vocab"
                        ? "bg-slate-50 text-slate-600"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    {item.type === "lesson" ? (
                      <BookOpen size={18} />
                    ) : item.type === "vocab" ? (
                      <FileText size={18} />
                    ) : (
                      <Cpu size={18} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-slate-900 transition-colors text-sm">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-400 group-hover:text-gray-600 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 border border-gray-200 rounded-lg p-6 bg-white">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-500">Common tasks</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/lessons/new")}
              className="w-full group bg-slate-900 hover:bg-slate-800 text-white px-5 py-3.5 rounded-lg font-medium transition-colors flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-3">
                <Plus size={18} />
                Create New Lesson
              </span>
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
            <button
              onClick={() => navigate("/vocabulary/new")}
              className="w-full group bg-white hover:bg-gray-50 text-gray-900 px-5 py-3.5 rounded-lg font-medium transition-colors flex items-center justify-between border border-gray-300 text-sm"
            >
              <span className="flex items-center gap-3">
                <FileText size={18} />
                Add Vocabulary
              </span>
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
            <button
              onClick={() => navigate("/prompts")}
              className="w-full group bg-white hover:bg-gray-50 text-gray-900 px-5 py-3.5 rounded-lg font-medium transition-colors flex items-center justify-between border border-gray-300 text-sm"
            >
              <span className="flex items-center gap-3">
                <Mic size={18} />
                Test AI Prompt
              </span>
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>

          {/* AI Usage Summary */}
          {!aiStats.loading && !aiStats.error && aiStats.tokens !== null && (
            <div className="mt-6 p-4 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="flex items-center gap-3 mb-3">
                <Cpu size={18} className="text-indigo-600" />
                <span className="font-semibold text-indigo-900 text-sm">
                  AI Usage (30 days)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-indigo-600 text-xs">Tokens Used</p>
                  <p className="font-semibold text-indigo-900">
                    {formatCompactNumber(aiStats.tokens)}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-600 text-xs">Est. Cost</p>
                  <p className="font-semibold text-indigo-900">
                    {formatCurrency(aiStats.cost ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  error,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string | null;
  loading: boolean;
  error: string | null;
  subtitle: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 hover:border-gray-300 transition-colors">
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            <Icon size={20} className={iconColor} />
          </div>
        </div>
        <div>
          <h3 className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
            {title}
          </h3>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900">
                {value ?? "-"}
              </div>
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
